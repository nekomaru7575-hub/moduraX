// js/info-entry-dialog.js
// 「情報」1件（タイトル・内容・公開先）を入力するダイアログ。storeへの反映は呼び出し側
// （js/info-panel.js）に任せ、ここは入力を集めるだけにする。公開先の考え方はjs/visibility.js参照。
//
// 将来のダブルハンドアウト（表の使命／裏の使命）では、ここが「label＋内容＋公開先」の
// 繰り返し行になる。データ側（infoEntries[].sections）は既にその形なので、増えるのはこの入力UIだけ。

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
 *   title?: string,
 *   body?: string,
 *   audience?: string[]|null,
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string|null,
 *   onConfirm: (result: {title: string, body: string, audience: string[]|null}) => void
 * }} options
 */
export function showInfoEntryDialog({
  mode = 'create', title = '', body = '', audience = null,
  participants, myParticipantId, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = mode === 'edit' ? '情報を編集' : '情報を追加';
  form.appendChild(heading);

  // --- タイトル（タブの見出しになる） ---
  const titleGroup = document.createElement('div');
  titleGroup.className = 'dialog-form-group';
  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'タイトル';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = title;
  titleInput.required = true;
  titleInput.placeholder = '例: 事件の概要';
  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);
  form.appendChild(titleGroup);

  // --- 内容 ---
  const bodyGroup = document.createElement('div');
  bodyGroup.className = 'dialog-form-group';
  const bodyLabel = document.createElement('label');
  bodyLabel.textContent = '内容';
  const bodyInput = document.createElement('textarea');
  bodyInput.rows = 8;
  bodyInput.value = body;
  bodyInput.placeholder = 'このタブに表示する本文';
  bodyGroup.appendChild(bodyLabel);
  bodyGroup.appendChild(bodyInput);
  form.appendChild(bodyGroup);

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
    const trimmedTitle = titleInput.value.trim();
    if (trimmedTitle === '') {
      titleInput.focus();
      return;
    }

    dialog.close();
    onConfirm({ title: trimmedTitle, body: bodyInput.value, audience: picker.getAudience() });
  });

  dialog.appendChild(form);
  dialog.showModal();
  titleInput.focus();
}
