// js/deck-list-dialog.js
// デッキ一覧。ルームメニューの「デッキ一覧」から開き、ここを起点に配置・作成・編集・削除・
// JSONの書き出し／読み込みを行う。実際の入力画面はjs/deck-editor-dialog.jsが持つ
// （この画面は一覧と導線だけ。js/original-table-list-dialog.jsと同じ役割分担）。
//
// 並ぶのは2種類:
//   既定のデッキ … 組み込みの簡易トランプ（js/card-catalog.jsのDECK_TEMPLATES）。
//                  どの部屋でも最初から置ける。編集すると部屋のデッキへ複製される。
//   この部屋のデッキ … 作って保存したもの（room.deckTemplates）。部屋の全員で共有する。

import { createDialogHost } from './dialog-host.js';

const ensureDialog = createDialogHost();

function sectionHeading(text) {
  const el = document.createElement('div');
  el.className = 'deck-list-section';
  el.textContent = text;
  return el;
}

// 一覧の1行。名前のボタンで配置し、右側に操作ボタンを並べる。
function buildRow({ label, title, onPlace, actions }) {
  const row = document.createElement('div');
  row.className = 'dialog-custom-row';

  const placeBtn = document.createElement('button');
  placeBtn.type = 'button';
  placeBtn.className = 'dialog-table-name-btn';
  placeBtn.textContent = label;
  placeBtn.title = title || '盤面に配置します';
  // 配置したら閉じる。この一覧はモーダルなので、開いたままだと置いたデッキを触れない
  placeBtn.addEventListener('click', () => {
    ensureDialog.closeIfOpen();
    onPlace();
  });
  row.appendChild(placeBtn);

  actions.forEach(({ text, hint, danger, onSelect }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.title = hint || '';
    btn.className = danger ? 'dialog-remove-row' : 'deck-list-action';
    btn.addEventListener('click', onSelect);
    row.appendChild(btn);
  });

  return row;
}

/**
 * 追加・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
 * 呼び出し側は状態を変えたあとこの関数を呼び直せば、最新の一覧で開き直せる
 * （js/original-table-list-dialog.jsと同じ）。
 *
 * @param {{
 *   builtIns: {id: string, label: string, count: number}[],
 *   templates: {id: string, name: string, count: number}[],
 *   onPlaceBuiltIn: (id: string) => void,
 *   onCopyBuiltIn: (id: string) => void,
 *   onPlace: (id: string) => void,
 *   onEdit: (id: string) => void,
 *   onExport: (id: string) => void,
 *   onRemove: (id: string) => void,
 *   onCreate: () => void,
 *   onImport: () => void
 * }} options
 */
export function showDeckListDialog({
  builtIns, templates,
  onPlaceBuiltIn, onCopyBuiltIn, onPlace, onEdit, onExport, onRemove, onCreate, onImport
}) {
  const dialog = ensureDialog();
  // デッキを足したあとに開き直す使い方をするため、開いたままのshowModalで例外にならないようにする
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  const container = document.createElement('div');

  const heading = document.createElement('h3');
  heading.textContent = 'デッキ一覧';
  container.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'dialog-form-note';
  note.textContent = 'デッキ名を押すと盤面へ配置します。作ったデッキは部屋の全員が使えます。';
  container.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  container.appendChild(listEl);

  // --- 既定のデッキ ---
  listEl.appendChild(sectionHeading('既定のデッキ'));
  builtIns.forEach(({ id, label, count }) => {
    listEl.appendChild(buildRow({
      label: `${label}（${count}枚）`,
      onPlace: () => onPlaceBuiltIn(id),
      actions: [
        {
          text: '複製して編集',
          hint: 'この部屋のデッキとして写しを作り、その写しを編集します（既定のデッキ自体は変わりません）。',
          onSelect: () => onCopyBuiltIn(id)
        }
      ]
    }));
  });

  // --- この部屋のデッキ ---
  listEl.appendChild(sectionHeading('この部屋のデッキ'));

  if (templates.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだデッキがありません。';
    listEl.appendChild(empty);
  }

  templates.forEach(({ id, name, count }) => {
    listEl.appendChild(buildRow({
      label: `${name}（${count}枚）`,
      onPlace: () => onPlace(id),
      actions: [
        { text: '編集', onSelect: () => onEdit(id) },
        { text: '書き出し', hint: 'このデッキをJSONファイルへ保存します（他の部屋へ持ち込めます）。', onSelect: () => onExport(id) },
        {
          text: '×',
          danger: true,
          hint: '削除',
          onSelect: () => {
            if (!confirm(`デッキ「${name}」を削除しますか？（盤面に置いてあるものは消えません）`)) return;
            onRemove(id);
          }
        }
      ]
    }));
  });

  // --- 下部のボタン ---
  const createRow = document.createElement('div');
  createRow.className = 'dialog-custom-row';

  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.textContent = '＋ 新規デッキを作成';
  createBtn.className = 'dialog-add-row-btn';
  createBtn.style.marginBottom = '0';
  createBtn.addEventListener('click', () => {
    dialog.close();
    onCreate();
  });
  createRow.appendChild(createBtn);

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.textContent = 'JSONから読み込む';
  importBtn.className = 'dialog-add-row-btn';
  importBtn.style.marginBottom = '0';
  importBtn.title = '書き出したデッキのJSONファイルを、この部屋のデッキとして取り込みます。';
  importBtn.addEventListener('click', () => {
    dialog.close();
    onImport();
  });
  createRow.appendChild(importBtn);

  container.appendChild(createRow);

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
