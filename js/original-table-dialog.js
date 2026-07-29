// js/original-table-dialog.js
// オリジナル表（ユーザー定義のダイス表）の作成／編集ダイアログ。
// 「タイトル」「ダイス」「テーブル（出目:結果を1行ずつ）」を入力して登録する。
// 登録した表はチャットにタイトルを完全一致で入力すると振れる（main.jsのtryHandleOriginalTableCommand参照）。
// 開く導線はオリジナル表一覧（original-table-list-dialog.js）。

// テーブル欄のテキスト（1行1エントリ、"出目:結果"）を { 出目: 結果 } の辞書へ変換する。
// 区切りは半角/全角コロンどちらも許可。コロンが無い行・空行は無視する。
function parseTableEntries(text) {
  const entries = {};
  String(text).split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const sepIndex = trimmed.search(/[:：]/);
    if (sepIndex === -1) return;
    const key = trimmed.slice(0, sepIndex).trim();
    const value = trimmed.slice(sepIndex + 1).trim();
    if (key && value) entries[key] = value;
  });
  return entries;
}

// parseTableEntriesの逆変換。既存の表を編集で開くとき、テーブル欄に元の入力形式で戻す。
function formatTableEntries(entries) {
  return Object.entries(entries).map(([key, value]) => `${key}:${value}`).join('\n');
}

let dialogEl = null;
let escHandler = null; // dialogElは使い回しなので、前回のEscハンドラを外すために保持する

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * tableを渡すとその内容を初期表示した編集モードになる。表のキーはタイトルなので、
 * 編集でタイトルを変えた場合は呼び出し側で旧タイトルの表を消す必要がある（previousTitleを渡す理由）。
 *
 * onCancelは「一覧へ戻す」用。この画面は一覧（original-table-list-dialog.js）が自分を閉じてから
 * 開くため、キャンセルで何も指定しないと一覧ごと閉じたように見えてしまう。
 *
 * @param {{
 *   table?: { title: string, dice: string, entries: Record<string,string> } | null,
 *   onConfirm: (result: { title: string, dice: string, entries: Record<string,string>, previousTitle: string|null }) => void,
 *   onCancel?: (() => void) | null
 * }} options
 */
export function showOriginalTableDialog({ table = null, onConfirm, onCancel = null }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 閉じ方（キャンセル／Esc／確定）に関わらず、後続処理は一度だけ走らせる
  let settled = false;

  function closeWithCancel() {
    if (settled) return;
    settled = true;
    dialog.close();
    if (onCancel) onCancel();
  }

  // Escで閉じたときも一覧へ戻したい。<dialog>のcloseイベントは環境によって発火しない
  // （このアプリの動作環境でも発火しなかった）ため、keydownで自前に処理する。
  // dialogElは使い回しのシングルトンなので、前回分を必ず外してから登録する。
  if (escHandler) dialog.removeEventListener('keydown', escHandler);
  escHandler = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeWithCancel();
  };
  dialog.addEventListener('keydown', escHandler);

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = table ? 'オリジナル表編集' : 'オリジナル表作成';
  form.appendChild(heading);

  const titleGroup = document.createElement('div');
  titleGroup.className = 'dialog-form-group';
  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'タイトル（チャットに入力すると振れます）';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = '例: 飲み物決定表';
  if (table) titleInput.value = table.title;
  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);
  form.appendChild(titleGroup);

  const diceGroup = document.createElement('div');
  diceGroup.className = 'dialog-form-group';
  const diceLabel = document.createElement('label');
  diceLabel.textContent = 'ダイス（例: 1D6 / 2D6 / D66）';
  const diceInput = document.createElement('input');
  diceInput.type = 'text';
  diceInput.placeholder = '1D6';
  if (table) diceInput.value = table.dice;
  diceGroup.appendChild(diceLabel);
  diceGroup.appendChild(diceInput);
  form.appendChild(diceGroup);

  const tableGroup = document.createElement('div');
  tableGroup.className = 'dialog-form-group';
  const tableLabel = document.createElement('label');
  tableLabel.textContent = 'テーブル（1行ずつ「出目:結果」）';
  const tableInput = document.createElement('textarea');
  tableInput.rows = 8;
  tableInput.placeholder = '1:水\n2:緑茶\n3:麦茶\n4:コーラ\n5:オレンジジュース\n6:エナジードリンク';
  if (table) tableInput.value = formatTableEntries(table.entries);
  tableGroup.appendChild(tableLabel);
  tableGroup.appendChild(tableInput);
  form.appendChild(tableGroup);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', closeWithCancel);

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = table ? '保存' : '登録';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const dice = diceInput.value.trim();
    const entries = parseTableEntries(tableInput.value);

    if (!title) {
      alert('タイトルを入力してください。');
      return;
    }
    if (!dice) {
      alert('ダイスを入力してください。');
      return;
    }
    if (Object.keys(entries).length === 0) {
      alert('テーブルを「出目:結果」の形式で1行以上入力してください。');
      return;
    }

    settled = true;
    dialog.close();
    onConfirm({ title, dice, entries, previousTitle: table ? table.title : null });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
