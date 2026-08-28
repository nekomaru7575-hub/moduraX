// js/original-table-list-dialog.js
// 登録済みのオリジナル表（room.originalTables）のタイトル一覧ダイアログ。
// ルームメニューの「オリジナル表一覧」から開き、ここを起点に新規作成・編集・削除を行う。
// 実際の入力画面はoriginal-table-dialog.jsが持つ（この画面はタイトルの一覧と導線だけ）。

import { createDialogHost } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * 追加・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
 * 呼び出し側は状態を変えたあとこの関数を呼び直せば、最新の一覧で開き直せる。
 *
 * @param {{
 *   tables: Record<string, {title:string, dice:string, entries:Record<string,string>}>,
 *   onAdd: () => void,
 *   onSelect: (title: string) => void,
 *   onRemove: (title: string) => void
 * }} options
 */
export function showOriginalTableListDialog({ tables, onAdd, onSelect, onRemove }) {
  const dialog = ensureDialog();
  // 表を追加・削除したあとに開き直す使い方をするため、開いたままのshowModalで例外にならないようにする
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  const container = document.createElement('div');

  const heading = document.createElement('h3');
  heading.textContent = 'オリジナル表一覧';
  container.appendChild(heading);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  container.appendChild(listEl);

  const titles = Object.keys(tables);

  if (titles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだオリジナル表がありません。';
    listEl.appendChild(empty);
  }

  titles.forEach(title => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const nameBtn = document.createElement('button');
    nameBtn.type = 'button';
    nameBtn.className = 'dialog-table-name-btn';
    nameBtn.textContent = title;
    nameBtn.addEventListener('click', () => {
      dialog.close();
      onSelect(title);
    });
    row.appendChild(nameBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      if (!confirm(`オリジナル表「${title}」を削除しますか？`)) return;
      onRemove(title);
    });
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 新規表を追加';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.addEventListener('click', () => {
    dialog.close();
    onAdd();
  });
  container.appendChild(addBtn);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.addEventListener('click', () => dialog.close());

  btnRow.appendChild(closeBtn);
  container.appendChild(btnRow);

  dialog.appendChild(container);
  dialog.showModal();
}
