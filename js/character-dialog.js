// js/character-dialog.js
// キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを
// まとめて入力するためのモーダルダイアログ。

import { CORE_DEFAULT_PARAMETERS } from './parameters/core.js';
import { pickFileAsDataUrl } from './file-uploader.js';
import { buildCharacterParametersForPlugin, pluginHasCharacterPanel, renderCharacterPanel } from './parameters/registry.js';

// プラグイン専用スペースを組み立てる。プラグインが専用UI(renderCharacterPanel)を
// 持っていればそれを描画し、持っていなければ「プラグイン未選択」等のプレースホルダを出す。
// getValues()は、プラグインが専用UIを描画した場合のみ値を返す関数を持つ。
function buildPluginPanel({ activePluginId, mode, parameters, components, onComponentChange }) {
  const column = document.createElement('div');
  column.className = 'dialog-plugin-column';

  let panel = null;
  if (activePluginId && pluginHasCharacterPanel(activePluginId)) {
    panel = renderCharacterPanel(activePluginId, { container: column, mode, parameters, components, onComponentChange });
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

// キャラクター画像の選択UI（プレビュー＋選択/削除ボタン）を組み立てる。
// 作成/更新どちらのダイアログからも同じ形で使えるよう共通化する。
function buildImagePicker(initialImage) {
  let currentImage = initialImage || null;

  const group = document.createElement('div');
  group.className = 'dialog-form-group';

  const label = document.createElement('label');
  label.textContent = '画像';
  group.appendChild(label);

  const preview = document.createElement('img');
  preview.className = 'dialog-image-preview';
  preview.style.display = currentImage ? 'block' : 'none';
  if (currentImage) preview.src = currentImage;
  group.appendChild(preview);

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
    preview.src = currentImage;
    preview.style.display = 'block';
  });
  btnRow.appendChild(pickBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '画像を削除';
  clearBtn.className = 'dialog-remove-row';
  clearBtn.addEventListener('click', () => {
    currentImage = null;
    preview.removeAttribute('src');
    preview.style.display = 'none';
  });
  btnRow.appendChild(clearBtn);

  group.appendChild(btnRow);

  return { element: group, getImage: () => currentImage };
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
 *   onConfirm: (result: { name: string, image: string | null, parameterOverrides: Record<string, number>, customParameters: {key:string,label:string,value:number,visible:boolean}[] }) => void
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
  const imagePicker = buildImagePicker(null);
  mainColumn.appendChild(imagePicker.element);

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
    onConfirm({ name, image: imagePicker.getImage(), parameterOverrides, customParameters });
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
 *   character: { name: string, image?: string | null, parameters: Record<string, {key:string,label:string,value:number,locked?:boolean,editable?:boolean,visible?:boolean,source?:string}>, components?: Record<string, any> },
 *   activePluginId?: string | null,
 *   onComponentChange?: (componentKey: string, value: any) => void,
 *   onConfirm: (result: {
 *     name: string,
 *     image: string | null,
 *     parameterValues: Record<string, number>,
 *     removedParamIds: string[],
 *     newCustomParameters: {key:string,label:string,value:number,visible:boolean}[],
 *     visibilityUpdates: Record<string, boolean>
 *   }) => void
 * }} options
 */
export function showCharacterEditDialog({ character, activePluginId = null, onComponentChange, onConfirm }) {
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
  const imagePicker = buildImagePicker(character.image);
  mainColumn.appendChild(imagePicker.element);

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
    label.style.flex = '1';
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

    if (!param.locked) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.className = 'dialog-remove-row';
      removeBtn.addEventListener('click', () => {
        row.remove();
        removedParamIds.add(paramId);
        const idx = existingRows.findIndex(r => r.paramId === paramId);
        if (idx !== -1) existingRows.splice(idx, 1);
      });
      row.appendChild(removeBtn);
    }

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
    onComponentChange
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