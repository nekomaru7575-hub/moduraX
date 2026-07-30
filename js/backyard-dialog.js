// js/backyard-dialog.js
// バックヤード（盤面からしまったコマの個人保管場所）の一覧ダイアログ。
// 盤面の何もない場所の右クリックメニューから開く（js/board-data-driven.js参照）。
// 「盤面に戻す」は適用を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
// dumbな部品：storeを直接触らず、一覧の取得と戻す操作は呼び出し側から受け取る。

import { DEFAULT_TOKEN_COLOR } from './game-store.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{
 *   getTokens: () => Array<{id:string, name:string, image?:string|null, color?:string, textColor?:string|null}>,
 *   onRestore: (tokenId: string) => void
 * }} options
 *   getTokens は「一覧に出すコマ」を返すゲッター。開いた時点のスナップショットを握ると
 *   戻す操作のたびに古い内容へ巻き戻るため、行の操作後に呼び直して再描画する。
 */
export function showBackyardDialog({ getTokens, onRestore }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const heading = document.createElement('h3');
  heading.textContent = 'バックヤード';
  dialog.appendChild(heading);

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  dialog.appendChild(listEl);

  function renderList() {
    listEl.innerHTML = '';
    const tokens = getTokens();

    if (tokens.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dialog-empty-note';
      empty.textContent = 'バックヤードは空です。';
      listEl.appendChild(empty);
      return;
    }

    tokens.forEach(tokenData => {
      const item = document.createElement('div');
      item.className = 'character-list-item';

      const avatarColumn = document.createElement('div');
      avatarColumn.className = 'character-avatar-column';

      const avatar = document.createElement('div');
      avatar.className = 'character-avatar';
      if (tokenData.image) {
        avatar.style.backgroundImage = `url('${tokenData.image}')`;
      } else {
        avatar.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'character-avatar-name';
      nameSpan.textContent = tokenData.name;
      if (tokenData.textColor) {
        nameSpan.style.color = tokenData.textColor;
      }

      avatarColumn.appendChild(avatar);
      avatarColumn.appendChild(nameSpan);
      item.appendChild(avatarColumn);

      const restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.className = 'dialog-add-row-btn';
      restoreBtn.style.marginBottom = '0';
      restoreBtn.textContent = '盤面に戻す';
      restoreBtn.addEventListener('click', () => {
        onRestore(tokenData.id);
        renderList(); // 戻す操作は即時反映。ダイアログを開いたまま次の操作へ移れるようにする
      });
      item.appendChild(restoreBtn);

      listEl.appendChild(item);
    });
  }

  renderList();

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(closeBtn);
  dialog.appendChild(btnRow);

  dialog.showModal();
}
