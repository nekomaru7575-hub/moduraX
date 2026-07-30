// js/identity-dialog.js
// 参加者設定ダイアログ。表示名と「合言葉」を入力して、この部屋での自分を名乗る。
// 合言葉から参加者ID（公開）と本人確認用トークンを導出する仕組みはjs/local-identity.js側。
// dumbな部品：値の保存・storeへの反映はすべて呼び出し側のコールバックに任せる。

import { isPassphraseIdentityAvailable } from './local-identity.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

function buildFormGroup(labelText, input) {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';
  const label = document.createElement('label');
  label.textContent = labelText;
  group.appendChild(label);
  group.appendChild(input);
  return group;
}

// 参加者一覧。誰がこの部屋を使っているか（＋GMが誰か）を確認でき、GMだけがGMの
// 付け外しと、打ち間違いで増えた参加者の削除を行える。
function buildParticipantList({ participants, myParticipantId, amGm, onSetGm, onRemove, rerender }) {
  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';

  const entries = Object.values(participants || {});
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだ誰も名乗っていません。';
    listEl.appendChild(empty);
    return listEl;
  }

  entries.forEach(participant => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const name = document.createElement('span');
    name.className = 'buff-row-info';
    const isMe = participant.id === myParticipantId;
    const labels = [participant.isGm ? 'GM' : null, isMe ? 'あなた' : null].filter(Boolean);
    name.textContent = (participant.nickname || '（名前未設定）')
      + (labels.length > 0 ? `（${labels.join('・')}）` : '');
    row.appendChild(name);

    if (amGm) {
      const gmBtn = document.createElement('button');
      gmBtn.type = 'button';
      gmBtn.textContent = participant.isGm ? 'GMを外す' : 'GMにする';
      gmBtn.addEventListener('click', () => {
        onSetGm(participant.id, !participant.isGm);
        rerender();
      });
      row.appendChild(gmBtn);

      // 自分自身は消せないようにする（消すとGMの付け外しができなくなり得るため）
      if (!isMe) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'dialog-remove-row';
        removeBtn.textContent = '×';
        removeBtn.title = 'この参加者を一覧から削除';
        removeBtn.addEventListener('click', () => {
          if (!confirm(`「${participant.nickname || '（名前未設定）'}」を参加者一覧から削除しますか？`)) return;
          onRemove(participant.id);
          rerender();
        });
        row.appendChild(removeBtn);
      }
    }

    listEl.appendChild(row);
  });

  return listEl;
}

/**
 * @param {{
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string | null,
 *   nickname: string,
 *   passphrase: string,
 *   onSubmit: (result: {nickname: string, passphrase: string}) => void,
 *   onSetGm: (id: string, isGm: boolean) => void,
 *   onRemove: (id: string) => void
 * }} options
 */
export function showIdentityDialog({
  participants, myParticipantId, nickname, passphrase, onSubmit, onSetGm, onRemove
}) {
  const dialog = ensureDialog();

  function render() {
    dialog.innerHTML = '';

    const form = document.createElement('form');

    const heading = document.createElement('h3');
    heading.textContent = '参加者設定';
    form.appendChild(heading);

    const note = document.createElement('p');
    note.className = 'audio-note';
    note.textContent = '合言葉は「この部屋でのあなた」を決めるものです。同じ合言葉なら、'
      + '別の端末やブラウザから入り直しても同じ参加者として扱われます。'
      + '合言葉自体はこのブラウザの中だけに保存され、他の参加者には見えません。';
    form.appendChild(note);

    const nicknameInput = document.createElement('input');
    nicknameInput.type = 'text';
    nicknameInput.value = nickname || '';
    nicknameInput.placeholder = '例: たろう';
    form.appendChild(buildFormGroup('表示名（他の参加者にも見えます）', nicknameInput));

    const passphraseInput = document.createElement('input');
    passphraseInput.type = 'password';
    passphraseInput.value = passphrase || '';
    passphraseInput.placeholder = '空欄ならゲストとして参加';
    passphraseInput.disabled = !isPassphraseIdentityAvailable();
    form.appendChild(buildFormGroup('合言葉（自分だけが知っている言葉）', passphraseInput));

    if (!isPassphraseIdentityAvailable()) {
      const warn = document.createElement('p');
      warn.className = 'audio-note audio-note-warn';
      warn.textContent = 'この接続では合言葉での識別が使えません（https、またはlocalhostでのみ利用できます）。';
      form.appendChild(warn);
    }

    const amGm = !!(myParticipantId && participants?.[myParticipantId]?.isGm);

    const listLabel = document.createElement('label');
    listLabel.textContent = 'この部屋の参加者';
    listLabel.style.display = 'block';
    listLabel.style.marginTop = '8px';
    form.appendChild(listLabel);

    form.appendChild(buildParticipantList({
      participants, myParticipantId, amGm, onSetGm, onRemove, rerender: render
    }));

    if (!amGm && myParticipantId) {
      const gmNote = document.createElement('p');
      gmNote.className = 'audio-note';
      gmNote.textContent = 'GMの付け外しと参加者の削除はGMだけが行えます。';
      form.appendChild(gmNote);
    }

    const btnRow = document.createElement('div');
    btnRow.className = 'dialog-button-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.addEventListener('click', () => dialog.close());

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'submit';
    confirmBtn.className = 'dialog-confirm-btn';
    confirmBtn.textContent = 'この名前で参加';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    form.appendChild(btnRow);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      dialog.close();
      onSubmit({ nickname: nicknameInput.value.trim(), passphrase: passphraseInput.value.trim() });
    });

    dialog.appendChild(form);
  }

  render();
  if (!dialog.open) dialog.showModal();
}
