// js/deck-dialog.js
// 盤面のカード・デッキを操作する小さなダイアログ2種：裏向きのカードを自分だけ確認する
// 「カードを見る」と、「何枚引くか」の入力。どちらも盤面の右クリックメニューから開く
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
