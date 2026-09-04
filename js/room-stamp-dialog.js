// js/room-stamp-dialog.js
// 部屋のスタンプ1件の登録・編集ダイアログ。一覧（js/room-stamp-list-dialog.js）から開く。
//
// 状態に載るのは画像のURLだけで、実体はR2（またはP2P卓のIndexedDB）にある。
// 受け付けるURLの形は js/store/stamps.js の isAllowedRoomStampUrl が決める——
// 画面側でも同じ判定を通すのは、通してからreducerに黙って捨てられるのを防ぐため。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';
import { pickAndUploadImage } from './image-upload.js';
import { isAllowedRoomStampUrl, MAX_ROOM_STAMP_LABEL_LENGTH } from './store/stamps.js';

const ensureDialog = createDialogHost();

// アップロードできない環境（R2が設定されていない・通信に失敗した）では、
// pickAndUploadImageが画像をデータURLのまま返す（js/image-upload.js）。
// スタンプはそれを受け付けないので、選んだその場で理由を出す。
const NO_UPLOAD_REASON = 'この環境では画像をアップロードできないため、スタンプを登録できません。'
  + '（部屋の管理者にサーバーの画像アップロード設定を確認してください）';

/**
 * @param {{
 *   stamp?: {id:string, label:string, url:string, key:string|null, counted:boolean} | null,
 *     編集するスタンプ。nullなら新規。idは公開ID（"room:xxx"）ではなくローカルid
 *   onConfirm: (result: {
 *     id:string|null, label:string, url:string, key:string|null, counted:boolean
 *   }) => void,
 *   onCancel: () => void
 * }} options
 */
export function showRoomStampDialog({ stamp = null, onConfirm, onCancel }) {
  const dialog = ensureDialog();
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  let currentUrl = stamp?.url || null;
  let currentKey = stamp?.key ?? null;

  // キャンセル・Escのどちらで閉じても後始末を1回だけ通す
  // （js/original-table-dialog.jsと同じ理由。closeイベントはこの環境で発火しない）。
  let settled = false;
  const closeWithCancel = () => {
    if (settled) return;
    settled = true;
    dialog.close();
    onCancel?.();
  };

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = stamp ? 'スタンプを編集' : 'スタンプを追加';
  form.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = '登録したスタンプは、この部屋の全員が送れるようになります。'
    + '正方形・背景透過の画像が向いています（表示は64px程度）。';
  form.appendChild(note);

  // --- 名前 ---
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dialog-form-group';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = '名前';
  nameGroup.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = MAX_ROOM_STAMP_LABEL_LENGTH;
  // 名前はボタンの下に出るだけでなく、チャットコマンド「スタンプ(名前)」の引数にもなる
  nameInput.placeholder = '例：なるほど';
  nameInput.value = stamp?.label || '';
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // --- 画像 ---
  const imageGroup = document.createElement('div');
  imageGroup.className = 'dialog-form-group';
  const imageLabel = document.createElement('label');
  imageLabel.textContent = '画像';
  imageGroup.appendChild(imageLabel);

  const preview = document.createElement('img');
  preview.className = 'dialog-image-preview';
  preview.style.display = currentUrl ? 'block' : 'none';
  if (currentUrl) preview.src = currentUrl;
  imageGroup.appendChild(preview);

  const warning = document.createElement('div');
  warning.className = 'dialog-empty-note';
  warning.hidden = true;
  imageGroup.appendChild(warning);

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.addEventListener('click', async () => {
    const picked = await pickAndUploadImage({ purpose: 'stamp' });
    if (!picked) return;

    // 【選んだ直後に検査する】ここを省くと、利用者は画像を選び、プレビューを見て、
    // 登録を押し、reducerに黙って捨てられる——何が起きたのか分からない壊れ方になる。
    // picked.key === null では判別できない（P2P卓の正常系もnull）ので、URLの形で見る。
    if (!isAllowedRoomStampUrl(picked.url)) {
      warning.textContent = NO_UPLOAD_REASON;
      warning.hidden = false;
      return;
    }

    warning.hidden = true;
    currentUrl = picked.url;
    currentKey = picked.key ?? null;
    preview.src = currentUrl;
    preview.style.display = 'block';
  });
  imageGroup.appendChild(pickBtn);
  form.appendChild(imageGroup);

  // --- 集計 ---
  // 既定は「数えない」（Coreのスタンプと同じ相槌の扱い）。ここを入れると、誰が何枚
  // 押したかがスタンプ送信パネルの集計に並び、全員ぶんの合計がルーム変数
  // 「（スタンプ名）合計」に出る。ダイス式から {なるほど合計} のように参照できる。
  const countGroup = document.createElement('div');
  countGroup.className = 'dialog-form-group';

  const countLabel = document.createElement('label');
  const countInput = document.createElement('input');
  countInput.type = 'checkbox';
  countInput.checked = stamp?.counted === true;
  countLabel.appendChild(countInput);
  countLabel.appendChild(document.createTextNode(' 押された数を集計する'));
  countGroup.appendChild(countLabel);

  const countNote = document.createElement('p');
  countNote.className = 'audio-note';
  countNote.textContent = 'スタンプ送信パネルに「誰が何枚」の集計が出て、'
    + 'ルーム変数「（スタンプ名）合計」に全員ぶんの合計が入ります。'
    + 'この変数は自動で計算されるので、手では変えられません。';
  countGroup.appendChild(countNote);
  form.appendChild(countGroup);

  appendConfirmRow(form, {
    confirmLabel: stamp ? '保存' : '登録',
    onCancel: closeWithCancel
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const label = nameInput.value.trim();
    if (!label) {
      alert('名前を入力してください。');
      return;
    }
    if (!currentUrl) {
      alert('画像を選択してください。');
      return;
    }

    settled = true;
    dialog.close();
    // idは編集なら据え置き（＝上書き）。新規は呼び出し側が採番する。
    onConfirm({
      id: stamp?.id ?? null, label, url: currentUrl, key: currentKey,
      counted: countInput.checked
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();

  // ダイアログは使い回しの1枚なので、前回のハンドラを必ず外してから貼り直す
  // （js/original-table-dialog.jsと同じ理由）。
  if (dialog.__roomStampEscHandler) {
    dialog.removeEventListener('keydown', dialog.__roomStampEscHandler);
  }
  const escHandler = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeWithCancel();
  };
  dialog.__roomStampEscHandler = escHandler;
  dialog.addEventListener('keydown', escHandler);
}
