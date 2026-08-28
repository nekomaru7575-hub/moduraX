// js/audience-picker.js
// 「誰に見せるか」(audience)を選ぶ共通UI。チャットタブの公開先・コマのパラメータの秘匿・
// パネルのテキストの秘匿など、宛先を決める場面すべてで同じ見た目・同じ規則にするための部品。
// audienceの意味づけそのものはjs/visibility.jsを参照。

import { isRestricted } from './visibility.js';
import { createDialogHost } from './dialog-host.js';

/**
 * 公開範囲（全員／選んだ人だけ）と、その宛先チェックリストを組み立てる。
 * 自分は常にオン固定：自分に見えないものを作れてしまうと、後から直す手段が無くなるため。
 *
 * @param {{
 *   audience: string[]|null,
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string|null,
 *   everyoneLabel?: string,
 *   limitedLabel?: string,
 *   showNote?: boolean
 * }} options
 *   showNote: 下部の注意書きを出すか。1つのダイアログにピッカーを複数並べる場面
 *   （情報の表/裏など）で、同じ文言が何度も繰り返されないよう先頭以外を落とすために使う。
 * @returns {{element: HTMLElement, getAudience: () => string[]|null, canRestrict: boolean}}
 */
export function buildAudiencePicker({
  audience, participants, myParticipantId,
  everyoneLabel = '全員に公開',
  limitedLabel = '選んだ参加者だけに公開',
  showNote = true
}) {
  const container = document.createElement('div');

  // 表示名を設定していない（ゲスト）場合、自分を宛先に指定できないため限定公開は作れない
  const canRestrict = !!myParticipantId;

  const scopeList = document.createElement('div');
  scopeList.className = 'dialog-custom-list';
  const scopeName = `audienceScope-${Math.random().toString(36).slice(2)}`;

  function buildScopeRow(labelText, checked, disabled) {
    const row = document.createElement('label');
    row.className = 'dialog-custom-row dialog-check-row';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = scopeName;
    radio.checked = checked;
    radio.disabled = disabled;
    const text = document.createElement('span');
    text.textContent = labelText;
    row.appendChild(radio);
    row.appendChild(text);
    scopeList.appendChild(row);
    return radio;
  }

  const everyoneRadio = buildScopeRow(everyoneLabel, !isRestricted(audience), false);
  const limitedRadio = buildScopeRow(limitedLabel, isRestricted(audience), !canRestrict);
  container.appendChild(scopeList);

  const memberListEl = document.createElement('div');
  memberListEl.className = 'dialog-custom-list';
  container.appendChild(memberListEl);

  const memberChecks = Object.values(participants || {}).map(participant => {
    const row = document.createElement('label');
    row.className = 'dialog-custom-row dialog-check-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const isMe = participant.id === myParticipantId;
    checkbox.checked = isMe || (isRestricted(audience) && audience.includes(participant.id));

    const label = document.createElement('span');
    const tags = [participant.isGm ? 'GM' : null, isMe ? 'あなた' : null].filter(Boolean);
    label.textContent = (participant.nickname || '（名前未設定）')
      + (tags.length > 0 ? `（${tags.join('・')}）` : '');

    row.appendChild(checkbox);
    row.appendChild(label);
    memberListEl.appendChild(row);

    return { id: participant.id, checkbox, isMe };
  });

  const note = document.createElement('p');
  note.className = 'audio-note';
  if (!showNote) {
    note.style.display = 'none';
  } else if (!canRestrict) {
    note.textContent = '公開先を絞るには、ルームメニューの「参加者設定」で表示名を設定してください。';
  } else if (memberChecks.length <= 1) {
    note.textContent = '他の参加者がまだ名乗っていません。相手が「参加者設定」で表示名を入れると、ここに出てきます。';
  } else {
    note.textContent = 'GMにも見せる場合は、GMにもチェックを入れてください（自動では含まれません）。'
      + 'なお現段階の公開先の指定は表示上の制限で、データそのものは全員の画面に配られています。';
  }
  container.appendChild(note);

  function syncEnabled() {
    const limited = limitedRadio.checked;
    memberListEl.style.opacity = limited ? '' : '0.5';
    memberChecks.forEach(({ checkbox, isMe }) => {
      checkbox.disabled = !limited || isMe;
    });
  }
  everyoneRadio.addEventListener('change', syncEnabled);
  limitedRadio.addEventListener('change', syncEnabled);
  syncEnabled();

  return {
    element: container,
    canRestrict,
    getAudience: () => (
      limitedRadio.checked
        ? memberChecks.filter(m => m.checkbox.checked).map(m => m.id)
        : null
    )
  };
}

const ensureDialog = createDialogHost();

/**
 * 宛先だけを決める小さなダイアログ（パラメータ1件・パネルのテキスト等から使う）。
 * @param {{
 *   title: string,
 *   description?: string,
 *   audience: string[]|null,
 *   participants: Record<string, object>,
 *   myParticipantId: string|null,
 *   onConfirm: (audience: string[]|null) => void
 * }} options
 */
export function showAudienceDialog({
  title, description, audience, participants, myParticipantId, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = title;
  form.appendChild(heading);

  if (description) {
    const desc = document.createElement('p');
    desc.className = 'audio-note';
    desc.textContent = description;
    form.appendChild(desc);
  }

  const picker = buildAudiencePicker({ audience, participants, myParticipantId });
  form.appendChild(picker.element);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.className = 'dialog-confirm-btn';
  confirmBtn.textContent = '決定';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    dialog.close();
    onConfirm(picker.getAudience());
  });

  dialog.appendChild(form);
  dialog.showModal();
}
