// js/character-dialog.js
// キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを
// まとめて入力するためのモーダルダイアログ。

import { CORE_DEFAULT_PARAMETERS } from './parameters/core.js';
import { pickAndUploadImage } from './image-upload.js';
import { buildCharacterParametersForPlugin, pluginHasCharacterPanel, renderCharacterPanel } from './parameters/registry.js';
import { showAudienceDialog } from './audience-picker.js';
import { showAddBuffDialog, showBuffListDialog } from './buff-dialog.js';
import { canView, isRestricted, describeAudience } from './visibility.js';
import { getCurrentParticipantId } from './local-identity.js';
import { lockFormControls } from './read-only-form.js';
import { setIcon } from './icons.js';
import { createDialogHost, appendConfirmRow } from './dialog-host.js';

// コマ画像トリミングの既定値：ズームなし・中央。既存キャラ（imageCrop無し）も
// これと同じ＝従来どおり「cover・中央」で表示されるため後方互換。
export function defaultImageCrop() {
  return { zoom: 1, posX: 50, posY: 50 };
}

// トリミング設定(crop)を<img>のCSSへ反映する。ダイアログのプレビューと盤面のコマで
// 同じ関数を使うことでWYSIWYGを保証する。object-fit:coverを基準に、object-positionで
// 表示位置、transform:scaleで拡大（原点を表示位置に合わせる）する。
export function applyImageCropStyle(imgEl, crop) {
  const zoom = crop?.zoom ?? 1;
  const posX = crop?.posX ?? 50;
  const posY = crop?.posY ?? 50;
  imgEl.style.objectFit = 'cover';
  imgEl.style.objectPosition = `${posX}% ${posY}%`;
  imgEl.style.transformOrigin = `${posX}% ${posY}%`;
  imgEl.style.transform = `scale(${zoom})`;
}

/**
 * showCharacterEditDialogのonConfirmが返す結果を、Store（部屋のstore、または
 * js/character-builder.jsが使う部屋に紐づかない使い捨てのImmutableStoreインスタンス）へ
 * 反映する。「値が実際に変わった行だけdispatchする」という規約も含めて、部屋の中で
 * キャラクター更新した時と全く同じ挙動になるようにする（二重実装によるズレを防ぐため、
 * 呼び出し側はこの関数を使い、個別にdispatchを組み立てない）。
 * @param {{state: {tokens: Record<string, any>}, dispatch: (action:string, payload:object) => void}} store
 * @param {string} tokenId
 * @param {{name:string, image:string|null, imageCrop:object|null, size:number, textColor:string|null,
 *   visible:boolean, parameterValues:Record<string,number|string>, visibilityUpdates:Record<string,boolean>,
 *   removedParamIds:string[],
 *   newCustomParameters:{key:string,label:string,value:number|string,visible:boolean}[]}} result
 */
export function applyCharacterEditResult(store, tokenId, result) {
  const {
    name, image, imageCrop, size, textColor, visible,
    parameterValues, visibilityUpdates = {}, audienceUpdates = {}, removedParamIds, newCustomParameters
  } = result;
  const latest = store.state.tokens[tokenId];
  if (!latest) return;

  if (name !== latest.name) {
    store.dispatch('RENAME_CHARACTER', { id: tokenId, name });
  }

  if (image !== (latest.image || null)) {
    store.dispatch('SET_CHARACTER_IMAGE', { id: tokenId, image });
  }

  // トリミング設定の変更を反映（値が実際に変わったときだけ同期する）
  const nextCrop = image ? (imageCrop || defaultImageCrop()) : null;
  if (JSON.stringify(nextCrop) !== JSON.stringify(latest.imageCrop ?? null)) {
    store.dispatch('SET_CHARACTER_IMAGE_CROP', { id: tokenId, crop: nextCrop });
  }

  if (size !== (latest.size || 1)) {
    store.dispatch('SET_CHARACTER_SIZE', { id: tokenId, size });
  }

  if (textColor !== (latest.textColor || null)) {
    store.dispatch('SET_CHARACTER_TEXT_COLOR', { id: tokenId, textColor });
  }

  if (visible !== (latest.visible !== false)) {
    store.dispatch('SET_CHARACTER_VISIBLE', { id: tokenId, visible });
  }

  Object.entries(parameterValues).forEach(([paramId, value]) => {
    const existingParam = latest.parameters[paramId];
    if (existingParam && existingParam.value !== value) {
      store.dispatch('SET_PARAMETER', { characterId: tokenId, paramId, value });
    }
  });

  // キャラ一覧に出すかどうか（値とは独立して切り替えられる）
  Object.entries(visibilityUpdates).forEach(([paramId, paramVisible]) => {
    const existingParam = latest.parameters[paramId];
    if (existingParam && (existingParam.visible !== false) !== paramVisible) {
      store.dispatch('SET_PARAMETER_VISIBILITY', { characterId: tokenId, paramId, visible: paramVisible });
    }
  });

  // 誰に見せるか（値・一覧への表示とは独立して切り替えられる）
  Object.entries(audienceUpdates).forEach(([paramId, audience]) => {
    const existingParam = latest.parameters[paramId];
    if (!existingParam) return;
    const currentAudience = existingParam.audience ?? null;
    if (JSON.stringify(currentAudience) !== JSON.stringify(audience)) {
      store.dispatch('SET_PARAMETER_AUDIENCE', { characterId: tokenId, paramId, audience });
    }
  });

  removedParamIds.forEach(paramId => {
    store.dispatch('REMOVE_PARAMETER', { characterId: tokenId, paramId });
  });

  newCustomParameters.forEach(({ key, label, value, visible: paramVisible, audience: paramAudience }) => {
    store.dispatch('ADD_PARAMETER', { characterId: tokenId, key, label, value, visible: paramVisible, audience: paramAudience });
  });
}

// プラグイン専用スペースを組み立てる。プラグインが専用UI(renderCharacterPanel)を
// 持っていればそれを描画し、持っていなければ「プラグイン未選択」等のプレースホルダを出す。
// getValues()は、プラグインが専用UIを描画した場合のみ値を返す関数を持つ。
function buildPluginPanel({
  activePluginId, mode, canEdit = true, parameters, components, onComponentChange, getComponents,
  dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice,
  tokenId, allowParameterEdit = false, participants = {}, myParticipantId = null
}) {
  const column = document.createElement('div');
  column.className = 'dialog-plugin-column';

  let panel = null;
  if (activePluginId && pluginHasCharacterPanel(activePluginId)) {
    // canEditがfalseの時に何を止めるかはプラグインに委ねる（ボックスを開くボタンは
    // 押せたままにしたいので、Core側でこの列をまとめて無効化はしない）
    panel = renderCharacterPanel(activePluginId, {
      container: column, mode, canEdit, parameters, components, onComponentChange, getComponents,
      dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId,
      allowParameterEdit,
      // 他のコマを名前で引く口（シノビガミの感情修正）。部屋の外（コマ作成ツール）からは
      // 渡ってこないので、使う側で「部屋の中で実行してください」と断ること。
      findTokenByName,
      // 公開先(audience)を持つデータを扱うプラグイン（シノビガミの奥義）のために渡す。
      // プラグイン側からgame-store.jsは読めない（循環import）ので、参加者一覧と自分のIDは
      // Coreから渡すしかない。
      participants, myParticipantId
    });
  } else {
    const placeholder = document.createElement('p');
    placeholder.className = 'dialog-plugin-placeholder';
    placeholder.textContent = activePluginId
      ? 'このプラグインには専用表示がありません。'
      : 'プラグイン未選択です。';
    column.appendChild(placeholder);
  }

  return {
    element: column,
    getValues: () => panel?.getValues() ?? {}
  };
}

// キャラクター画像の選択UI（正方形クロッパー＋選択/削除ボタン）を組み立てる。
// クロッパー内で画像をドラッグして表示位置を、スライダー/ホイールでズームを調整でき、
// その結果を非破壊のトリミング設定(crop)として返す。作成/更新どちらのダイアログからも使う。
// readOnly: 表示だけの時。ボタン・スライダーはlockFormControlsで止まるが、枠へのドラッグと
// ホイールはdisabledの対象外なので、リスナー自体を張らないことで止める。
function buildImagePicker(initialImage, initialCrop, { readOnly = false } = {}) {
  let currentImage = initialImage || null;
  const crop = { ...defaultImageCrop(), ...(initialCrop || {}) };

  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.textContent = '画像（ドラッグで位置調整・ズームで拡大）';
  group.appendChild(label);

  // 正方形クロッパー（コマは常にN×Nの正方形なので枠も正方形）
  const cropper = document.createElement('div');
  cropper.className = 'image-cropper';

  const img = document.createElement('img');
  img.className = 'image-cropper-img';
  img.alt = '';
  cropper.appendChild(img);
  group.appendChild(cropper);

  // ズーム操作
  const zoomRow = document.createElement('div');
  zoomRow.className = 'image-crop-zoom-row';
  const zoomLabel = document.createElement('span');
  zoomLabel.textContent = 'ズーム';
  const zoomInput = document.createElement('input');
  zoomInput.type = 'range';
  zoomInput.min = '1';
  zoomInput.max = '3';
  zoomInput.step = '0.02';
  zoomInput.value = String(crop.zoom);
  zoomRow.appendChild(zoomLabel);
  zoomRow.appendChild(zoomInput);
  group.appendChild(zoomRow);

  const applyCrop = () => applyImageCropStyle(img, crop);

  function updateVisibility() {
    const has = !!currentImage;
    cropper.style.display = has ? '' : 'none';
    zoomRow.style.display = has ? '' : 'none';
    if (has) {
      img.src = currentImage;
      zoomInput.value = String(crop.zoom);
      applyCrop();
    } else {
      img.removeAttribute('src');
    }
  }

  // ドラッグで表示位置(posX/posY)を調整。枠幅いっぱいのドラッグで0〜100%を移動する。
  if (!readOnly) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    cropper.addEventListener('pointerdown', (e) => {
      if (!currentImage) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      cropper.setPointerCapture(e.pointerId);
    });
    cropper.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = cropper.getBoundingClientRect();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      // 画像を右へドラッグ＝左側を見せる＝object-positionを0%側へ。よって符号は減算。
      crop.posX = Math.min(100, Math.max(0, crop.posX - (dx / rect.width) * 100));
      crop.posY = Math.min(100, Math.max(0, crop.posY - (dy / rect.height) * 100));
      applyCrop();
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { cropper.releasePointerCapture(e.pointerId); } catch { /* 解放済みは無視 */ }
    };
    cropper.addEventListener('pointerup', endDrag);
    cropper.addEventListener('pointercancel', endDrag);

    // ホイールでもズームできるようにする（スライダーと同期）
    cropper.addEventListener('wheel', (e) => {
      if (!currentImage) return;
      e.preventDefault();
      const next = Math.min(3, Math.max(1, crop.zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
      crop.zoom = Math.round(next * 100) / 100;
      zoomInput.value = String(crop.zoom);
      applyCrop();
    }, { passive: false });

    zoomInput.addEventListener('input', () => {
      crop.zoom = Number(zoomInput.value) || 1;
      applyCrop();
    });
  }

  // 選択/削除ボタン
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-custom-row';

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.style.marginBottom = '0';
  pickBtn.addEventListener('click', async () => {
    // R2へ上げてURLだけを状態に持つ（立ち絵をデータURLで持つと、その部屋のデータが
    // 画像ぶん重くなり、操作のたびに丸ごと保存し直される。js/image-upload.js参照）
    const picked = await pickAndUploadImage({ purpose: 'token' });
    if (!picked) return;
    currentImage = picked.url;
    Object.assign(crop, defaultImageCrop()); // 新しい画像は中央・等倍から始める
    updateVisibility();
  });
  btnRow.appendChild(pickBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '画像を削除';
  clearBtn.className = 'dialog-remove-row';
  clearBtn.addEventListener('click', () => {
    currentImage = null;
    Object.assign(crop, defaultImageCrop());
    updateVisibility();
  });
  btnRow.appendChild(clearBtn);

  group.appendChild(btnRow);

  updateVisibility();

  return {
    element: group,
    getImage: () => currentImage,
    getCrop: () => (currentImage ? { ...crop } : null)
  };
}

// コマの大きさ（マス数、N×Nとして扱う）の入力UI。作成/更新どちらのダイアログからも使う。
function buildSizeInput(initialSize) {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.textContent = 'サイズ（マス、N×N）';
  group.appendChild(label);

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.step = '1';
  input.value = initialSize || 1;
  group.appendChild(input);

  return { element: group, getSize: () => Math.max(1, Math.round(Number(input.value) || 1)) };
}

// チャット欄でのキャラ名・発言テキストの色。作成/更新どちらのダイアログからも使う。
function buildTextColorInput(initialColor) {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.textContent = '文字色（キャラ一覧の名前・チャットのキャラ名/発言に反映）';
  group.appendChild(label);

  const input = document.createElement('input');
  input.type = 'color';
  input.value = initialColor || '#ffffff';
  group.appendChild(input);

  return { element: group, getColor: () => input.value };
}

// キャラクター一覧への表示/非表示（falseでも盤面上のコマ自体は表示されたまま）。
// 作成/更新どちらのダイアログからも使う。
function buildVisibleCheckbox(initialVisible) {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '6px';
  label.style.cursor = 'pointer';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = initialVisible !== false;

  label.appendChild(input);
  label.appendChild(document.createTextNode('キャラクター一覧に表示する'));
  group.appendChild(label);

  return { element: group, getVisible: () => input.checked };
}

// パラメータ1件をキャラクター一覧に出すか（param.visible）の切り替え。上のbuildVisibleCheckboxが
// 「コマそのものを一覧に出すか」なのに対し、こちらは「そのコマのパラメータ1件を出すか」。
// HP・カスタムパラメータの行から使う（下のcanToggleParameterVisibility参照）。
function buildParameterVisibilityToggle(initialChecked = true) {
  const label = document.createElement('label');
  label.className = 'dialog-visible-toggle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = initialChecked !== false;

  label.appendChild(checkbox);
  label.appendChild(document.createTextNode('表示'));

  return { element: label, checkbox };
}

// パラメータ1件の「公開先」ボタン（開いた錠＝全員／閉じた錠＝限定）。押すと宛先選択ダイアログを開く。
// 表示/非表示(visible)が「自分も含めて一覧に出すか」なのに対し、こちらは「誰に見せるか」。
// 値の保持は呼び出し側（getAudience/setAudience）に任せ、確定時にまとめて反映する。
function buildAudienceButton({ getLabel, getAudience, setAudience, participants, myParticipantId }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dialog-audience-btn';

  function sync() {
    const audience = getAudience();
    setIcon(button, isRestricted(audience) ? 'lock' : 'unlock',
      isRestricted(audience) ? '限定公開' : '全員に公開');
    button.title = `${describeAudience(audience, participants)}（クリックで変更）`;
    button.classList.toggle('restricted', isRestricted(audience));
  }

  button.addEventListener('click', () => {
    showAudienceDialog({
      title: `「${getLabel()}」の公開先`,
      description: 'このパラメータを誰に見せるかを選びます。キャラクター一覧と更新画面の表示に反映されます。',
      audience: getAudience(),
      participants,
      myParticipantId,
      onConfirm: (audience) => {
        setAudience(audience);
        sync();
      }
    });
  });

  sync();
  return button;
}

// 表示/非表示をユーザーが選べるのは、HP（core、locked以外）とカスタムパラメータだけ。
// イニシアチブ（locked:true）はキャラ一覧に専用のバッジで出しているため対象外、
// プラグイン由来のパラメータはプラグイン側の表示方針に任せるため対象外。
function canToggleParameterVisibility(param) {
  return (param.source === 'core' || param.source === 'user') && !param.locked;
}

// カスタムパラメータ（ユーザーが自由に名前を付けて追加する変数）の入力値を、
// 数値として解釈できればNumberに、できなければ文字列のまま返す。空欄は0扱い（旧来の
// Number(x)||0と同じ挙動）。HP等の組み込み・プラグイン由来パラメータは対象外（常に数値）。
function parseCustomParameterValue(raw) {
  const trimmed = String(raw).trim();
  if (trimmed === '') return 0;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : trimmed;
}

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   activePluginId?: string | null,
 *   onConfirm: (result: { name: string, image: string | null, imageCrop: {zoom:number,posX:number,posY:number} | null, size: number, textColor: string, visible: boolean, parameterOverrides: Record<string, number>, parameterVisibility: Record<string, boolean>, customParameters: {key:string,label:string,value:number|string,visible:boolean}[] }) => void
 * }} options
 */
export function showCharacterDialog({ activePluginId = null, participants = {}, onConfirm }) {
  const myParticipantId = getCurrentParticipantId();
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'キャラクターを登録';
  form.appendChild(title);

  // --- 本体（左）＋ プラグイン専用スペース（右） ---
  const columns = document.createElement('div');
  columns.className = 'dialog-columns';
  form.appendChild(columns);

  const mainColumn = document.createElement('div');
  mainColumn.className = 'dialog-main-column';
  columns.appendChild(mainColumn);

  // --- 名前 ---
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dialog-form-group';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'キャラクター名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  mainColumn.appendChild(nameGroup);

  // --- 画像 ---
  const imagePicker = buildImagePicker(null, null);
  mainColumn.appendChild(imagePicker.element);

  // --- サイズ ---
  const sizeInput = buildSizeInput(1);
  mainColumn.appendChild(sizeInput.element);

  // --- 文字色 ---
  const textColorInput = buildTextColorInput(null);
  mainColumn.appendChild(textColorInput.element);

  // --- キャラクター一覧への表示 ---
  const visibleCheckbox = buildVisibleCheckbox(true);
  mainColumn.appendChild(visibleCheckbox.element);

  // --- デフォルトパラメータ（Core層） ---
  // 「ラベル・値・表示・公開先」を1行に横並びにする（カスタムパラメータの行や、
  // 更新ダイアログのパラメータ一覧と同じ形。縦積みのdialog-form-groupに入れると
  // トグルと鍵アイコンが横幅いっぱいに広がってしまう）。
  const paramListLabel = document.createElement('label');
  paramListLabel.textContent = 'パラメータ';
  paramListLabel.style.display = 'block';
  paramListLabel.style.marginTop = '4px';
  mainColumn.appendChild(paramListLabel);

  const defaultListEl = document.createElement('div');
  defaultListEl.className = 'dialog-custom-list';
  mainColumn.appendChild(defaultListEl);

  const defaultInputs = {};
  const defaultVisibleToggles = {}; // key -> checkbox（表示切り替えの対象になるものだけ）
  const defaultAudiences = {};      // key -> string[]|null（公開先。既定は全員＝null）
  CORE_DEFAULT_PARAMETERS.forEach(def => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    label.textContent = def.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = def.value;

    row.appendChild(label);
    row.appendChild(input);

    if (canToggleParameterVisibility({ source: 'core', locked: def.locked })) {
      const toggle = buildParameterVisibilityToggle(def.visible !== false);
      row.appendChild(toggle.element);
      defaultVisibleToggles[def.key] = toggle.checkbox;

      defaultAudiences[def.key] = null;
      row.appendChild(buildAudienceButton({
        getLabel: () => def.label,
        getAudience: () => defaultAudiences[def.key],
        setAudience: (audience) => { defaultAudiences[def.key] = audience; },
        participants,
        myParticipantId
      }));
    }

    defaultListEl.appendChild(row);
    defaultInputs[def.key] = input;
  });

  // --- カスタムパラメータ（User層） ---
  const customListEl = document.createElement('div');
  customListEl.className = 'dialog-custom-list';
  mainColumn.appendChild(customListEl);

  const customRows = [];

  function addCustomRow() {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'パラメータ名（例: 正気度）';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = '0';

    // 新規カスタムパラメータは常にsource:'user'になるため、表示切り替えは必ず付く
    const visibility = buildParameterVisibilityToggle(true);

    // 公開先はこの行の状態として持ち、確定時にまとめて渡す（既定は全員＝null）
    const rowAudience = { value: null };
    const audienceBtn = buildAudienceButton({
      getLabel: () => labelInput.value.trim() || 'このパラメータ',
      getAudience: () => rowAudience.value,
      setAudience: (audience) => { rowAudience.value = audience; },
      participants,
      myParticipantId
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      row.remove();
      const idx = customRows.findIndex(r => r.rowEl === row);
      if (idx !== -1) customRows.splice(idx, 1);
    });

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(visibility.element);
    row.appendChild(audienceBtn);
    row.appendChild(removeBtn);
    customListEl.appendChild(row);

    customRows.push({
      labelInput, valueInput, visibleCheckbox: visibility.checkbox,
      getAudience: () => rowAudience.value, rowEl: row
    });
  }

  const addCustomBtn = document.createElement('button');
  addCustomBtn.type = 'button';
  addCustomBtn.textContent = '+ カスタムパラメータを追加';
  addCustomBtn.className = 'dialog-add-row-btn';
  addCustomBtn.addEventListener('click', addCustomRow);
  mainColumn.appendChild(addCustomBtn);

  // --- プラグイン専用スペース（右） ---
  const pluginPanel = buildPluginPanel({
    activePluginId,
    mode: 'create',
    parameters: activePluginId ? buildCharacterParametersForPlugin(activePluginId) : {}
  });
  columns.appendChild(pluginPanel.element);

  // --- ボタン行 ---
  const { row: btnRow, cancelBtn, confirmBtn } = appendConfirmRow(form, {
    confirmLabel: '登録',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // ページ遷移させない
    const name = nameInput.value.trim();
    if (name === '') {
      nameInput.focus();
      return;
    }

    const parameterOverrides = {};
    CORE_DEFAULT_PARAMETERS.forEach(def => {
      const paramId = `core:${def.key}`;
      const raw = defaultInputs[def.key].value;
      parameterOverrides[paramId] = raw === '' ? def.value : Number(raw);
    });
    Object.assign(parameterOverrides, pluginPanel.getValues());

    // 値の上書き（parameterOverrides）とは別に、キャラ一覧へ出すかどうかだけを渡す
    const parameterVisibility = {};
    Object.entries(defaultVisibleToggles).forEach(([key, checkbox]) => {
      parameterVisibility[`core:${key}`] = checkbox.checked;
    });

    // 公開先を指定したものだけ渡す（未指定＝全員に見せるは既定なので送らない）
    const parameterAudience = {};
    Object.entries(defaultAudiences).forEach(([key, audience]) => {
      if (audience) parameterAudience[`core:${key}`] = audience;
    });

    const customParameters = customRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: parseCustomParameterValue(row.valueInput.value),
        visible: row.visibleCheckbox.checked,
        audience: row.getAudience()
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({ name, image: imagePicker.getImage(), imageCrop: imagePicker.getCrop(), size: sizeInput.getSize(), textColor: textColorInput.getColor(), visible: visibleCheckbox.getVisible(), parameterOverrides, parameterVisibility, parameterAudience, customParameters });
  });

  dialog.appendChild(form);
  dialog.showModal(); // ネイティブのモーダル表示（背景クリック無効・Escで閉じる、が標準で付いてくる）
  nameInput.focus();
}

let editDialogEl = null;

function ensureEditDialog() {
  if (editDialogEl) return editDialogEl;
  editDialogEl = document.createElement('dialog');
  editDialogEl.className = 'character-dialog';
  document.body.appendChild(editDialogEl);
  return editDialogEl;
}

/**
 * 既存キャラクターの名前・パラメータ値を更新するためのダイアログ。
 * 「編集不可(editable:false)」なパラメータは表示のみ、
 * 「削除不可(locked:true)」なパラメータは削除ボタンを出さない。
 * HP・カスタムパラメータの行には「表示」チェックボックスが付き、
 * キャラクター一覧に出すかどうか(param.visible)を値とは独立して切り替えられる。
 *
 * canEdit:false で開くと、同じ画面のまま編集操作だけが封じられる（他人のコマを表示だけ
 * したい時。判定は「変更」側なのでプラグインのボックスからも外す）。
 * 公開先(audience)で自分に見せていないパラメータは、canEditに関わらず行ごと出さない。
 *
 * @param {{
 *   character: { name: string, image?: string | null, imageCrop?: {zoom:number,posX:number,posY:number} | null, size?: number, textColor?: string | null, visible?: boolean, parameters: Record<string, {key:string,label:string,value:number|string,locked?:boolean,editable?:boolean,visible?:boolean,source?:string}>, components?: Record<string, any> },
 *   activePluginId?: string | null,
 *   onComponentChange?: (componentKey: string, value: any) => void,
 *   getComponents?: () => Record<string, any>,
 *   onConfirm: (result: {
 *     name: string,
 *     image: string | null,
 *     imageCrop: {zoom:number,posX:number,posY:number} | null,
 *     size: number,
 *     textColor: string,
 *     visible: boolean,
 *     parameterValues: Record<string, number|string>,
 *     visibilityUpdates: Record<string, boolean>,
 *     removedParamIds: string[],
 *     newCustomParameters: {key:string,label:string,value:number|string,visible:boolean}[]
 *   }) => void,
 *   canEdit?: boolean,
 *   readOnlyReason?: string | null 表示だけになっている理由（見出しの下に1行出す）,
 *   allowParameterEdit?: boolean プラグインが持つeditable:falseのパラメータ（DX3の能力値・技能値等）を
 *     プラグイン側のUIから編集させてよいか。部屋の外のコマ作成ツール専用の許可で、既定はfalse。
 *     Coreは意味を解釈せず、プラグインへそのまま渡すだけ。
 * }} options
 */
export function showCharacterEditDialog({
  character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm,
  dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice,
  tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false
}) {
  const myParticipantId = getCurrentParticipantId();
  const dialog = ensureEditDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  // 持ち主・GM以外も同じ画面を開ける。中身は同じで、編集操作だけを封じる（canEdit）
  title.textContent = canEdit ? 'キャラクターを更新' : 'キャラクターを表示';
  form.appendChild(title);

  if (!canEdit && readOnlyReason) {
    const note = document.createElement('p');
    note.className = 'dialog-plugin-placeholder';
    note.textContent = readOnlyReason;
    form.appendChild(note);
  }

  // --- 本体（左）＋ プラグイン専用スペース（右） ---
  const columns = document.createElement('div');
  columns.className = 'dialog-columns';
  form.appendChild(columns);

  const mainColumn = document.createElement('div');
  mainColumn.className = 'dialog-main-column';
  columns.appendChild(mainColumn);

  // --- 名前 ---
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dialog-form-group';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'キャラクター名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.value = character.name;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  mainColumn.appendChild(nameGroup);

  // --- 画像 ---
  const imagePicker = buildImagePicker(character.image, character.imageCrop, { readOnly: !canEdit });
  mainColumn.appendChild(imagePicker.element);

  // --- サイズ ---
  const sizeInput = buildSizeInput(character.size || 1);
  mainColumn.appendChild(sizeInput.element);

  // --- 文字色 ---
  const textColorInput = buildTextColorInput(character.textColor);
  mainColumn.appendChild(textColorInput.element);

  // --- キャラクター一覧への表示 ---
  const visibleCheckbox = buildVisibleCheckbox(character.visible);
  mainColumn.appendChild(visibleCheckbox.element);

  // --- 既存パラメータ一覧（値の変更・削除） ---
  const paramListLabel = document.createElement('label');
  paramListLabel.textContent = 'パラメータ';
  paramListLabel.style.display = 'block';
  paramListLabel.style.marginTop = '4px';
  mainColumn.appendChild(paramListLabel);

  const paramListEl = document.createElement('div');
  paramListEl.className = 'dialog-custom-list';
  mainColumn.appendChild(paramListEl);

  const existingRows = []; // { paramId, valueInput, editable, isCustom, visibleCheckbox, initialVisible }
  const removedParamIds = new Set();

  // プラグインが専用スペースを持つ場合、そのプラグイン由来のパラメータは
  // 右側のプラグイン専用スペースだけに表示し、こちらの汎用一覧には出さない（二重表示防止）
  const pluginOwnsDisplay = !!activePluginId && pluginHasCharacterPanel(activePluginId);

  Object.entries(character.parameters).forEach(([paramId, param]) => {
    if (pluginOwnsDisplay && param.source === activePluginId) return;
    // editable:falseの拡張ステータス（自動計算値・JSON同期専用の値等）は
    // 手入力での編集対象ではないため、更新ダイアログには表示しない
    if (param.editable === false) return;
    // 自分に公開されていないパラメータは編集対象にも出さない（行が無ければ、
    // 見えない値を空で上書きするような更新も起きない）
    if (!canView(param.audience, myParticipantId)) return;

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.textContent = param.label;
    label.className = 'dialog-param-label';
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';

    // カスタム変数（source:'user'）のみ文字列値を受け付ける。HP等の組み込み・
    // プラグイン由来パラメータはバフ加算・ダイス計算の前提上、数値のまま。
    const isCustom = param.source === 'user';

    const valueInput = document.createElement('input');
    valueInput.type = isCustom ? 'text' : 'number';
    valueInput.value = param.value;
    if (param.editable === false) {
      valueInput.disabled = true;
    }

    row.appendChild(label);
    row.appendChild(valueInput);

    // キャラ一覧に出すかの切り替えと、誰に見せるかの指定（HP・カスタムパラメータのみ）
    const initialVisible = param.visible !== false;
    const canToggle = canToggleParameterVisibility(param);
    const visibility = canToggle ? buildParameterVisibilityToggle(initialVisible) : null;
    if (visibility) row.appendChild(visibility.element);

    const initialAudience = param.audience ?? null;
    const rowAudience = { value: initialAudience };
    if (canToggle) {
      row.appendChild(buildAudienceButton({
        getLabel: () => param.label,
        getAudience: () => rowAudience.value,
        setAudience: (audience) => { rowAudience.value = audience; },
        participants,
        myParticipantId
      }));
    }

    // 削除ボタンは常に配置し、locked時は非表示にするだけにする（数値入力・削除の
    // 縦位置を全行で揃えるため。無いと行ごとに列の位置がずれてしまう）
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    if (param.locked) {
      removeBtn.style.visibility = 'hidden';
      removeBtn.disabled = true;
    } else {
      removeBtn.addEventListener('click', () => {
        row.remove();
        removedParamIds.add(paramId);
        const idx = existingRows.findIndex(r => r.paramId === paramId);
        if (idx !== -1) existingRows.splice(idx, 1);
      });
    }
    row.appendChild(removeBtn);

    paramListEl.appendChild(row);
    existingRows.push({
      paramId, valueInput, editable: param.editable !== false, isCustom,
      visibleCheckbox: visibility?.checkbox ?? null, initialVisible,
      hasAudienceControl: canToggle, getAudience: () => rowAudience.value
    });
  });

  // --- 新規カスタムパラメータの追加 ---
  const customListEl = document.createElement('div');
  customListEl.className = 'dialog-custom-list';
  mainColumn.appendChild(customListEl);

  const customRows = [];

  function addCustomRow() {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'パラメータ名（例: 正気度）';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = '0';

    // 新規カスタムパラメータは常にsource:'user'になるため、表示切り替えは必ず付く
    const visibility = buildParameterVisibilityToggle(true);

    // 公開先はこの行の状態として持ち、確定時にまとめて渡す（既定は全員＝null）
    const rowAudience = { value: null };
    const audienceBtn = buildAudienceButton({
      getLabel: () => labelInput.value.trim() || 'このパラメータ',
      getAudience: () => rowAudience.value,
      setAudience: (audience) => { rowAudience.value = audience; },
      participants,
      myParticipantId
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      row.remove();
      const idx = customRows.findIndex(r => r.rowEl === row);
      if (idx !== -1) customRows.splice(idx, 1);
    });

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(visibility.element);
    row.appendChild(audienceBtn);
    row.appendChild(removeBtn);
    customListEl.appendChild(row);

    customRows.push({
      labelInput, valueInput, visibleCheckbox: visibility.checkbox,
      getAudience: () => rowAudience.value, rowEl: row
    });
  }

  const addCustomBtn = document.createElement('button');
  addCustomBtn.type = 'button';
  addCustomBtn.textContent = '+ カスタムパラメータを追加';
  addCustomBtn.className = 'dialog-add-row-btn';
  addCustomBtn.addEventListener('click', addCustomRow);
  mainColumn.appendChild(addCustomBtn);

  // --- バフ/デバフ ---
  // 盤面の右クリックメニューと同じダイアログをここからも開けるようにする。装備の効果のように
  // 「持っているだけで永続的にかかる」修正値（終了条件＝手動のみ）をコマの編集中に設定できる
  // ようにするため。部屋の外（コマ作成ツール）には右クリックメニューが無いので、
  // そちらではバフを扱う唯一の入口でもある。
  // 付与・削除はこのダイアログの「更新」を待たず即座にdispatchされる（エフェクト/コンボ一覧と同じ）。
  // 表示だけの人（canEdit:false）には一覧だけを残す：今かかっている修正値は見えてよいが、
  // 付与・削除はできない。
  let addBuffBtn = null;
  let listBuffBtn = null;
  if (dispatch && tokenId && getToken) {
    const buffRow = document.createElement('div');
    buffRow.className = 'dialog-buff-row';

    addBuffBtn = document.createElement('button');
    addBuffBtn.type = 'button';
    addBuffBtn.className = 'dialog-add-row-btn';
    addBuffBtn.textContent = '+ バフ/デバフを付与';

    listBuffBtn = document.createElement('button');
    listBuffBtn.type = 'button';
    listBuffBtn.className = 'dialog-add-row-btn';

    const updateBuffBtnLabel = () => {
      listBuffBtn.textContent = `バフ/デバフ一覧（${getToken()?.buffs?.length ?? 0}件）`;
    };
    updateBuffBtnLabel();

    addBuffBtn.addEventListener('click', () => {
      showAddBuffDialog({
        // 開いた時点のスナップショットではなく都度最新を読む（エフェクト一覧と同じ理由）
        parameters: getToken()?.parameters ?? character.parameters,
        activePluginId,
        onConfirm: ({ name, paramId, delta, expirePhase, meta }) => {
          dispatch('ADD_BUFF', {
            tokenId, id: generateBuffId(), name, paramId, delta, expirePhase, meta
          });
          updateBuffBtnLabel();
        }
      });
    });

    listBuffBtn.addEventListener('click', () => {
      showBuffListDialog({
        getBuffs: () => getToken()?.buffs ?? [],
        getParameters: () => getToken()?.parameters ?? {},
        activePluginId,
        // onRemoveを渡さないと削除ボタンが出ない＝表示専用の一覧になる
        onRemove: canEdit ? (buffId) => {
          dispatch('REMOVE_BUFF', { tokenId, id: buffId });
          updateBuffBtnLabel();
        } : undefined
      });
    });

    buffRow.appendChild(addBuffBtn);
    buffRow.appendChild(listBuffBtn);
    mainColumn.appendChild(buffRow);
  }

  // --- プラグイン専用スペース（右） ---
  const pluginPanel = buildPluginPanel({
    activePluginId,
    mode: 'edit',
    canEdit,
    parameters: character.parameters,
    components: character.components,
    onComponentChange,
    getComponents,
    dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice,
    tokenId,
    allowParameterEdit,
    participants, myParticipantId
  });
  columns.appendChild(pluginPanel.element);

  // --- ボタン行 ---
  const { row: btnRow, cancelBtn, confirmBtn } = appendConfirmRow(form, {
    confirmLabel: '更新',
    onCancel: () => dialog.close()
  });

  // 表示だけの人は、追加・付与・更新を消したうえで残りの入力を一括で無効化する。
  // 生成箇所ごとに分岐を撒くより、組み立て終わりに一度通すほうが封じ忘れが起きない。
  // プラグイン専用スペース（右カラム）はプラグイン自身が同じことをする（buildPluginPanel参照）。
  if (!canEdit) {
    addCustomBtn.style.display = 'none';
    if (addBuffBtn) addBuffBtn.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.textContent = '閉じる';
    lockFormControls(mainColumn, { keep: [listBuffBtn] });
    lockFormControls(btnRow, { keep: [cancelBtn] });
  }

  // 更新ボタンを消すだけだと、入力欄が1つだけの時にEnterでsubmitし得る。登録自体を止める。
  if (canEdit) form.addEventListener('submit', (event) => {
    event.preventDefault(); // ページ遷移させない
    const name = nameInput.value.trim();
    if (name === '') {
      nameInput.focus();
      return;
    }

    const parameterValues = {};
    const visibilityUpdates = {};
    const audienceUpdates = {};
    existingRows.forEach(({
      paramId, valueInput, editable, isCustom,
      visibleCheckbox: paramVisibleCheckbox, hasAudienceControl, getAudience
    }) => {
      if (editable) {
        parameterValues[paramId] = isCustom ? parseCustomParameterValue(valueInput.value) : (Number(valueInput.value) || 0);
      }
      if (paramVisibleCheckbox) {
        visibilityUpdates[paramId] = paramVisibleCheckbox.checked;
      }
      if (hasAudienceControl) {
        audienceUpdates[paramId] = getAudience();
      }
    });
    Object.assign(parameterValues, pluginPanel.getValues());

    const newCustomParameters = customRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: parseCustomParameterValue(row.valueInput.value),
        visible: row.visibleCheckbox.checked,
        audience: row.getAudience()
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({
      name,
      image: imagePicker.getImage(),
      imageCrop: imagePicker.getCrop(),
      size: sizeInput.getSize(),
      textColor: textColorInput.getColor(),
      visible: visibleCheckbox.getVisible(),
      parameterValues,
      visibilityUpdates,
      audienceUpdates,
      removedParamIds: Array.from(removedParamIds),
      newCustomParameters
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();
}