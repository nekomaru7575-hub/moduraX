// js/scene-list-dialog.js
// 登録済みのシーン（room.scenes）の一覧ダイアログ。ルームメニューの「シーン一覧」から開き、
// ここを起点に作成・遷移・編集・削除を行う。入力画面はscene-dialog.jsが持つ。
//
// シーンは「盤面の見た目（背景・盤面サイズ・パネル）」の保存先で、コマ・チャット・参加者・
// ラウンド進行は含まない。名前をクリックするとその場で遷移する（要件どおり1クリック）。
//
// 【注意】シーンの本文（描写・NPCのセリフ）はGM用のつもりで書かれるが、同期される状態に
// 載るため、その気になればPLもブラウザの開発者ツールから読める。パネルの限定表示や
// 限定公開チャットタブ（js/visibility.js）と同じ性質で、「うっかり見えない」ための仕組み
// であって、読もうとする相手から隠すものではない。
//
// dumbな部品：storeを直接触らず、一覧の取得と各操作は呼び出し側から受け取る。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * 作成・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
 * 呼び出し側は状態を変えたあとこの関数を呼び直せば、最新の一覧で開き直せる。
 *
 * @param {{
 *   scenes: Record<string, {id:string, name:string, text:string, panels:object}>,
 *   onApply: (id: string) => void,
 *   onEdit: (id: string) => void,
 *   onCreate: () => void,
 *   onRemove: (id: string) => void
 * }} options
 */
export function showSceneListDialog({ scenes, onApply, onEdit, onCreate, onRemove }) {
  const dialog = ensureDialog();
  // シーンを作成・削除したあとに開き直す使い方をするため、開いたままのshowModalで例外にならないようにする
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  const container = document.createElement('div');

  const heading = document.createElement('h3');
  heading.textContent = 'シーン一覧';
  container.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = 'シーン名を押すとその場面へ移動します（背景・盤面サイズ・パネルが切り替わります）。'
    + 'コマと、「シーンチェンジで残す」を付けた背景・パネルはそのまま残ります。';
  container.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  container.appendChild(listEl);

  const sceneList = Object.values(scenes || {});

  if (sceneList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだシーンがありません。';
    listEl.appendChild(empty);
  }

  sceneList.forEach(scene => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const nameBtn = document.createElement('button');
    nameBtn.type = 'button';
    nameBtn.className = 'dialog-table-name-btn';
    nameBtn.textContent = scene.name;
    // 遷移は取り消せないので、押す前に何が起きるか分かるようにしておく
    nameBtn.title = 'このシーンへ移動します（「シーンチェンジで残す」を付けたもの以外は置き換わります）';
    nameBtn.addEventListener('click', () => {
      dialog.close();
      onApply(scene.id);
    });
    row.appendChild(nameBtn);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = '編集';
    editBtn.title = '名前・描写・BGMを編集する（盤面は変わりません）';
    editBtn.addEventListener('click', () => {
      dialog.close();
      onEdit(scene.id);
    });
    row.appendChild(editBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      if (!confirm(`シーン「${scene.name}」を削除しますか？`)) return;
      onRemove(scene.id);
    });
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 今の盤面を新しいシーンとして保存';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.addEventListener('click', () => {
    dialog.close();
    onCreate();
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
