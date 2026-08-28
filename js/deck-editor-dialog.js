// js/deck-editor-dialog.js
// デッキ（カードの束）の作成／編集ダイアログ。デッキ一覧（js/deck-list-dialog.js）から開く。
//
// 入力するのは「デッキ名」「裏面画像」と、カードの行。1行＝1種類のカードで、
//   カード名 … 画像が無いときにカードの中央へ出る文字
//   枚数     … そのカードがデッキに何枚入るか（配置のときに枚数ぶんへ展開される）
//   カード情報 … パネルのテキストと同じ役目。表向きのときだけ読める
//   カード画像 … 1枚ずつアップロード。無ければカード名だけのカードになる
//
// タロットのように枚数の多いデッキを1行ずつ作らせるのは現実的でないので、
// 「画像をまとめて追加」で複数ファイルを選んで1画像＝1カードとして流し込める。
//
// 【画像が保存できない環境】
// R2が使えないとき（server/dev-local.js等）、画像はデータURLへ退避する。カードの画像URLは
// 1000文字までしか状態に載らない（js/game-store.jsのnormalizeCardImage）ので、データURLは
// 事実上そこで落ちる。黙って消えると原因が分からないため、その場で断って知らせる。

import { pickFiles } from './file-uploader.js';
import { uploadImageFile, isImageUploadAvailable, pickAndUploadImage } from './image-upload.js';
import { trumpBack } from './card-catalog.js';
import { createDialogHost } from './dialog-host.js';

// 展開後の合計がこれを超えると、配置のときに切られる（js/game-store.jsのMAX_DECK_CARDS）。
// ここで先に知らせて、切られてから気づくのを防ぐ。
const MAX_TOTAL_CARDS = 200;
const MAX_ROWS = 100;

let escHandler = null; // ダイアログ要素は使い回しなので、前回のEscハンドラを外すために保持する
const ensureDialog = createDialogHost();

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
}

// ファイル名から拡張子を落としてカード名の初期値にする（まとめて追加のとき）。
function cardNameFromFile(file) {
  return String(file.name || '').replace(/\.[^.]+$/, '').slice(0, 24);
}

// 画像1枚をこの部屋へ上げる。上げられない環境ではnullを返す（呼び出し側が知らせる）。
async function uploadCardImage(file) {
  if (!await isImageUploadAvailable()) return null;
  try {
    const { url } = await uploadImageFile(file, 'card');
    return url;
  } catch (error) {
    console.warn('[deck-editor] 画像を上げられませんでした:', error.message);
    return null;
  }
}

const NO_IMAGE_NOTE = 'この環境では画像を保存できないため、カード画像は付けられません（カード名だけのカードになります）。';

/**
 * templateを渡すと編集モード、省略すると新規作成。
 * onCancelは一覧へ戻すためのもの（この画面は一覧が自分を閉じてから開くので、
 * 指定が無いと一覧ごと閉じたように見える。js/original-table-dialog.jsと同じ事情）。
 *
 * @param {{
 *   template?: { id: string, name: string, back: object, cards: object[] } | null,
 *   onConfirm: (result: { id: string|null, name: string, back: object, cards: object[] }) => void,
 *   onCancel?: (() => void) | null
 * }} options
 */
export function showDeckEditorDialog({ template = null, onConfirm, onCancel = null }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 入力中の値はこの配列が持ち、DOMは表示だけを受け持つ（行の追加・削除で作り直すため）
  const rows = (template?.cards || []).map(card => ({
    id: card.id || nextRowId(),
    name: card.name || '',
    count: card.count || 1,
    text: card.text || '',
    image: card.image || null
  }));
  if (rows.length === 0) rows.push({ id: nextRowId(), name: '', count: 1, text: '', image: null });

  let currentBack = template ? (template.back?.image ?? null) : trumpBack().image;

  let settled = false;
  function closeWithCancel() {
    if (settled) return;
    settled = true;
    dialog.close();
    if (onCancel) onCancel();
  }

  // Escで閉じたときも一覧へ戻す。<dialog>のcloseイベントはこの環境で発火しないため
  // keydownで自前に見る（js/original-table-dialog.jsと同じ）。
  if (escHandler) dialog.removeEventListener('keydown', escHandler);
  escHandler = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeWithCancel();
  };
  dialog.addEventListener('keydown', escHandler);

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = template ? 'デッキを編集' : 'デッキを作成';
  form.appendChild(heading);

  // --- デッキ名 ---
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dialog-form-group';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'デッキ名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 40;
  nameInput.required = true;
  nameInput.placeholder = '例: タロット';
  nameInput.value = template?.name || '';
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // --- 裏面画像 ---
  const backGroup = document.createElement('div');
  backGroup.className = 'dialog-form-group';
  const backLabel = document.createElement('label');
  backLabel.textContent = '裏面画像';
  backLabel.title = 'デッキと、そこから裏向きで引いたカードの裏面です。';
  backGroup.appendChild(backLabel);

  const backPreview = document.createElement('img');
  backPreview.className = 'dialog-image-preview';
  backPreview.style.display = currentBack ? 'block' : 'none';
  if (currentBack) backPreview.src = currentBack;
  // 画像をまだ用意していない場合は枠だけ消す（カード自体はテキストで描かれる）
  backPreview.addEventListener('error', () => { backPreview.style.display = 'none'; });
  backGroup.appendChild(backPreview);

  const backBtnRow = document.createElement('div');
  backBtnRow.className = 'dialog-custom-row';

  const backPickBtn = document.createElement('button');
  backPickBtn.type = 'button';
  backPickBtn.textContent = '画像を選択';
  backPickBtn.className = 'dialog-add-row-btn';
  backPickBtn.style.marginBottom = '0';
  backPickBtn.addEventListener('click', async () => {
    const picked = await pickAndUploadImage({ purpose: 'card' });
    if (!picked) return;
    // keyがnull＝R2へ上げられずデータURLへ退避した。カードの画像は1000文字までしか
    // 状態に載らないので、ここで断らないと保存後に黙って消える。
    if (!picked.key) {
      alert(NO_IMAGE_NOTE);
      return;
    }
    currentBack = picked.url;
    backPreview.src = currentBack;
    backPreview.style.display = 'block';
  });
  backBtnRow.appendChild(backPickBtn);

  const backDefaultBtn = document.createElement('button');
  backDefaultBtn.type = 'button';
  backDefaultBtn.textContent = '既定に戻す';
  backDefaultBtn.className = 'dialog-remove-row';
  backDefaultBtn.addEventListener('click', () => {
    currentBack = trumpBack().image;
    backPreview.src = currentBack;
    backPreview.style.display = 'block';
  });
  backBtnRow.appendChild(backDefaultBtn);

  backGroup.appendChild(backBtnRow);
  form.appendChild(backGroup);

  // --- カードの行 ---
  const cardsGroup = document.createElement('div');
  cardsGroup.className = 'dialog-form-group';

  const cardsLabel = document.createElement('label');
  cardsLabel.textContent = 'カード';
  cardsGroup.appendChild(cardsLabel);

  const totalNote = document.createElement('p');
  totalNote.className = 'dialog-form-note';
  cardsGroup.appendChild(totalNote);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  cardsGroup.appendChild(listEl);

  function totalCards() {
    return rows.reduce((sum, row) => sum + Math.max(1, Math.round(Number(row.count) || 1)), 0);
  }

  function refreshTotal() {
    const total = totalCards();
    totalNote.textContent = `合計 ${total} 枚（${rows.length} 種類）`;
    // 超えた分は配置のときに切られる。切られてから気づくと原因が分かりにくいので先に出す
    totalNote.classList.toggle('over-limit', total > MAX_TOTAL_CARDS);
    if (total > MAX_TOTAL_CARDS) {
      totalNote.textContent += ` — 1つのデッキに置けるのは${MAX_TOTAL_CARDS}枚までです。超えた分は配置時に切られます。`;
    }
  }

  function buildRow(row) {
    const rowEl = document.createElement('div');
    rowEl.className = 'dialog-custom-row deck-editor-row';

    // 画像（押すと選び直し。プレビューを兼ねる）
    const imageBtn = document.createElement('button');
    imageBtn.type = 'button';
    imageBtn.className = 'deck-editor-thumb';
    imageBtn.title = 'カード画像を選ぶ（未設定ならカード名だけのカードになります）';

    function paintThumb() {
      imageBtn.innerHTML = '';
      if (row.image) {
        const img = document.createElement('img');
        img.src = row.image;
        img.alt = '';
        img.addEventListener('error', () => { imageBtn.textContent = '画像'; });
        imageBtn.appendChild(img);
      } else {
        imageBtn.textContent = '画像';
      }
    }
    paintThumb();

    imageBtn.addEventListener('click', async () => {
      const picked = await pickAndUploadImage({ purpose: 'card' });
      if (!picked) return;
      if (!picked.key) {
        alert(NO_IMAGE_NOTE);
        return;
      }
      row.image = picked.url;
      paintThumb();
    });
    rowEl.appendChild(imageBtn);

    const nameField = document.createElement('input');
    nameField.type = 'text';
    nameField.maxLength = 24;
    nameField.placeholder = 'カード名';
    nameField.value = row.name;
    nameField.addEventListener('input', () => { row.name = nameField.value; });
    rowEl.appendChild(nameField);

    const countField = document.createElement('input');
    countField.type = 'number';
    countField.min = '1';
    countField.max = '99';
    countField.step = '1';
    countField.value = row.count;
    countField.title = 'この種類のカードがデッキに何枚入るか';
    countField.addEventListener('input', () => {
      row.count = countField.value;
      refreshTotal();
    });
    rowEl.appendChild(countField);

    const textField = document.createElement('input');
    textField.type = 'text';
    textField.maxLength = 300;
    textField.placeholder = 'カード情報（表向きのときだけ読めます）';
    textField.value = row.text;
    textField.addEventListener('input', () => { row.text = textField.value; });
    rowEl.appendChild(textField);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = '⧉';
    copyBtn.title = 'この行を複製';
    copyBtn.className = 'dialog-remove-row';
    copyBtn.addEventListener('click', () => {
      if (rows.length >= MAX_ROWS) return;
      const index = rows.indexOf(row);
      rows.splice(index + 1, 0, { ...row, id: nextRowId() });
      renderRows();
    });
    rowEl.appendChild(copyBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = 'この行を削除';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      rows.splice(rows.indexOf(row), 1);
      if (rows.length === 0) rows.push({ id: nextRowId(), name: '', count: 1, text: '', image: null });
      renderRows();
    });
    rowEl.appendChild(removeBtn);

    return rowEl;
  }

  // 行の増減があったときだけ作り直す（入力のたびに作り直すと入力欄から焦点が外れる）
  function renderRows() {
    listEl.innerHTML = '';
    rows.forEach(row => listEl.appendChild(buildRow(row)));
    refreshTotal();
  }
  renderRows();

  const addRow = document.createElement('div');
  addRow.className = 'dialog-custom-row';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '＋ カードを追加';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.style.marginBottom = '0';
  addBtn.addEventListener('click', () => {
    if (rows.length >= MAX_ROWS) {
      alert(`カードの種類は${MAX_ROWS}行までです。`);
      return;
    }
    rows.push({ id: nextRowId(), name: '', count: 1, text: '', image: null });
    renderRows();
  });
  addRow.appendChild(addBtn);

  const bulkBtn = document.createElement('button');
  bulkBtn.type = 'button';
  bulkBtn.textContent = '画像をまとめて追加';
  bulkBtn.className = 'dialog-add-row-btn';
  bulkBtn.style.marginBottom = '0';
  bulkBtn.title = '選んだ画像1枚につきカードを1行足します（カード名はファイル名）。';
  bulkBtn.addEventListener('click', async () => {
    const files = await pickFiles({ accept: 'image/*' });
    if (files.length === 0) return;

    const room = rows.length + files.length > MAX_ROWS ? MAX_ROWS - rows.length : files.length;
    if (room <= 0) {
      alert(`カードの種類は${MAX_ROWS}行までです。`);
      return;
    }

    bulkBtn.disabled = true;
    bulkBtn.textContent = '追加中…';

    let failed = 0;
    // 1枚ずつ順に上げる（まとめて投げるとアップロードの回数制限に引っかかる。
    // server/index.jsの連打の上限を参照）
    for (const file of files.slice(0, room)) {
      const url = await uploadCardImage(file);
      if (!url) failed += 1;
      rows.push({ id: nextRowId(), name: cardNameFromFile(file), count: 1, text: '', image: url });
    }

    bulkBtn.disabled = false;
    bulkBtn.textContent = '画像をまとめて追加';
    renderRows();

    if (failed > 0) alert(`${failed}枚は画像を保存できませんでした。${NO_IMAGE_NOTE}`);
  });
  addRow.appendChild(bulkBtn);

  cardsGroup.appendChild(addRow);
  form.appendChild(cardsGroup);

  // --- ボタン行 ---
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', closeWithCancel);

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '保存';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (settled) return;

    // 名前も画像も無い行は「作りかけの空行」なので保存しない
    const cards = rows
      .filter(row => row.name.trim() || row.image)
      .map(row => ({
        id: row.id,
        name: row.name.trim(),
        count: Math.max(1, Math.min(99, Math.round(Number(row.count) || 1))),
        text: row.text.trim(),
        image: row.image
      }));

    if (cards.length === 0) {
      alert('カードを1枚以上入れてください（カード名か画像のどちらかが要ります）。');
      return;
    }

    settled = true;
    dialog.close();
    onConfirm({
      id: template?.id ?? null,
      name: nameInput.value.trim(),
      back: { image: currentBack, color: null },
      cards
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
