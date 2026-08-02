// js/parameters/dx3-lois-box.js
// DX3の「ロイス」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// エフェクト一覧（dx3-effect-box.js）と同じく、保存すると即座にonSaveへ新しい配列を渡し、
// Core側はこの配列の中身を解釈しない（components.loisとして丸ごと保持されるだけ）。
//
// パラメータ「ロイス」の値はこの配列から自動計算される（countActiveLois）。
// 値を直接書き込む経路は無い（DX3:loisはeditable:false）ため、
// game-store.jsのSET_COMPONENT → registry.jsのapplyPluginDerivedParameters →
// dx3.jsのcomputeDX3DerivedParameters という流れで反映される。
//
// 将来「タイタスの昇華」を実装する際は、store操作（dispatch）やダイスロール（rollBCDice）を
// 引数として受け取る形にすること。ここでgame-store.jsを直接importすると
// game-store.js → registry.js → dx3.js → dx3-lois-box.js → game-store.js の
// 循環importになる（dx3-combo-box.js冒頭のコメントと同じ理由）。

// components にロイス一覧を保存するときのキー。
export const LOIS_COMPONENT_KEY = 'lois';

// ロイスは最大7個まで持てる（キャラクターシート側のスロット数とも一致）。
export const LOIS_MAX = 7;

// ロイスの種類。値はキャラクターシート作成ツールのJSON（lois{N}Relation）と同じ表記にしてあり、
// 読み込み時（dx3.jsのimportDX3Lois）にそのまま使える。
export const LOIS_RELATIONS = [
  { value: '', label: '（種類なし）' },
  { value: 'D', label: 'D' },
  { value: 'S', label: 'S' },
  { value: 'E', label: 'E' }
];

const LOIS_RELATION_VALUES = LOIS_RELATIONS.map(r => r.value);

// ------------------------------------------------------------------
// 感情表（仮）。ルールブックの感情表を正確に反映したものではないため、
// 正式な表が確定したらこの2つの配列を差し替えるだけでよい。
// ここを書き換えても保存済みデータは壊れない：ロイスは感情を「文字列」として持つため、
// リストに無い値（旧リストの値・シート読み込みで入ってきた値）は、その行の選択肢として
// 一時的に追加される（buildEmotionSelect参照）。
// ------------------------------------------------------------------
export const LOIS_POSITIVE_EMOTIONS = [
  `傾倒`,`好奇心`,`憧憬`,`尊敬`,`連帯感`,`慈愛`,`感服`,`純愛`,`友情`,`慕情`,
  `同情`,`意志`,`庇護`,`幸福感`,`信頼`,`執着`,`親近感`,`誠意`,`好意`,`有為`,
  `尽力`,`懐旧`,`その他`
];

export const LOIS_NEGATIVE_EMOTIONS = [
  `侮蔑`,`食傷`,`脅威`,`嫉妬`,`悔悟`,`恐怖`,`不安`,`劣等感`,`疎外感`,`恥辱`,`憐憫`,
  `偏愛`,`憎悪`,`隔意`,`嫌悪`,`猜疑心`,`厭気`,`不信感`,`不快感`,`憤懣`,`敵愾心`,`無関心`,`その他`,``,``
];

/**
 * 空のロイス1件。
 * @returns {{relation:string, name:string, emotion:{positive:string,negative:string,dominant:'positive'|'negative'}, state:'lois'|'titus', sublimated:boolean, note:string}}
 */
export function createEmptyLois() {
  return {
    relation: '',
    name: '',
    emotion: { positive: '', negative: '', dominant: 'positive' },
    state: 'lois',
    sublimated: false,
    note: ''
  };
}

/**
 * 保存済み・読み込み済みのロイス1件を、欠けたフィールドを補って正規化する。
 * 途中でデータ形式を足しても古いコマが壊れないよう、読み出しは必ずここを通す。
 */
export function normalizeLois(raw) {
  const base = createEmptyLois();
  if (!raw || typeof raw !== 'object') return base;

  const relation = LOIS_RELATION_VALUES.includes(raw.relation) ? raw.relation : '';
  const state = raw.state === 'titus' ? 'titus' : 'lois';

  return {
    relation,
    name: typeof raw.name === 'string' ? raw.name : '',
    emotion: {
      positive: typeof raw.emotion?.positive === 'string' ? raw.emotion.positive : '',
      negative: typeof raw.emotion?.negative === 'string' ? raw.emotion.negative : '',
      dominant: raw.emotion?.dominant === 'negative' ? 'negative' : 'positive'
    },
    state,
    // 昇華はタイタスだけが持つ状態。ロイスに戻っているデータは昇華なしとして扱う。
    sublimated: state === 'titus' && raw.sublimated === true,
    note: typeof raw.note === 'string' ? raw.note : ''
  };
}

export function normalizeLoisList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.slice(0, LOIS_MAX).map(normalizeLois);
}

/**
 * パラメータ「ロイス」の値。
 * 「D」「E」ではないロイスで、タイタスでないものの数（キャラクターシート側のloisHaveと同じ数え方）。
 * @param {Array<object>} lois components.lois（未設定なら空配列扱い）
 * @returns {number}
 */
export function countActiveLois(lois) {
  if (!Array.isArray(lois)) return 0;
  return lois.filter(entry => {
    const { relation, state } = normalizeLois(entry);
    return relation !== 'D' && relation !== 'E' && state !== 'titus';
  }).length;
}

/** タイタスの数（ボックス上部の集計表示に使う）。 */
function countTitus(lois) {
  if (!Array.isArray(lois)) return 0;
  return lois.filter(entry => normalizeLois(entry).state === 'titus').length;
}

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog lois-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

// 感情のドロップダウン。感情表（仮）に無い値でも、現在の値であれば選択肢として足しておく
// （読み込んだシートの感情や、感情表を差し替える前に保存した値が消えないようにするため）。
function buildEmotionSelect(options, currentValue) {
  const select = document.createElement('select');
  select.className = 'lois-box-emotion-select';

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '（なし）';
  select.appendChild(blank);

  const values = options.includes(currentValue) || !currentValue
    ? options
    : [...options, currentValue];

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = currentValue || '';
  return select;
}

/**
 * @param {{
 *   lois: Array<object>,
 *   onSave: (lois: Array<object>) => void
 * }} options
 */
export function showLoisBox({ lois = [], onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'ロイス一覧';
  form.appendChild(title);

  // 「パラメータ『ロイス』が今いくつになるか」をその場で確認できるようにする。
  // 実際のパラメータへは保存後（SET_COMPONENT経由の自動計算）に反映される。
  const summary = document.createElement('div');
  summary.className = 'lois-box-summary';
  form.appendChild(summary);

  const listEl = document.createElement('div');
  listEl.className = 'lois-box-list';
  form.appendChild(listEl);

  const rows = [];

  // 行の入力から現在のロイス一覧を組み立てる（集計表示と保存の両方で使う）。
  function collectLois() {
    return rows.map(row => ({
      relation: row.relationSelect.value,
      name: row.nameInput.value.trim(),
      emotion: {
        positive: row.positiveSelect.value,
        negative: row.negativeSelect.value,
        dominant: row.negativeRadio.checked ? 'negative' : 'positive'
      },
      state: row.getState(),
      sublimated: row.sublimatedCheckbox.checked && row.getState() === 'titus',
      note: row.noteInput.value
    }));
  }

  // 名前・感情・内容がどれも空の行は、追加したまま埋めなかったものとして保存時に捨てる。
  // 種類やタイタス状態だけを触った行を消してしまわないよう、判定は入力内容のみで行う。
  function hasContent(entry) {
    return entry.name !== ''
      || entry.emotion.positive !== ''
      || entry.emotion.negative !== ''
      || entry.note.trim() !== '';
  }

  // 集計は「保存したらこうなる」数でなければ意味が無いので、捨てる行は数えない
  function refreshSummary() {
    const current = collectLois().filter(hasContent);
    summary.textContent =
      `ロイス ${countActiveLois(current)}／タイタス ${countTitus(current)}（登録 ${current.length} / ${LOIS_MAX}件）`;
  }

  let addBtn = null; // 下で生成。上限に達したら押せなくする
  function refreshAddBtn() {
    if (addBtn) addBtn.disabled = rows.length >= LOIS_MAX;
  }

  function addRow(rawLois) {
    if (rows.length >= LOIS_MAX) return;

    const data = normalizeLois(rawLois);
    // ラジオボタンはname属性でグループが決まるため、行ごとにユニークな名前が必要。
    const groupName = `lois-dominant-${Date.now()}-${rows.length}-${Math.random().toString(36).slice(2, 7)}`;

    const item = document.createElement('div');
    item.className = 'lois-box-item';

    // --- 1段目: 種類・名前・ロイス/タイタス・昇華・削除 ---
    const headerRow = document.createElement('div');
    headerRow.className = 'lois-box-header-row';

    const relationSelect = document.createElement('select');
    relationSelect.className = 'lois-box-relation';
    relationSelect.title = '種類（D・Eはパラメータ「ロイス」の数に含めない）';
    LOIS_RELATIONS.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      relationSelect.appendChild(option);
    });
    relationSelect.value = data.relation;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'lois-box-name';
    nameInput.placeholder = 'ロイスの相手';
    nameInput.value = data.name;

    // ロイス⇔タイタスのトグル。状態は見た目（クラス）ではなくこの変数を正とする。
    let state = data.state;
    const stateBtn = document.createElement('button');
    stateBtn.type = 'button';
    stateBtn.className = 'lois-box-state-toggle';
    stateBtn.title = 'クリックでロイス／タイタスを切り替え';

    const sublimatedLabel = document.createElement('label');
    sublimatedLabel.className = 'lois-box-sublimated';
    const sublimatedCheckbox = document.createElement('input');
    sublimatedCheckbox.type = 'checkbox';
    sublimatedCheckbox.checked = data.sublimated;
    sublimatedLabel.appendChild(sublimatedCheckbox);
    sublimatedLabel.appendChild(document.createTextNode('昇華'));

    // 昇華はタイタスだけが持つ状態。ロイスへ戻したらチェックも外す。
    function syncState() {
      const isTitus = state === 'titus';
      stateBtn.textContent = isTitus ? 'タイタス' : 'ロイス';
      stateBtn.classList.toggle('is-titus', isTitus);
      sublimatedCheckbox.disabled = !isTitus;
      sublimatedLabel.classList.toggle('is-disabled', !isTitus);
      if (!isTitus) sublimatedCheckbox.checked = false;
    }
    stateBtn.addEventListener('click', () => {
      state = state === 'titus' ? 'lois' : 'titus';
      syncState();
      refreshSummary();
    });
    syncState();

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      item.remove();
      const idx = rows.findIndex(r => r.item === item);
      if (idx !== -1) rows.splice(idx, 1);
      refreshSummary();
      refreshAddBtn();
    });

    headerRow.appendChild(relationSelect);
    headerRow.appendChild(nameInput);
    headerRow.appendChild(stateBtn);
    headerRow.appendChild(sublimatedLabel);
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    // --- 2段目: P/N感情。ラジオでどちらが優位かを表す ---
    const emotionRow = document.createElement('div');
    emotionRow.className = 'lois-box-emotion-row';

    const positiveField = document.createElement('div');
    positiveField.className = 'lois-box-emotion-field';
    const positiveRadio = document.createElement('input');
    positiveRadio.type = 'radio';
    positiveRadio.name = groupName;
    positiveRadio.value = 'positive';
    positiveRadio.checked = data.emotion.dominant === 'positive';
    positiveRadio.title = 'P感情が優位';
    const positiveLabel = document.createElement('span');
    positiveLabel.className = 'lois-box-emotion-label';
    positiveLabel.textContent = 'P';
    const positiveSelect = buildEmotionSelect(LOIS_POSITIVE_EMOTIONS, data.emotion.positive);
    positiveField.appendChild(positiveRadio);
    positiveField.appendChild(positiveLabel);
    positiveField.appendChild(positiveSelect);

    const negativeField = document.createElement('div');
    negativeField.className = 'lois-box-emotion-field';
    const negativeRadio = document.createElement('input');
    negativeRadio.type = 'radio';
    negativeRadio.name = groupName;
    negativeRadio.value = 'negative';
    negativeRadio.checked = data.emotion.dominant === 'negative';
    negativeRadio.title = 'N感情が優位';
    const negativeLabel = document.createElement('span');
    negativeLabel.className = 'lois-box-emotion-label';
    negativeLabel.textContent = 'N';
    const negativeSelect = buildEmotionSelect(LOIS_NEGATIVE_EMOTIONS, data.emotion.negative);
    negativeField.appendChild(negativeRadio);
    negativeField.appendChild(negativeLabel);
    negativeField.appendChild(negativeSelect);

    emotionRow.appendChild(positiveField);
    emotionRow.appendChild(negativeField);
    item.appendChild(emotionRow);

    // --- 3段目: 内容（フリーテキスト） ---
    const noteInput = document.createElement('textarea');
    noteInput.className = 'lois-box-note';
    noteInput.placeholder = '内容';
    noteInput.rows = 2;
    noteInput.value = data.note;
    item.appendChild(noteInput);

    // 種類・名前・感情・内容の変更はいずれも集計（＝保存後のパラメータ値）に効くので、
    // その場で数え直す。種類はD/Eの除外に、それ以外は空行かどうかの判定に効く。
    relationSelect.addEventListener('change', refreshSummary);
    nameInput.addEventListener('input', refreshSummary);
    noteInput.addEventListener('input', refreshSummary);
    positiveSelect.addEventListener('change', refreshSummary);
    negativeSelect.addEventListener('change', refreshSummary);

    listEl.appendChild(item);

    rows.push({
      item, relationSelect, nameInput, sublimatedCheckbox, noteInput,
      positiveSelect, negativeSelect, negativeRadio,
      getState: () => state
    });
  }

  normalizeLoisList(lois).forEach(addRow);

  addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '+ ロイスを追加';
  addBtn.addEventListener('click', () => {
    addRow(null);
    refreshSummary();
    refreshAddBtn();
  });
  form.appendChild(addBtn);

  refreshSummary();
  refreshAddBtn();

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '保存';
  saveBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextLois = collectLois().filter(hasContent);

    dialog.close();
    onSave(nextLois);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
