// js/deck-dialog.js
// カードとデッキのダイアログ3種：デッキを盤面に置くとき、「何枚引くか」を決めるとき、
// 裏向きのカードを自分だけ確認するとき（カードを見る）。
// js/panel-dialog.jsと同じ構え（<dialog>を1枚だけ作って使い回し、結果はonConfirmで返す）。
//
// デッキの中身そのものはjs/card-catalog.jsのテンプレートが作る。ここがやるのは
// 「どのテンプレートを、どんな名前と裏面で置くか」を決めることと、札1枚ずつへIDを振ること
// （採番は必ずUI側。reducerで採番すると、同じアクションを実行した各クライアントで
//   別々のIDになってしまう）。
//
// デッキを新規作成するUI（好きなカードを並べて自分のデッキを作る）は今回入れていない。
// 入れるときは、テンプレート選択の代わりに「作った札の配列」をbuildDeckCardsへ渡せばよい。

import { pickAndUploadImage } from './image-upload.js';
import { DECK_TEMPLATES, findDeckTemplate, TRUMP_BACK } from './card-catalog.js';
import { generateCardId } from './game-store.js';

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

// テンプレートが作った札の並びへIDを振る。並びはテンプレートのまま（＝A→K順）で、
// 混ぜるのは配置後の「シャッフル」の役目。
function buildDeckCards(template, { jokers }) {
  return template.build({ jokers }).map(card => ({ id: generateCardId(), face: card.face }));
}

/**
 * デッキを盤面に置くダイアログ。
 * @param {{onConfirm: (result: {
 *   name: string,
 *   back: {image: string|null, color: string|null},
 *   cards: {id: string, face: object}[]
 * }) => void}} options
 */
export function showDeckDialog({ onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = 'デッキを配置';
  form.appendChild(heading);

  // --- 種類（テンプレート） ---
  const templateGroup = formGroup('種類');
  const templateSelect = document.createElement('select');
  DECK_TEMPLATES.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.label;
    templateSelect.appendChild(option);
  });
  templateGroup.appendChild(templateSelect);
  form.appendChild(templateGroup);

  // --- 名前 ---
  const nameGroup = formGroup('デッキ名');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 40;
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // --- ジョーカー ---
  const jokerGroup = document.createElement('div');
  jokerGroup.className = 'dialog-form-group';
  const jokerLabel = document.createElement('label');
  jokerLabel.style.display = 'flex';
  jokerLabel.style.alignItems = 'center';
  jokerLabel.style.gap = '6px';
  jokerLabel.style.cursor = 'pointer';
  const jokerInput = document.createElement('input');
  jokerInput.type = 'checkbox';
  jokerLabel.appendChild(jokerInput);
  jokerLabel.appendChild(document.createTextNode('ジョーカーを2枚入れる'));
  jokerGroup.appendChild(jokerLabel);
  form.appendChild(jokerGroup);

  // --- 裏面画像 ---
  // 既定はカタログが持つ画像（image/trump/card_back.png）。差し替えたいときだけ上げ直す。
  let currentBack = TRUMP_BACK.image;

  const backGroup = formGroup('裏面画像', 'デッキと、そこから裏向きで引いたカードの裏面です。');
  const preview = document.createElement('img');
  preview.className = 'dialog-image-preview';
  preview.style.display = currentBack ? 'block' : 'none';
  if (currentBack) preview.src = currentBack;
  // 画像をまだ用意していない場合は枠だけ消す（カード自体はテキストで描かれる）
  preview.addEventListener('error', () => { preview.style.display = 'none'; });
  backGroup.appendChild(preview);

  const backBtnRow = document.createElement('div');
  backBtnRow.className = 'dialog-custom-row';

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.style.marginBottom = '0';
  pickBtn.addEventListener('click', async () => {
    // R2へ上げてURLだけを状態に持つ（データURLのままだと、札の枚数だけ画像が
    // 部屋データへ積み上がる。js/image-upload.js参照）
    const picked = await pickAndUploadImage({ purpose: 'card' });
    if (!picked) return;
    currentBack = picked.url;
    preview.src = currentBack;
    preview.style.display = 'block';
  });
  backBtnRow.appendChild(pickBtn);

  const defaultBtn = document.createElement('button');
  defaultBtn.type = 'button';
  defaultBtn.textContent = '既定に戻す';
  defaultBtn.className = 'dialog-remove-row';
  defaultBtn.addEventListener('click', () => {
    currentBack = TRUMP_BACK.image;
    preview.src = currentBack;
    preview.style.display = 'block';
  });
  backBtnRow.appendChild(defaultBtn);

  backGroup.appendChild(backBtnRow);
  form.appendChild(backGroup);

  // テンプレートを選び直したら、名前の既定値と「ジョーカー」欄の出し入れを合わせる
  function syncTemplate() {
    const template = findDeckTemplate(templateSelect.value);
    if (!template) return;
    nameInput.placeholder = template.defaultName;
    jokerGroup.style.display = template.jokerOption ? '' : 'none';
  }
  templateSelect.addEventListener('change', syncTemplate);
  syncTemplate();

  // --- ボタン行 ---
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.textContent = '配置';
  confirmBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const template = findDeckTemplate(templateSelect.value);
    if (!template) return;

    const jokers = (template.jokerOption && jokerInput.checked) ? 2 : 0;
    dialog.close();
    onConfirm({
      name: nameInput.value.trim() || template.defaultName,
      back: { image: currentBack, color: null },
      cards: buildDeckCards(template, { jokers })
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
}

/**
 * 「カードを見る」で表面を自分だけ確認するダイアログ。カードは裏向きのままで、
 * ここに出す内容は他の人の画面には送られない（見たという記録だけが全員へ配られる。
 * js/game-store.jsのMARK_CARD_SEEN）。
 * @param {{face: {image: string|null, text: string, color: string|null}}} options
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

  // 画像があれば画像、無い／読めないときは文字（盤面の描画と同じ落とし方）
  if (face.image) {
    const img = document.createElement('img');
    img.className = 'card-peek-image';
    img.alt = '';
    img.src = face.image;
    img.addEventListener('error', () => { img.style.display = 'none'; });
    card.appendChild(img);
  }

  const text = document.createElement('span');
  text.className = 'card-peek-text';
  text.textContent = face.text || '';
  if (face.color) text.style.color = face.color;
  card.appendChild(text);

  form.appendChild(card);

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
 * 「何枚引くか」の入力ダイアログ。デッキの右クリックメニューの「枚数を指定」から開く。
 * @param {{faceUp: boolean, max: number, onConfirm: (count: number) => void}} options
 */
export function showDrawCountDialog({ faceUp, max, onConfirm }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = faceUp ? '表向きで引く' : '裏向きで引く';
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
    dialog.close();
    onConfirm(count);
  });

  dialog.appendChild(form);
  dialog.showModal();

  countInput.focus();
  countInput.select();
}
