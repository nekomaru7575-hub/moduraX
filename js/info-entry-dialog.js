// js/info-entry-dialog.js
// 「情報」1件を編集するダイアログ。タイトルと、1つ以上の「区画」（見出し・内容・公開先）を
// 決め、storeへの反映は呼び出し側（js/info-panel.js）に任せる。
// 公開先の考え方はjs/visibility.js参照。
//
// 区画を2つに分けると、シノビガミ／インセインのダブルハンドアウトのように、1つのタブの中で
// 「表＝全員に公開」「裏＝選んだ人だけに公開」を同居させられる。区画ごとに公開先を持つのが
// この機能の要で、見えない区画は相手の画面に痕跡ごと出ない。
//
// 見えない区画はそもそもここへ渡ってこない（呼び出し側が自分に見えるものだけを渡す）。
// 結果に出てくるのも渡された区画だけなので、GMが「裏が見えないまま表を直す」ことはできても、
// 見えない裏を消してしまうことはない。

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
 *   sections?: Array<{id: string, label: string, body: string, audience: string[]|null}>,
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string|null,
 *   onConfirm: (result: {
 *     title: string,
 *     sections: Array<{id: string|null, label: string, body: string, audience: string[]|null}>,
 *     removedSectionIds: string[]
 *   }) => void
 * }} options
 *   結果のsectionのidは、既存の区画ならそのid、新しく足した区画ならnull（採番は呼び出し側）。
 *   removedSectionIdsは、渡されたのに結果に残らなかった区画のid。
 */
export function showInfoEntryDialog({
  mode = 'create', title = '', sections = [],
  participants, myParticipantId, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 編集中の値はこの配列だけが持つ。区画の追加・削除では作り直すので、作り直す前に
  // 入力欄の内容をここへ書き戻す（書きかけが消えないように）。
  const rows = (sections.length > 0 ? sections : [{ id: null, label: '', body: '', audience: null }])
    .map(section => ({
      id: section.id ?? null,
      label: section.label || '',
      body: section.body || '',
      audience: section.audience ?? null
    }));
  const originalIds = rows.map(row => row.id).filter(id => id !== null);

  // 入力欄との対応（rowsと同じ並び）。syncRowsFromDom()で値を吸い上げる。
  let rowInputs = [];

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

  // --- 区画（1つなら普通のメモ、2つに分ければ表／裏） ---
  const sectionsLabel = document.createElement('label');
  sectionsLabel.textContent = '区画';
  sectionsLabel.style.display = 'block';
  sectionsLabel.style.marginTop = '8px';
  form.appendChild(sectionsLabel);

  const listEl = document.createElement('div');
  listEl.className = 'info-section-editor-list';
  form.appendChild(listEl);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '＋ 区画を追加（表／裏を分ける）';
  form.appendChild(addBtn);

  function syncRowsFromDom() {
    rowInputs.forEach((inputs, index) => {
      rows[index].label = inputs.labelInput.value;
      rows[index].body = inputs.bodyInput.value;
      rows[index].audience = inputs.picker.getAudience();
    });
  }

  function renderRows() {
    listEl.innerHTML = '';
    rowInputs = [];

    rows.forEach((row, index) => {
      const card = document.createElement('div');
      card.className = 'info-section-editor';

      const head = document.createElement('div');
      head.className = 'info-section-editor-head';

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'info-section-editor-label';
      labelInput.value = row.label;
      labelInput.placeholder = '見出し（例: 表 / 裏）';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'dialog-remove-row';
      removeBtn.textContent = '×';
      // 最後の1つは消せない：区画が0個の情報は誰にも見えず、消すこともできなくなる
      removeBtn.disabled = rows.length <= 1;
      removeBtn.title = rows.length <= 1 ? '区画は1つ以上必要です' : 'この区画を削除';
      removeBtn.addEventListener('click', () => {
        if (rows.length <= 1) return;
        syncRowsFromDom();
        rows.splice(index, 1);
        renderRows();
      });

      head.appendChild(labelInput);
      head.appendChild(removeBtn);
      card.appendChild(head);

      const bodyInput = document.createElement('textarea');
      bodyInput.rows = 5;
      bodyInput.value = row.body;
      bodyInput.placeholder = 'この区画に表示する本文';
      card.appendChild(bodyInput);

      // 注意書きは同じ文言なので先頭の区画にだけ出す
      const picker = buildAudiencePicker({
        audience: row.audience,
        participants,
        myParticipantId,
        showNote: index === 0
      });
      card.appendChild(picker.element);

      listEl.appendChild(card);
      rowInputs.push({ labelInput, bodyInput, picker });
    });
  }

  addBtn.addEventListener('click', () => {
    syncRowsFromDom();

    // 見出しが1つも付いていない状態から2つ目を足すのは、たいてい表／裏に分けたいとき。
    // 既定の見出しを入れておく（もちろん書き換えられる）。
    if (rows.length === 1 && rows.every(row => row.label.trim() === '')) {
      rows[0].label = '表';
    }
    const defaultLabel = (rows.length === 1 && rows[0].label.trim() === '表') ? '裏' : '';

    rows.push({
      id: null,
      label: defaultLabel,
      body: '',
      // 区画を分ける目的はたいてい公開先を変えることなので、既定は限定公開（まず自分だけ）に
      // しておく。広げる方向へ倒さないのはnormalizeAudienceと同じ考え方。
      audience: myParticipantId ? [myParticipantId] : null
    });
    renderRows();
  });

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

    syncRowsFromDom();
    const keptIds = new Set(rows.map(row => row.id).filter(id => id !== null));

    dialog.close();
    onConfirm({
      title: trimmedTitle,
      sections: rows.map(({ id, label, body, audience }) => ({ id, label, body, audience })),
      removedSectionIds: originalIds.filter(id => !keptIds.has(id))
    });
  });

  renderRows();
  dialog.appendChild(form);
  dialog.showModal();
  titleInput.focus();
}
