// js/log-export-dialog.js
// 「ログを保存」のタブ選択ダイアログ。どのチャットタブを書き出すかだけを決め、
// HTMLの組み立て（log-export.js）とダウンロード（main.js）は呼び出し側に任せる。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   tabs: {id: string, name: string}[],
 *   onConfirm: (selectedTabIds: string[]) => void
 * }} options
 */
export function showLogExportDialog({ tabs, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = 'ログを保存';
  form.appendChild(heading);

  const note = document.createElement('label');
  note.textContent = '保存するチャットタブ';
  form.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  form.appendChild(listEl);

  // 「全部まとめて残す」が一番多い使い方なので既定は全選択にしておく
  const checkboxes = tabs.map(tab => {
    const row = document.createElement('label');
    row.className = 'dialog-custom-row dialog-check-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;

    const name = document.createElement('span');
    name.textContent = tab.name;

    row.appendChild(checkbox);
    row.appendChild(name);
    listEl.appendChild(row);

    return { tabId: tab.id, checkbox };
  });

  appendConfirmRow(form, {
    confirmLabel: '保存',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const selectedTabIds = checkboxes.filter(c => c.checkbox.checked).map(c => c.tabId);
    if (selectedTabIds.length === 0) {
      alert('保存するタブを1つ以上選んでください。');
      return;
    }

    dialog.close();
    onConfirm(selectedTabIds);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
