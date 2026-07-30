// js/chat-tab-dialog.js
// チャットタブの追加・公開先の変更ダイアログ。タブ名と「誰に見せるか」(audience)だけを決め、
// storeへの反映は呼び出し側に任せる。公開先の考え方はjs/visibility.js参照。

import { isRestricted } from './visibility.js';

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

  // 合言葉を設定していない（ゲスト）場合、自分を宛先に指定できないため限定公開は作れない
  const canRestrict = !!myParticipantId;

  const scopeRow = document.createElement('div');
  scopeRow.className = 'dialog-custom-list';

  const everyoneRow = document.createElement('label');
  everyoneRow.className = 'dialog-custom-row dialog-check-row';
  const everyoneRadio = document.createElement('input');
  everyoneRadio.type = 'radio';
  everyoneRadio.name = 'chatTabScope';
  everyoneRadio.checked = !isRestricted(audience);
  const everyoneText = document.createElement('span');
  everyoneText.textContent = '全員に公開';
  everyoneRow.appendChild(everyoneRadio);
  everyoneRow.appendChild(everyoneText);
  scopeRow.appendChild(everyoneRow);

  const limitedRow = document.createElement('label');
  limitedRow.className = 'dialog-custom-row dialog-check-row';
  const limitedRadio = document.createElement('input');
  limitedRadio.type = 'radio';
  limitedRadio.name = 'chatTabScope';
  limitedRadio.checked = isRestricted(audience);
  limitedRadio.disabled = !canRestrict;
  const limitedText = document.createElement('span');
  limitedText.textContent = '選んだ参加者だけに公開';
  limitedRow.appendChild(limitedRadio);
  limitedRow.appendChild(limitedText);
  scopeRow.appendChild(limitedRow);

  form.appendChild(scopeRow);

  // --- 宛先の選択（自分は常に含める） ---
  const memberListEl = document.createElement('div');
  memberListEl.className = 'dialog-custom-list';
  form.appendChild(memberListEl);

  const memberChecks = Object.values(participants || {}).map(participant => {
    const row = document.createElement('label');
    row.className = 'dialog-custom-row dialog-check-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const isMe = participant.id === myParticipantId;
    // 自分が見られないタブを作れてしまうと直す手段が無くなるので、自分は常に固定でオン
    checkbox.checked = isMe || (isRestricted(audience) && audience.includes(participant.id));
    checkbox.disabled = isMe;

    const label = document.createElement('span');
    const tags = [participant.isGm ? 'GM' : null, isMe ? 'あなた' : null].filter(Boolean);
    label.textContent = (participant.nickname || '（名前未設定）')
      + (tags.length > 0 ? `（${tags.join('・')}）` : '');

    row.appendChild(checkbox);
    row.appendChild(label);
    memberListEl.appendChild(row);

    return { id: participant.id, checkbox };
  });

  const note = document.createElement('p');
  note.className = 'audio-note';
  if (!canRestrict) {
    note.textContent = '限定公開のタブを作るには、ルームメニューの「参加者設定」で合言葉を設定してください。';
  } else if (memberChecks.length <= 1) {
    note.textContent = '他の参加者がまだ合言葉を設定していません。相手が「参加者設定」で名乗ると、ここに出てきます。';
  } else {
    note.textContent = 'GMも見るタブにしたい場合は、GMにもチェックを入れてください（自動では含まれません）。'
      + 'なお現段階の限定公開は表示上の制限で、データそのものは全員の画面に配られています。';
  }
  form.appendChild(note);

  function syncMemberListEnabled() {
    const limited = limitedRadio.checked;
    memberListEl.style.opacity = limited ? '' : '0.5';
    memberChecks.forEach(({ id, checkbox }) => {
      checkbox.disabled = !limited || id === myParticipantId;
    });
  }
  everyoneRadio.addEventListener('change', syncMemberListEnabled);
  limitedRadio.addEventListener('change', syncMemberListEnabled);
  syncMemberListEnabled();

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

    const nextAudience = limitedRadio.checked
      ? memberChecks.filter(m => m.checkbox.checked).map(m => m.id)
      : null;

    dialog.close();
    onConfirm({ name: trimmedName, audience: nextAudience });
  });

  dialog.appendChild(form);
  dialog.showModal();
  nameInput.focus();
}
