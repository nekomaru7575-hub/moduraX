// js/chat-tab-dialog.js
// チャットタブの追加・公開先の変更ダイアログ。タブ名と「誰に見せるか」(audience)だけを決め、
// storeへの反映は呼び出し側に任せる。公開先の考え方はjs/visibility.js参照。

import { buildAudiencePicker } from './audience-picker.js';
import { createDialogHost } from './dialog-host.js';

const ensureDialog = createDialogHost();

// タブ削除の確認。js/log-clear-dialog.jsのshowLogClearConfirmDialogと同じ構え
// （確認を取るだけで、実際の削除は呼び出し側=onDeleteが行う）。専用の<dialog>を別に持つのは、
// 削除確認を出す時点で設定ダイアログ自体は閉じている（下記deleteBtnのクリック時にdialog.close()する）ため。
let deleteConfirmDialogEl = null;

function ensureDeleteConfirmDialog() {
  if (deleteConfirmDialogEl) return deleteConfirmDialogEl;
  deleteConfirmDialogEl = document.createElement('dialog');
  deleteConfirmDialogEl.className = 'character-dialog';
  document.body.appendChild(deleteConfirmDialogEl);
  return deleteConfirmDialogEl;
}

function confirmChatTabDelete(tabName, onConfirm) {
  const dialog = ensureDeleteConfirmDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');
  form.method = 'dialog';

  const heading = document.createElement('h3');
  heading.textContent = 'タブの削除';
  form.appendChild(heading);

  const message = document.createElement('p');
  message.textContent = `「${tabName}」を削除します。このタブのログも一緒に消え、元に戻せません。よろしいですか？`;
  form.appendChild(message);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  // 「いいえ」はsubmit（form method="dialog"）なので、押すと閉じるだけで何も起きない
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'submit';
  cancelBtn.textContent = 'いいえ';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'dialog-danger-btn';
  confirmBtn.textContent = 'はい';
  confirmBtn.addEventListener('click', () => {
    dialog.close();
    onConfirm();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  dialog.appendChild(form);
  dialog.showModal();
}

/**
 * @param {{
 *   mode?: 'create'|'edit',
 *   name?: string,
 *   audience?: string[]|null,
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string|null,
 *   canDelete?: boolean,
 *   audienceEditable?: boolean,
 *   onConfirm: (result: {name: string, audience: string[]|null}) => void,
 *   onDelete?: () => void
 * }} options
 */
export function showChatTabDialog({
  mode = 'create', name = '', audience = null, participants, myParticipantId,
  canDelete = false, audienceEditable = true, onConfirm, onDelete
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = mode === 'edit' ? 'チャットタブの設定' : 'チャットタブを追加';
  form.appendChild(heading);

  // --- タブ名 ---
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dialog-form-group';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'タブ名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = name;
  nameInput.required = true;
  nameInput.placeholder = '例: 密談';
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // --- 公開先 ---
  // audienceEditable: falseの呼び出し元（Mainタブ）は公開先を変更させない導線しか持たないため、
  // 選択できるのに反映されない（黙って捨てられる）状態を避けるべく、選択UI自体を出さない。
  let picker = null;
  if (audienceEditable) {
    const scopeLabel = document.createElement('label');
    scopeLabel.textContent = '公開先';
    scopeLabel.style.display = 'block';
    scopeLabel.style.marginTop = '8px';
    form.appendChild(scopeLabel);

    picker = buildAudiencePicker({ audience, participants, myParticipantId });
    form.appendChild(picker.element);
  } else {
    const fixedNote = document.createElement('p');
    fixedNote.style.color = '#888';
    fixedNote.style.marginTop = '8px';
    fixedNote.textContent = '公開先: 全員（このタブは常に全員に公開されます）';
    form.appendChild(fixedNote);
  }

  // --- ボタン ---
  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.className = 'dialog-confirm-btn';
  confirmBtn.textContent = mode === 'edit' ? '変更' : '追加';

  btnRow.appendChild(cancelBtn);

  // 削除は既定タブ（Main）では出さない。呼び出し側がcanDelete/onDeleteを渡した時だけ表示する。
  if (mode === 'edit' && canDelete && typeof onDelete === 'function') {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'dialog-danger-btn';
    deleteBtn.textContent = 'タブを削除';
    deleteBtn.addEventListener('click', () => {
      dialog.close();
      confirmChatTabDelete(name, onDelete);
    });
    btnRow.appendChild(deleteBtn);
  }

  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const trimmedName = nameInput.value.trim();
    if (trimmedName === '') {
      nameInput.focus();
      return;
    }

    dialog.close();
    onConfirm({ name: trimmedName, audience: picker ? picker.getAudience() : audience });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();
}
