// js/deck-dialog.js
// 盤面のカード・デッキを操作する小さなダイアログ3種：裏向きのカードを自分だけ確認する
// 「カードを見る」、「何枚・どこへ引くか」の入力、ストッカー内のカードを別のストッカーか
// 出身デッキへ送る「カードを送る」。いずれも盤面の右クリックメニューから開く
// （js/board-data-driven.js）。
// js/panel-dialog.jsと同じ構え（<dialog>を1枚だけ作って使い回し、結果はonConfirmで返す）。
//
// デッキの作成・一覧・配置はこちらではなく js/deck-list-dialog.js と
// js/deck-editor-dialog.js が持つ（ルームメニューの「デッキ一覧」から開く）。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

function formGroup(labelText, title = '') {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';
  const label = document.createElement('label');
  label.textContent = labelText;
  if (title) label.title = title;
  group.appendChild(label);
  return group;
}

/**
 * 「カードを見る」で表面を自分だけ確認するダイアログ。カードは裏向きのままで、
 * ここに出す内容は他の人の画面には送られない（見たという記録だけが全員へ配られる。
 * js/game-store.jsのMARK_CARD_SEEN）。
 * カード情報（face.info）も出す。表面の一部なので、表を確認する場面では読めるのが自然。
 * @param {{face: {image: string|null, text: string, info: string, color: string|null}}} options
 */
export function showCardPeekDialog({ face }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');
  form.method = 'dialog';

  const heading = document.createElement('h3');
  heading.textContent = 'カードを見る';
  form.appendChild(heading);

  const card = document.createElement('div');
  card.className = 'card-peek';

  const text = document.createElement('span');
  text.className = 'card-peek-text';
  text.textContent = face.text || '';
  if (face.color) text.style.color = face.color;

  // 画像があれば画像、無い／読めないときは文字（盤面の描画と同じ落とし方）。
  // 絵の上に名前は重ねない。
  if (face.image) {
    const img = document.createElement('img');
    img.className = 'card-peek-image';
    img.alt = '';
    img.src = face.image;
    img.addEventListener('error', () => {
      img.style.display = 'none';
      text.style.display = '';
    });
    card.appendChild(img);
    text.style.display = 'none';
  }

  card.appendChild(text);

  form.appendChild(card);

  // カード情報（設定されているカードだけ）
  if (face.info) {
    const info = document.createElement('p');
    info.className = 'card-peek-info';
    info.textContent = face.info;
    form.appendChild(info);
  }

  const note = document.createElement('p');
  note.className = 'dialog-form-note';
  note.textContent = 'この表示はあなたの画面だけです。カードは裏向きのままで、見たことがカードに記録されます。';
  form.appendChild(note);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'submit';
  closeBtn.textContent = '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  btnRow.appendChild(closeBtn);
  form.appendChild(btnRow);

  dialog.appendChild(form);
  dialog.showModal();
}

/**
 * 「何枚・どこへ引くか」の入力ダイアログ。デッキの右クリックメニューの「枚数を指定して引く」
 * から開く。送り先は表側/裏側（盤面へ）とストッカーへの3択（js/board-data-driven.jsの
 * openDeckMenu参照）。ストッカーへ送るときは表/裏の状態を問わない（ストッカーに入っている間は
 * 描画されないため）ので、その2択は排他にする。
 * @param {{
 *   max: number,
 *   stockers: {id: string, label: string}[],
 *   onConfirm: (result: {count: number, destination: 'faceUp'|'faceDown'|'stocker', stockerId: string|null}) => void
 * }} options
 */
export function showDrawCountDialog({ max, stockers, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = '枚数を指定して引く';
  form.appendChild(heading);

  const countGroup = formGroup(`枚数（残り${max}枚）`);
  const countInput = document.createElement('input');
  countInput.type = 'number';
  countInput.min = '1';
  countInput.max = String(max);
  countInput.step = '1';
  countInput.required = true;
  countInput.value = '1';
  countGroup.appendChild(countInput);
  form.appendChild(countGroup);

  // --- 送り先（表側/裏側で盤面へ、またはストッカーへ） ---
  const destGroup = formGroup('送り先');
  const destOptions = [
    { value: 'faceUp', label: '表側' },
    { value: 'faceDown', label: '裏側' },
    { value: 'stocker', label: 'ストッカーへ' }
  ];
  const destRadios = [];
  destOptions.forEach(({ value, label }) => {
    const row = document.createElement('label');
    row.className = 'dialog-radio-row';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'drawDestination';
    radio.value = value;
    if (value === 'faceUp') radio.checked = true;
    if (value === 'stocker' && stockers.length === 0) {
      radio.disabled = true;
      row.title = '使えるストッカーがありません（誰でも使えるか、自分専用のストッカーが対象です）。';
    }
    row.appendChild(radio);
    row.appendChild(document.createTextNode(label));
    destGroup.appendChild(row);
    destRadios.push(radio);
  });
  form.appendChild(destGroup);

  // ストッカー選択（「ストッカーへ」を選んだときだけ出す）
  const stockerGroup = formGroup('送り先のストッカー');
  const stockerSelect = document.createElement('select');
  stockers.forEach(({ id, label }) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    stockerSelect.appendChild(option);
  });
  stockerGroup.appendChild(stockerSelect);
  stockerGroup.style.display = 'none';
  form.appendChild(stockerGroup);

  destRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      stockerGroup.style.display = radio.value === 'stocker' ? '' : 'none';
    });
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '引く';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const count = Math.max(1, Math.min(max, Math.round(Number(countInput.value) || 1)));
    const destination = destRadios.find(radio => radio.checked)?.value || 'faceUp';
    const stockerId = destination === 'stocker' ? stockerSelect.value : null;
    if (destination === 'stocker' && !stockerId) return; // 選べるストッカーが無いのに送ろうとした
    dialog.close();
    onConfirm({ count, destination, stockerId });
  });

  dialog.appendChild(form);
  dialog.showModal();

  countInput.focus();
  countInput.select();
}

/**
 * ストッカー内のカードから送るものをチェックボックスで選び、別のストッカーか出身デッキへ
 * まとめて送る。ストッカーの右クリックメニューの「カードを送る」から開く
 * （js/board-data-driven.js）。出身デッキへ戻せるのはそのカードの出身デッキだけ
 * （他のデッキへは送れない）。
 * @param {{
 *   cards: {id: string, label: string}[],
 *   stockers: {id: string, label: string}[],
 *   onConfirm: (result: {cardIds: string[], destination: 'stocker'|'deck', stockerId: string|null}) => void
 * }} options
 */
export function showStockerSendDialog({ cards, stockers, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = 'カードを送る';
  form.appendChild(heading);

  const listGroup = formGroup('送るカード');
  const list = document.createElement('div');
  list.className = 'dialog-checkbox-list';
  const checkboxes = cards.map(({ id, label }) => {
    const row = document.createElement('label');
    row.className = 'dialog-checkbox-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = id;
    row.appendChild(checkbox);
    row.appendChild(document.createTextNode(label));
    list.appendChild(row);
    return checkbox;
  });
  listGroup.appendChild(list);

  const toggleAllBtn = document.createElement('button');
  toggleAllBtn.type = 'button';
  toggleAllBtn.textContent = 'すべて選択/解除';
  toggleAllBtn.addEventListener('click', () => {
    const allChecked = checkboxes.every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
  });
  listGroup.appendChild(toggleAllBtn);
  form.appendChild(listGroup);

  // --- 送り先（別のストッカーへ、または出身デッキへ戻す） ---
  const destGroup = formGroup('送り先');
  const stockerRow = document.createElement('label');
  stockerRow.className = 'dialog-radio-row';
  const stockerRadio = document.createElement('input');
  stockerRadio.type = 'radio';
  stockerRadio.name = 'stockerSendDestination';
  stockerRadio.value = 'stocker';
  if (stockers.length === 0) {
    stockerRadio.disabled = true;
    stockerRow.title = '送れるストッカーがありません（誰でも使えるか、自分専用のストッカーが対象です）。';
  } else {
    stockerRadio.checked = true;
  }
  stockerRow.appendChild(stockerRadio);
  stockerRow.appendChild(document.createTextNode('別のストッカーへ'));
  destGroup.appendChild(stockerRow);

  const stockerSelect = document.createElement('select');
  stockers.forEach(({ id, label }) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    stockerSelect.appendChild(option);
  });
  stockerSelect.style.display = stockers.length === 0 ? 'none' : '';
  destGroup.appendChild(stockerSelect);

  const deckRow = document.createElement('label');
  deckRow.className = 'dialog-radio-row';
  const deckRadio = document.createElement('input');
  deckRadio.type = 'radio';
  deckRadio.name = 'stockerSendDestination';
  deckRadio.value = 'deck';
  if (stockers.length === 0) deckRadio.checked = true;
  deckRow.appendChild(deckRadio);
  deckRow.appendChild(document.createTextNode('出身デッキへ戻す'));
  destGroup.appendChild(deckRow);

  const deckNote = document.createElement('p');
  deckNote.className = 'dialog-form-note';
  deckNote.textContent = '出身デッキが無い（デッキが削除された等の）カードは、選んでいても送られません。';
  destGroup.appendChild(deckNote);

  form.appendChild(destGroup);

  [stockerRadio, deckRadio].forEach((radio) => {
    radio.addEventListener('change', () => {
      stockerSelect.style.display = (radio.value === 'stocker' && radio.checked && stockers.length > 0) ? '' : 'none';
    });
  });
  stockerSelect.style.display = (stockerRadio.checked && stockers.length > 0) ? '' : 'none';

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '送る';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const cardIds = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    if (cardIds.length === 0) return; // 何も選んでいなければ何もしない（ダイアログは開いたまま）
    const destination = [stockerRadio, deckRadio].find(radio => radio.checked)?.value || 'stocker';
    const stockerId = destination === 'stocker' ? stockerSelect.value : null;
    if (destination === 'stocker' && !stockerId) return;
    dialog.close();
    onConfirm({ cardIds, destination, stockerId });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
