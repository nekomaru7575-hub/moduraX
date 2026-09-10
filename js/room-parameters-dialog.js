// js/room-parameters-dialog.js
// ルーム変数（room.parameters）専用の一覧編集ダイアログ。
// ルーム設定（ルーム名・BCDiceシステム等）とは別のメニュー項目から独立して開く。

// ユーザーが自由に名前を付けて追加するルーム変数の入力値を、数値として解釈できれば
// Numberに、できなければ文字列のまま返す。空欄は0扱い（旧来のNumber(x)||0と同じ挙動）。
// プラグイン由来のルーム変数（source!=='user'、例: 混沌レベル）は対象外（常に数値）。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';
function parseRoomParameterValue(raw) {
  const trimmed = String(raw).trim();
  if (trimmed === '') return 0;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : trimmed;
}

const ensureDialog = createDialogHost();

/**
 * 「編集不可(editable:false)」な変数は値の変更を受け付けず、
 * 「削除不可(locked:true)」な変数は削除ボタンを出さない（character-dialogの編集ダイアログと同じ規約）。
 *
 * @param {{
 *   parameters: Record<string, {key:string,label:string,value:number|string,locked?:boolean,editable?:boolean,source?:string}>,
 *   onConfirm: (result: {
 *     valueUpdates: Record<string, number|string>,
 *     removedParamIds: string[],
 *     newParameters: {key:string,label:string,value:number|string}[]
 *   }) => void
 * }} options
 */
export function showRoomParametersDialog({ parameters, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = 'ルーム変数';
  form.appendChild(heading);

  // --- 既存の変数一覧（値の変更・削除） ---
  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  form.appendChild(listEl);

  const existingRows = []; // { paramId, valueInput, editable }
  const removedParamIds = new Set();

  Object.entries(parameters).forEach(([paramId, param]) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('span');
    label.textContent = param.label;
    label.className = 'dialog-param-label';
    label.style.color = 'var(--text-body)';
    label.style.fontSize = '0.85rem';
    row.appendChild(label);

    // カスタム変数（source:'user'）のみ文字列値を受け付ける。プラグイン由来の
    // ルーム変数はバフ加算・ダイス計算の前提上、数値のまま。
    const isCustom = param.source === 'user';

    const valueInput = document.createElement('input');
    valueInput.type = isCustom ? 'text' : 'number';
    valueInput.value = param.value;
    if (param.editable === false) {
      valueInput.disabled = true;
    }
    row.appendChild(valueInput);

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

    listEl.appendChild(row);
    existingRows.push({ paramId, valueInput, editable: param.editable !== false, isCustom });
  });

  // --- 新規変数の追加 ---
  const newListEl = document.createElement('div');
  newListEl.className = 'dialog-custom-list';
  form.appendChild(newListEl);

  const newRows = [];

  function addNewRow() {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = '変数名（例: 現在シーン）';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = '0';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      row.remove();
      const idx = newRows.findIndex(r => r.rowEl === row);
      if (idx !== -1) newRows.splice(idx, 1);
    });

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);
    newListEl.appendChild(row);

    newRows.push({ labelInput, valueInput, rowEl: row });
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ ルーム変数を追加';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.addEventListener('click', addNewRow);
  form.appendChild(addBtn);

  // --- ボタン行 ---
  appendConfirmRow(form, {
    confirmLabel: '適用',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const valueUpdates = {};
    existingRows.forEach(({ paramId, valueInput, editable, isCustom }) => {
      if (editable) {
        valueUpdates[paramId] = isCustom ? parseRoomParameterValue(valueInput.value) : (Number(valueInput.value) || 0);
      }
    });

    const newParameters = newRows
      .map(row => ({
        key: row.labelInput.value.trim(),
        label: row.labelInput.value.trim(),
        value: parseRoomParameterValue(row.valueInput.value)
      }))
      .filter(p => p.key !== '');

    dialog.close();
    onConfirm({ valueUpdates, removedParamIds: Array.from(removedParamIds), newParameters });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
