// js/chat-tab-dialog.js
// チャットタブの追加・公開先の変更ダイアログ。タブ名と「誰に見せるか」(audience)だけを決め、
// storeへの反映は呼び出し側に任せる。公開先の考え方はjs/visibility.js参照。

import { buildAudiencePicker } from './audience-picker.js';

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
 *   mode?: 'create'|'edit',
 *   name?: string,
 *   audience?: string[]|null,
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string|null,
 *   onConfirm: (result: {name: string, audience: string[]|null}) => void
 * }} options
 */
export function showChatTabDialog({
  mode = 'create', name = '', audience = null, participants, myParticipantId, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = mode === 'edit' ? 'チャットタブの公開先' : 'チャットタブを追加';
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
  // 既存タブでは公開先だけを変える（タブ名の変更は現状サポートしていない）
  nameInput.disabled = mode === 'edit';
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // --- 公開先 ---
  const scopeLabel = document.createElement('label');
  scopeLabel.textContent = '公開先';
  scopeLabel.style.display = 'block';
  scopeLabel.style.marginTop = '8px';
  form.appendChild(scopeLabel);

  const picker = buildAudiencePicker({ audience, participants, myParticipantId });
  form.appendChild(picker.element);

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
    onConfirm({ name: trimmedName, audience: picker.getAudience() });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();
}
