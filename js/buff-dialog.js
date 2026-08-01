// js/buff-dialog.js
// コマ（トークン）へのバフ/デバフの付与・一覧表示ダイアログ。
// バフ/デバフは「対象パラメータへの加算値」＋「終了条件（シーン/ラウンド/シナリオ終了/手動のみ）」
// を持つ、名前付きの一時的な修正値。効果自体はgame-store.jsのgetEffectiveParameterValueが
// パラメータの基礎値に加算して計算する（このダイアログは付与・削除の入出力のみを担当する）。

import { BUFF_PHASE_LABELS } from './game-store.js';

// 入れ子の外側→内側の順に並べる（game-store.jsのPHASE_HIERARCHYと同じ順序）。
// 内側を選んだバフは、外側のフェーズが終わったときにも消える。
const EXPIRE_PHASE_OPTIONS = [
  { value: '', label: '手動のみ（自動消滅なし）' },
  { value: 'scenario', label: 'シナリオ終了で消滅' },
  { value: 'scene', label: 'シーン終了で消滅' },
  { value: 'round', label: 'ラウンド終了で消滅' },
  { value: 'process', label: 'プロセス終了で消滅' },
  { value: 'check', label: '判定終了で消滅' }
];

let addDialogEl = null;

function ensureAddDialog() {
  if (addDialogEl) return addDialogEl;
  addDialogEl = document.createElement('dialog');
  addDialogEl.className = 'character-dialog';
  document.body.appendChild(addDialogEl);
  return addDialogEl;
}

/**
 * @param {{
 *   parameters: Record<string, {key:string,label:string,value:number}>,
 *   onConfirm: (result: { name: string, paramId: string|null, delta: number, expirePhase: string|null }) => void
 * }} options
 */
export function showAddBuffDialog({ parameters = {}, onConfirm }) {
  const dialog = ensureAddDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'バフ/デバフを付与';
  form.appendChild(title);

  // --- 名前 ---
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dialog-form-group';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = '名前';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // --- 対象パラメータ ---
  const paramGroup = document.createElement('div');
  paramGroup.className = 'dialog-form-group';
  const paramLabel = document.createElement('label');
  paramLabel.textContent = '対象パラメータ';
  const paramSelect = document.createElement('select');
  Object.entries(parameters).forEach(([paramId, param]) => {
    const opt = document.createElement('option');
    opt.value = paramId;
    opt.textContent = param.label;
    paramSelect.appendChild(opt);
  });
  paramGroup.appendChild(paramLabel);
  paramGroup.appendChild(paramSelect);
  form.appendChild(paramGroup);

  // --- 増減値 ---
  const deltaGroup = document.createElement('div');
  deltaGroup.className = 'dialog-form-group';
  const deltaLabel = document.createElement('label');
  deltaLabel.textContent = '増減値（デバフはマイナスを入力）';
  const deltaInput = document.createElement('input');
  deltaInput.type = 'number';
  deltaInput.value = 0;
  deltaGroup.appendChild(deltaLabel);
  deltaGroup.appendChild(deltaInput);
  form.appendChild(deltaGroup);

  // --- 終了条件 ---
  const expireGroup = document.createElement('div');
  expireGroup.className = 'dialog-form-group';
  const expireLabel = document.createElement('label');
  expireLabel.textContent = '終了条件';
  const expireSelect = document.createElement('select');
  EXPIRE_PHASE_OPTIONS.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    expireSelect.appendChild(opt);
  });
  expireGroup.appendChild(expireLabel);
  expireGroup.appendChild(expireSelect);
  // 入れ子の仕様はラベルからは読み取れないので、ここで明示しておく
  const expireNote = document.createElement('p');
  expireNote.className = 'dialog-form-note';
  expireNote.textContent = 'シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定。上位の終了でも消滅します。';
  expireGroup.appendChild(expireNote);
  form.appendChild(expireGroup);

  // --- ボタン行 ---
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '付与';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (name === '') {
      nameInput.focus();
      return;
    }

    dialog.close();
    onConfirm({
      name,
      paramId: paramSelect.value || null,
      delta: Number(deltaInput.value) || 0,
      expirePhase: expireSelect.value || null
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();
}

let listDialogEl = null;

function ensureListDialog() {
  if (listDialogEl) return listDialogEl;
  listDialogEl = document.createElement('dialog');
  listDialogEl.className = 'character-dialog';
  document.body.appendChild(listDialogEl);
  return listDialogEl;
}

function formatBuffLine(buff, parameters) {
  const paramLabel = buff.paramId && parameters[buff.paramId]
    ? parameters[buff.paramId].label
    : '（対象パラメータなし）';
  const sign = buff.delta >= 0 ? '+' : '';
  const expireLabel = buff.expirePhase ? `${BUFF_PHASE_LABELS[buff.expirePhase]}終了で消滅` : '手動のみ';
  return `${buff.name}　${paramLabel}${sign}${buff.delta}　（${expireLabel}）`;
}

/**
 * @param {{
 *   getBuffs: () => Array<{id:string,name:string,paramId:string|null,delta:number,expirePhase:string|null}>,
 *   getParameters: () => Record<string, {label:string}>,
 *   onRemove: (buffId: string) => void
 * }} options
 */
export function showBuffListDialog({ getBuffs, getParameters, onRemove }) {
  const dialog = ensureListDialog();
  dialog.innerHTML = '';

  const title = document.createElement('h3');
  title.textContent = 'バフ/デバフ一覧';
  dialog.appendChild(title);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  dialog.appendChild(listEl);

  function renderList() {
    listEl.innerHTML = '';
    const buffs = getBuffs();
    const parameters = getParameters();

    if (buffs.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = '#888';
      empty.textContent = '現在、付与されているバフ/デバフはありません。';
      listEl.appendChild(empty);
      return;
    }

    buffs.forEach(buff => {
      const row = document.createElement('div');
      row.className = 'dialog-custom-row';

      const info = document.createElement('span');
      info.className = 'buff-row-info';
      info.textContent = formatBuffLine(buff, parameters);
      row.appendChild(info);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'dialog-remove-row';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        onRemove(buff.id);
        renderList(); // 削除は即時反映。ダイアログを開いたまま次の操作へ移れるようにする
      });
      row.appendChild(removeBtn);

      listEl.appendChild(row);
    });
  }

  renderList();

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(closeBtn);
  dialog.appendChild(btnRow);

  dialog.showModal();
}
