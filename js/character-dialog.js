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