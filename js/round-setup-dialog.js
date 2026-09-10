// js/round-setup-dialog.js
// ラウンド進行の参加者選択ダイアログ。開始時（新規選択）・進行中（参加者の入れ替え）の
// どちらからも同じダイアログを使う。dumbな部品：storeを直接触らず、結果をonConfirmで返すだけ
// （呼び出し側がROUND_PROGRESSION_START/ROUND_SET_PARTICIPANTSのどちらをdispatchするか決める）。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   title?: string,
 *   tokens: Array<{id: string, name: string}>,
 *   currentParticipantIds?: string[],
 *   onConfirm: (result: { participantIds: string[] }) => void
 * }} options
 */
export function showRoundSetupDialog({ title = '参加者を選択', tokens, currentParticipantIds = [], onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = title;
  form.appendChild(heading);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  form.appendChild(listEl);

  const checkedIds = new Set(currentParticipantIds);
  const checkboxes = [];

  if (tokens.length === 0) {
    const empty = document.createElement('p');
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '0.85rem';
    empty.textContent = '盤面にキャラクターがいません。';
    listEl.appendChild(empty);
  }

  tokens.forEach(token => {
    const row = document.createElement('label');
    row.className = 'dialog-custom-row';
    row.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checkedIds.has(token.id);

    const label = document.createElement('span');
    label.textContent = token.name;
    label.style.flex = '1';

    row.appendChild(checkbox);
    row.appendChild(label);
    listEl.appendChild(row);

    checkboxes.push({ id: token.id, checkbox });
  });

  appendConfirmRow(form, {
    confirmLabel: '決定',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const participantIds = checkboxes.filter(c => c.checkbox.checked).map(c => c.id);
    dialog.close();
    onConfirm({ participantIds });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
