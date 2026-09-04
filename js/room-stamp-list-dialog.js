// js/room-stamp-list-dialog.js
// 部屋に登録したスタンプ（room.stamps）の一覧ダイアログ。
// ルームメニューの「オリジナルスタンプ一覧」から開き、ここを起点に登録・編集・削除を行う。
// 入力画面はjs/room-stamp-dialog.jsが持つ（この画面は一覧と導線だけ）。
//
// 登録・削除ができるのはGMだけ（js/room-authority-rules.jsのGM_ONLY_ACTIONS）。
// ここでの無効化は案内であって制限ではない——権威側で弾くのが本当の制御。

import { createDialogHost } from './dialog-host.js';
import { canOperateAsGm, GM_ONLY_REASON } from './room-authority.js';
import { MAX_ROOM_STAMPS, roomStampTotalLabel } from './store/stamps.js';

const ensureDialog = createDialogHost();

/**
 * 追加・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
 * 呼び出し側は状態を変えたあとこの関数を呼び直せば、最新の一覧で開き直せる
 * （js/original-table-list-dialog.jsと同じ約束）。
 *
 * @param {{
 *   stamps: Record<string, {
 *     id:string, label:string, url:string, key:string|null, counted:boolean
 *   }>,
 *     キーは公開ID（"room:<ローカルid>"）
 *   onAdd: () => void,
 *   onSelect: (localId: string) => void,
 *   onRemove: (localId: string) => void
 * }} options
 *   onSelect/onRemoveへ渡すのはローカルid（公開IDから名前空間を外したもの）。
 *   アクションのpayloadがローカルidを取るため、変換はここで済ませる。
 */
export function showRoomStampListDialog({ stamps, onAdd, onSelect, onRemove }) {
  const dialog = ensureDialog();
  // 登録・削除のあとに開き直す使い方をするため、開いたままのshowModalで例外にならないようにする
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  const gm = canOperateAsGm();
  const entries = Object.values(stamps || {});

  const container = document.createElement('div');

  const heading = document.createElement('h3');
  heading.textContent = 'オリジナルスタンプ一覧';
  container.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = gm
    ? `この部屋だけで使えるスタンプです（${entries.length} / ${MAX_ROOM_STAMPS}件）。`
      + '登録すると全員が「スタンプ送信」パネルとチャットの「スタンプ(名前)」から送れます。'
    : `この部屋だけで使えるスタンプです（${entries.length} / ${MAX_ROOM_STAMPS}件）。${GM_ONLY_REASON}`;
  container.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  container.appendChild(listEl);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだスタンプがありません。';
    listEl.appendChild(empty);
  }

  entries.forEach(stamp => {
    // 公開ID "room:xxx" のうしろがローカルid。アクションはローカルidで受ける。
    const localId = stamp.id.slice(stamp.id.indexOf(':') + 1);

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const thumb = document.createElement('img');
    thumb.className = 'stamp-send-image';
    thumb.alt = '';
    thumb.src = stamp.url;
    // 画像が読めなくても行は残す（名前と削除の導線が消えると片付けられなくなる）。
    // js/stamp-panel.jsと同じ逃げ道。
    thumb.addEventListener('error', () => { thumb.remove(); });
    row.appendChild(thumb);

    const nameBtn = document.createElement('button');
    nameBtn.type = 'button';
    nameBtn.className = 'dialog-table-name-btn';
    // 名前は登録した人が決めた文字列なので、必ずtextContentで入れる。
    // 集計するスタンプは、ルーム変数の名前をそのまま添えて見分けられるようにする
    // （どの変数がこのスタンプのものか、一覧だけで分かるように）。
    nameBtn.textContent = stamp.counted
      ? `${stamp.label} 〔集計：${roomStampTotalLabel(stamp.label)}〕`
      : stamp.label;
    nameBtn.disabled = !gm;
    nameBtn.title = gm ? '' : GM_ONLY_REASON;
    nameBtn.addEventListener('click', () => {
      dialog.close();
      onSelect(localId);
    });
    row.appendChild(nameBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.disabled = !gm;
    removeBtn.title = gm ? '' : GM_ONLY_REASON;
    removeBtn.addEventListener('click', () => {
      if (!confirm(`スタンプ「${stamp.label}」を削除しますか？`)) return;
      onRemove(localId);
    });
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  // 上限に達したら、押しても何も起きないボタンではなく理由の見える無効化にする
  const full = entries.length >= MAX_ROOM_STAMPS;
  addBtn.textContent = full ? `+ スタンプを追加（上限${MAX_ROOM_STAMPS}件）` : '+ スタンプを追加';
  addBtn.disabled = !gm || full;
  addBtn.title = gm
    ? (full ? `登録できるのは${MAX_ROOM_STAMPS}件までです。` : '')
    : GM_ONLY_REASON;
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
