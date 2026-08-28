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
//
// 区画にはもう1つ「一部のワードだけ伏せる」というオプションがある（section.masks）。本文で
// 語を範囲選択して「伏せる」と、その場所が目印 {{n}} に置き換わり、伏せ語の一覧へ移る。
// 目印は本文にそのまま見えている——利用者が手で消したり動かしたりできるのが狙いで、
// 対応の付かなくなった伏せ語はstore側（normalizeInfoMasks）で捨てられる。
// 伏せた語そのものはここで直接は書き換えさせない。本文と食い違うと直しようがなくなるので、
// 直したいときは「解除」して選び直してもらう。
// 公開/非公開の状態(revealed)はここでは持たず、送りもしない：編集している間に誰かが語を
// 開いているかもしれず、こちらの古い値で上書きすると開示が巻き戻る（UPDATE_INFO_ENTRY側で
// 引き継ぐ）。

import { buildAudiencePicker } from './audience-picker.js';
import {
  listMaskMarkers, MAX_INFO_MASKS_PER_SECTION, MAX_INFO_MASK_TEXT_LENGTH,
  MAX_INFO_MASK_CHAR_LENGTH, DEFAULT_INFO_MASK_CHAR
} from './game-store.js';
import { createDialogHost } from './dialog-host.js';

// 表示名を設定していない（ゲスト）と作成者IDが付かず、canRevealMasks（js/info-panel.js）で
// 誰も——GMでさえも——中身を見透かせない情報になってしまう。作らせない側で止める。
const MASK_GUEST_REASON = '表示名を設定すると使えます（伏せた語を開ける人がいなくなるため）。';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   mode?: 'create'|'edit',
 *   title?: string,
 *   sections?: Array<{id: string, label: string, body: string, audience: string[]|null,
 *                     masks: Array<{id:number, text:string, mask:string, revealed:boolean}>}>,
 *   participants: Record<string, {id:string, nickname:string, isGm:boolean}>,
 *   myParticipantId: string|null,
 *   onConfirm: (result: {
 *     title: string,
 *     sections: Array<{id: string|null, label: string, body: string, audience: string[]|null,
 *                      masks: Array<{id:number, text:string, mask:string}>}>,
 *     removedSectionIds: string[]
 *   }) => void
 * }} options
 *   結果のsectionのidは、既存の区画ならそのid、新しく足した区画ならnull（採番は呼び出し側）。
 *   removedSectionIdsは、渡されたのに結果に残らなかった区画のid。
 *   masksのidは区画の中だけで一意な正の整数で、本文の目印 {{id}} と対になっている。
 *   bodyとmasksは必ず対で扱うこと（片方だけ渡すと伏せ語が消えるか目印が取り残される）。
 *   revealedは返さない（開示の巻き戻しを避けるため。冒頭のコメント参照）。
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
      audience: section.audience ?? null,
      // revealedは持ち回らない（冒頭のコメント参照）
      masks: (section.masks || []).map(({ id, text, mask }) => ({ id, text, mask })),
      // オプションのON/OFFはこの画面だけの状態。伏せ語が1つでもあれば最初からON。
      masksEnabled: (section.masks || []).length > 0
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
      inputs.syncMasks();
    });
  }

  // 1区画ぶんの「一部のワードだけ伏せる」欄。本文(bodyInput)と伏せ語一覧(row.masks)は
  // 対で動かすので、両方に触れるこの中だけで完結させる。
  // 戻り値のsyncMasksは、伏せ字の入力欄の値をrow.masksへ書き戻す（syncRowsFromDomから呼ぶ）。
  function buildMaskEditor(row, bodyInput) {
    const wrap = document.createElement('div');
    wrap.className = 'info-mask-editor';

    const toggleRow = document.createElement('label');
    toggleRow.className = 'dialog-check-row';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = row.masksEnabled;
    toggle.disabled = !myParticipantId;
    if (!myParticipantId) toggleRow.title = MASK_GUEST_REASON;
    toggleRow.appendChild(toggle);
    toggleRow.appendChild(document.createTextNode('一部のワードだけ伏せる'));
    wrap.appendChild(toggleRow);

    const panel = document.createElement('div');
    panel.className = 'info-mask-editor-panel';
    panel.hidden = !row.masksEnabled;
    wrap.appendChild(panel);

    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'dialog-add-row-btn';
    hideBtn.textContent = '選択した語を伏せる';
    panel.appendChild(hideBtn);

    const listEl = document.createElement('div');
    listEl.className = 'info-mask-editor-list';
    panel.appendChild(listEl);

    // 断った理由はここに出す。卓の最中にalertで手を止めさせない
    const noteEl = document.createElement('p');
    noteEl.className = 'dialog-form-note';
    panel.appendChild(noteEl);
    const note = (text) => { noteEl.textContent = text; };

    let charInputs = [];
    function syncMasks() {
      charInputs.forEach(({ id, input }) => {
        const mask = row.masks.find(m => m.id === id);
        if (mask) mask.mask = input.value;
      });
    }

    // 本文に出てくる順に並べる（伏せ字を見ながら探せるように）。目印を失った伏せ語は
    // store側で捨てられるので、ここでも末尾へ回して目立たせない。
    function orderedMasks() {
      const order = new Map();
      listMaskMarkers(bodyInput.value).forEach((marker, index) => {
        if (!order.has(marker.id)) order.set(marker.id, index);
      });
      return [...row.masks].sort((a, b) => (
        (order.has(a.id) ? order.get(a.id) : Infinity) - (order.has(b.id) ? order.get(b.id) : Infinity)
      ));
    }

    // 目印を本文から取り除き、元の語へ戻す。対応の無い目印はそのまま残す
    // （利用者が手で打った文字を消さないため）。
    function unmask(maskIds) {
      const byId = new Map(row.masks.filter(m => maskIds.has(m.id)).map(m => [m.id, m.text]));
      bodyInput.value = bodyInput.value.replace(/\{\{(\d+)\}\}/g, (all, digits) => {
        const text = byId.get(Number(digits));
        return text === undefined ? all : text;
      });
      row.masks = row.masks.filter(m => !maskIds.has(m.id));
    }

    function renderMaskList() {
      listEl.replaceChildren();
      charInputs = [];

      orderedMasks().forEach(mask => {
        const item = document.createElement('div');
        item.className = 'info-mask-editor-row';

        const marker = document.createElement('span');
        marker.className = 'info-mask-editor-marker';
        marker.textContent = `{{${mask.id}}}`;
        item.appendChild(marker);

        const word = document.createElement('span');
        word.className = 'info-mask-editor-word';
        word.textContent = mask.text;
        item.appendChild(word);

        const charInput = document.createElement('input');
        charInput.type = 'text';
        charInput.className = 'info-mask-editor-char';
        charInput.value = mask.mask;
        charInput.maxLength = MAX_INFO_MASK_CHAR_LENGTH;
        charInput.placeholder = DEFAULT_INFO_MASK_CHAR;
        charInput.title = `伏せ字（例: ${DEFAULT_INFO_MASK_CHAR} ①）。空にすると ${DEFAULT_INFO_MASK_CHAR} になります`;
        item.appendChild(charInput);
        charInputs.push({ id: mask.id, input: charInput });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'dialog-remove-row';
        removeBtn.textContent = '×';
        removeBtn.title = 'この語の伏せ字を解除して本文へ戻す';
        removeBtn.addEventListener('click', () => {
          syncMasks();
          unmask(new Set([mask.id]));
          note('');
          renderMaskList();
        });
        item.appendChild(removeBtn);

        listEl.appendChild(item);
      });
    }

    toggle.addEventListener('change', () => {
      if (!toggle.checked && row.masks.length > 0) {
        if (!confirm('伏せている語をすべて本文へ戻します。よろしいですか？')) {
          toggle.checked = true;
          return;
        }
        syncMasks();
        unmask(new Set(row.masks.map(m => m.id)));
        renderMaskList();
      }
      row.masksEnabled = toggle.checked;
      panel.hidden = !toggle.checked;
      note('');
    });

    hideBtn.addEventListener('click', () => {
      const body = bodyInput.value;
      const start = bodyInput.selectionStart;
      const end = bodyInput.selectionEnd;

      if (start === end) {
        note('本文で伏せたい語を選んでから押してください。');
        return;
      }
      // 目印を部分的に飲み込むと {{1 のような壊れた形になり、元へ戻せなくなる
      if (listMaskMarkers(body).some(marker => start < marker.end && marker.start < end)) {
        note('すでに伏せている場所（{{1}} などの目印）をまたぐ範囲は伏せられません。');
        return;
      }

      // 範囲選択は前後の空白まで掴みやすいので、落としてから伏せる
      const raw = body.slice(start, end);
      const from = start + (raw.length - raw.trimStart().length);
      const to = end - (raw.length - raw.trimEnd().length);
      const text = body.slice(from, to);
      if (text === '') {
        note('本文で伏せたい語を選んでから押してください。');
        return;
      }
      if (row.masks.length >= MAX_INFO_MASKS_PER_SECTION) {
        note(`1つの区画で伏せられるのは${MAX_INFO_MASKS_PER_SECTION}語までです。`);
        return;
      }
      // 切って通すと本文と伏せ語が食い違うので、切らずに断る
      if (text.length > MAX_INFO_MASK_TEXT_LENGTH) {
        note(`一度に伏せられるのは${MAX_INFO_MASK_TEXT_LENGTH}文字までです。`);
        return;
      }

      syncMasks();
      // 採番はここで行う（reducerの中で採ってはいけない）。本文の目印も見るのは、
      // 利用者が手で {{99}} と打っていた場合に番号がぶつからないようにするため。
      const used = [...row.masks.map(m => m.id), ...listMaskMarkers(body).map(m => m.id)];
      const nextId = Math.max(0, ...used) + 1;
      const marker = `{{${nextId}}}`;

      bodyInput.value = body.slice(0, from) + marker + body.slice(to);
      row.masks.push({ id: nextId, text, mask: DEFAULT_INFO_MASK_CHAR });
      note('');
      renderMaskList();

      // カーソルを目印の直後へ戻す。区画ごと描き直さないのは、書きかけの他の欄と
      // スクロール位置を飛ばさないため。
      bodyInput.focus();
      bodyInput.setSelectionRange(from + marker.length, from + marker.length);
    });

    if (!myParticipantId) {
      hideBtn.disabled = true;
      hideBtn.title = MASK_GUEST_REASON;
    }

    renderMaskList();
    return { element: wrap, syncMasks };
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

      const maskEditor = buildMaskEditor(row, bodyInput);
      card.appendChild(maskEditor.element);

      // 注意書きは同じ文言なので先頭の区画にだけ出す
      const picker = buildAudiencePicker({
        audience: row.audience,
        participants,
        myParticipantId,
        showNote: index === 0
      });
      card.appendChild(picker.element);

      listEl.appendChild(card);
      rowInputs.push({ labelInput, bodyInput, picker, syncMasks: maskEditor.syncMasks });
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
      audience: myParticipantId ? [myParticipantId] : null,
      masks: [],
      masksEnabled: false
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
      // bodyとmasksは必ず対で渡す（片方だけだと伏せ語が消えるか、目印が本文に取り残される）
      sections: rows.map(row => ({
        id: row.id,
        label: row.label,
        body: row.body,
        audience: row.audience,
        masks: row.masks.map(mask => ({ id: mask.id, text: mask.text, mask: mask.mask }))
      })),
      removedSectionIds: originalIds.filter(id => !keptIds.has(id))
    });
  });

  renderRows();
  dialog.appendChild(form);
  dialog.showModal();
  titleInput.focus();
}
