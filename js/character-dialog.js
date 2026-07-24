// js/character-dialog.js
// キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを
// まとめて入力するためのモーダルダイアログ。

import { CORE_DEFAULT_PARAMETERS } from './parameters/core.js';
import { pickFileAsDataUrl } from './file-uploader.js';
import { buildCharacterParametersForPlugin, pluginHasCharacterPanel, renderCharacterPanel } from './parameters/registry.js';

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

// プラグイン専用スペースを組み立てる。プラグインが専用UI(renderCharacterPanel)を
// 持っていればそれを描画し、持っていなければ「プラグイン未選択」等のプレースホルダを出す。
// getValues()は、プラグインが専用UIを描画した場合のみ値を返す関数を持つ。
function buildPluginPanel({ activePluginId, mode, parameters, components, onComponentChange, getComponents }) {
  const column = document.createElement('div');
  column.className = 'dialog-plugin-column';

  let panel = null;
  if (activePluginId && pluginHasCharacterPanel(activePluginId)) {
    panel = renderCharacterPanel(activePluginId, { container: column, mode, parameters, components, onComponentChange, getComponents });
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
function buildImagePicker(initialImage, initialCrop) {
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

  // 選択/削除ボタン
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-custom-row';

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.style.marginBottom = '0';
  pickBtn.addEventListener('click', async () => {
    const picked = await pickFileAsDataUrl({ accept: 'image/*' });
    if (!picked) return;
    currentImage = picked.dataUrl;
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

// 「表示」チェックボックス（visible切り替え用）を生成する共通処理。
// 既存パラメータ行・新規カスタムパラメータ行のどちらからも使う。
function buildVisibilityCheckbox(initialChecked = true) {
  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '4px';
  label.style.color = '#aaa';
  label.style.fontSize = '0.8rem';
  label.style.flexShrink = '0';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = initialChecked;

  label.appendChild(checkbox);
  label.appendChild(document.createTextNode('表示'));

  return { element: label, checkbox };
}

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{
 *   activePluginId?: string | null,
 *   onConfirm: (result: { name: string, image: string | null, imageCrop: {zoom:number,posX:number,posY:number} | null, size: number, parameterOverrides: Record<string, number>, customParameters: {key:string,label:string,value:number,visible:boolean}[] }) => void
 * }} options
 */
export function showCharacterDialog({ activePluginId = null, onConfirm }) {
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

  // --- デフォルトパラメータ（Core層） ---
  const defaultInputs = {};
  CORE_DEFAULT_PARAMETERS.forEach(def => {
    const group = document.createElement('div');
    group.className = 'dialog-form-group';
    const label = document.createElement('label');
    label.textContent = def.label;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = def.value;
    group.appendChild(label);
    group.appendChild(input);
    mainColumn.appendChild(group);
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
    valueInput.type = 'number';
    valueInput.value = 0;

    const visibility = buildVisibilityCheckbox(true);

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
    row.appendChild(removeBtn);
    customListEl.appendChild(row);

    customRows.push({ labelInput, valueInput, visibleCheckbox: visibility.checkbox, rowEl: row });
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
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '登録';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

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

    const customParameters = customRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: Number(row.valueInput.value) || 0,
        visible: row.visibleCheckbox.checked
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({ name, image: imagePicker.getImage(), imageCrop: imagePicker.getCrop(), size: sizeInput.getSize(), parameterOverrides, customParameters });
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
 * 「表示」チェックボックスでキャラ一覧への表示/非表示(visible)を切り替えられる。
 *
 * @param {{
 *   character: { name: string, image?: string | null, imageCrop?: {zoom:number,posX:number,posY:number} | null, size?: number, parameters: Record<string, {key:string,label:string,value:number,locked?:boolean,editable?:boolean,visible?:boolean,source?:string}>, components?: Record<string, any> },
 *   activePluginId?: string | null,
 *   onComponentChange?: (componentKey: string, value: any) => void,
 *   getComponents?: () => Record<string, any>,
 *   onConfirm: (result: {
 *     name: string,
 *     image: string | null,
 *     imageCrop: {zoom:number,posX:number,posY:number} | null,
 *     size: number,
 *     parameterValues: Record<string, number>,
 *     removedParamIds: string[],
 *     newCustomParameters: {key:string,label:string,value:number,visible:boolean}[],
 *     visibilityUpdates: Record<string, boolean>
 *   }) => void
 * }} options
 */
export function showCharacterEditDialog({ character, activePluginId = null, onComponentChange, getComponents, onConfirm }) {
  const dialog = ensureEditDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'キャラクターを更新';
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
  nameInput.value = character.name;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  mainColumn.appendChild(nameGroup);

  // --- 画像 ---
  const imagePicker = buildImagePicker(character.image, character.imageCrop);
  mainColumn.appendChild(imagePicker.element);

  // --- サイズ ---
  const sizeInput = buildSizeInput(character.size || 1);
  mainColumn.appendChild(sizeInput.element);

  // --- 既存パラメータ一覧（値の変更・削除） ---
  const paramListLabel = document.createElement('label');
  paramListLabel.textContent = 'パラメータ';
  paramListLabel.style.display = 'block';
  paramListLabel.style.marginTop = '4px';
  mainColumn.appendChild(paramListLabel);

  const paramListEl = document.createElement('div');
  paramListEl.className = 'dialog-custom-list';
  mainColumn.appendChild(paramListEl);

  const existingRows = []; // { paramId, valueInput, editable, visibleCheckbox, initialVisible }
  const removedParamIds = new Set();

  // プラグインが専用スペースを持つ場合、そのプラグイン由来のパラメータは
  // 右側のプラグイン専用スペースだけに表示し、こちらの汎用一覧には出さない（二重表示防止）
  const pluginOwnsDisplay = !!activePluginId && pluginHasCharacterPanel(activePluginId);

  Object.entries(character.parameters).forEach(([paramId, param]) => {
    if (pluginOwnsDisplay && param.source === activePluginId) return;
    // editable:falseの拡張ステータス（自動計算値・JSON同期専用の値等）は
    // 手入力での編集対象ではないため、更新ダイアログには表示しない
    if (param.editable === false) return;

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.textContent = param.label;
    label.className = 'dialog-param-label';
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.value = param.value;
    if (param.editable === false) {
      valueInput.disabled = true;
    }

    const initialVisible = param.visible !== false;
    const visibility = buildVisibilityCheckbox(initialVisible);
    const visibleCheckbox = visibility.checkbox;

    row.appendChild(label);
    row.appendChild(valueInput);
    row.appendChild(visibility.element);

    // 削除ボタンは常に配置し、locked時は非表示にするだけにする（数値入力・表示・削除の
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
    existingRows.push({ paramId, valueInput, editable: param.editable !== false, visibleCheckbox, initialVisible });
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
    valueInput.type = 'number';
    valueInput.value = 0;

    const visibility = buildVisibilityCheckbox(true);

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
    row.appendChild(removeBtn);
    customListEl.appendChild(row);

    customRows.push({ labelInput, valueInput, visibleCheckbox: visibility.checkbox, rowEl: row });
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
    mode: 'edit',
    parameters: character.parameters,
    components: character.components,
    onComponentChange,
    getComponents
  });
  columns.appendChild(pluginPanel.element);

  // --- ボタン行 ---
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '更新';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // ページ遷移させない
    const name = nameInput.value.trim();
    if (name === '') {
      nameInput.focus();
      return;
    }

    const parameterValues = {};
    const visibilityUpdates = {};
    existingRows.forEach(({ paramId, valueInput, editable, visibleCheckbox, initialVisible }) => {
      if (editable) {
        parameterValues[paramId] = Number(valueInput.value) || 0;
      }
      if (visibleCheckbox.checked !== initialVisible) {
        visibilityUpdates[paramId] = visibleCheckbox.checked;
      }
    });
    Object.assign(parameterValues, pluginPanel.getValues());

    const newCustomParameters = customRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: Number(row.valueInput.value) || 0,
        visible: row.visibleCheckbox.checked
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({
      name,
      image: imagePicker.getImage(),
      imageCrop: imagePicker.getCrop(),
      size: sizeInput.getSize(),
      parameterValues,
      removedParamIds: Array.from(removedParamIds),
      newCustomParameters,
      visibilityUpdates
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();
}