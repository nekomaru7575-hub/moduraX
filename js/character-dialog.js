// js/character-dialog.js
// キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを
// まとめて入力するためのモーダルダイアログ。

import { CORE_DEFAULT_PARAMETERS } from './parameters/core.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{ onConfirm: (result: { name: string, parameterOverrides: Record<string, number>, customParameters: {key:string,label:string,value:number}[] }) => void }} options
 */
export function showCharacterDialog({ onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'キャラクターを登録';
  form.appendChild(title);

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
  form.appendChild(nameGroup);

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
    form.appendChild(group);
    defaultInputs[def.key] = input;
  });

  // --- カスタムパラメータ（User層） ---
  const customListEl = document.createElement('div');
  customListEl.className = 'dialog-custom-list';
  form.appendChild(customListEl);

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
    row.appendChild(removeBtn);
    customListEl.appendChild(row);

    customRows.push({ labelInput, valueInput, rowEl: row });
  }

  const addCustomBtn = document.createElement('button');
  addCustomBtn.type = 'button';
  addCustomBtn.textContent = '+ カスタムパラメータを追加';
  addCustomBtn.className = 'dialog-add-row-btn';
  addCustomBtn.addEventListener('click', addCustomRow);
  form.appendChild(addCustomBtn);

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

    const customParameters = customRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: Number(row.valueInput.value) || 0
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({ name, parameterOverrides, customParameters });
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
 *   character: { name: string, parameters: Record<string, {key:string,label:string,value:number,locked?:boolean,editable?:boolean,visible?:boolean}> },
 *   onConfirm: (result: {
 *     name: string,
 *     parameterValues: Record<string, number>,
 *     removedParamIds: string[],
 *     newCustomParameters: {key:string,label:string,value:number}[],
 *     visibilityUpdates: Record<string, boolean>
 *   }) => void
 * }} options
 */
export function showCharacterEditDialog({ character, onConfirm }) {
  const dialog = ensureEditDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'キャラクターを更新';
  form.appendChild(title);

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
  form.appendChild(nameGroup);

  // --- 既存パラメータ一覧（値の変更・削除） ---
  const paramListLabel = document.createElement('label');
  paramListLabel.textContent = 'パラメータ';
  paramListLabel.style.display = 'block';
  paramListLabel.style.marginTop = '4px';
  form.appendChild(paramListLabel);

  const paramListEl = document.createElement('div');
  paramListEl.className = 'dialog-custom-list';
  form.appendChild(paramListEl);

  const existingRows = []; // { paramId, valueInput, editable, visibleCheckbox, initialVisible }
  const removedParamIds = new Set();

  Object.entries(character.parameters).forEach(([paramId, param]) => {
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
    const visibleLabel = document.createElement('label');
    visibleLabel.style.display = 'flex';
    visibleLabel.style.alignItems = 'center';
    visibleLabel.style.gap = '4px';
    visibleLabel.style.color = '#aaa';
    visibleLabel.style.fontSize = '0.8rem';
    visibleLabel.style.flexShrink = '0';
    const visibleCheckbox = document.createElement('input');
    visibleCheckbox.type = 'checkbox';
    visibleCheckbox.checked = initialVisible;
    visibleLabel.appendChild(visibleCheckbox);
    visibleLabel.appendChild(document.createTextNode('表示'));

    row.appendChild(label);
    row.appendChild(valueInput);
    row.appendChild(visibleLabel);

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
  form.appendChild(customListEl);

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
    row.appendChild(removeBtn);
    customListEl.appendChild(row);

    customRows.push({ labelInput, valueInput, rowEl: row });
  }

  const addCustomBtn = document.createElement('button');
  addCustomBtn.type = 'button';
  addCustomBtn.textContent = '+ カスタムパラメータを追加';
  addCustomBtn.className = 'dialog-add-row-btn';
  addCustomBtn.addEventListener('click', addCustomRow);
  form.appendChild(addCustomBtn);

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

    const newCustomParameters = customRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: Number(row.valueInput.value) || 0
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({
      name,
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