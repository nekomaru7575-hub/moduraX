// js/parameters/dx3-effect-box.js
// DX3の「エフェクト」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// 保存すると即座にonSaveへ新しい配列を渡す。Core側はこの配列の中身を解釈しない。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

const LIMIT_CATEGORIES = ['scenario', 'scene', 'round'];
const LIMIT_CATEGORY_LABELS = {
  scenario: 'シナリオ',
  scene: 'シーン',
  round: 'ラウンド'
};

function defaultLimit() {
  return { current: 0, max: null, ebBonus: false };
}

// エフェクトを「コンボとして使用した場合」の修正値。単体使用時とは別に持つ
// （コンボ側はこれらの値を持たず、選択されたエフェクトの値を合算して使う）。
export const COMBO_MOD_FIELDS = [
  { key: 'checkDice', label: '判定ダイス' },
  { key: 'fixedValue', label: '固定値' },
  { key: 'attackPower', label: '攻撃力修正' },
  { key: 'damageDice', label: 'ダメージダイス' },
  { key: 'criticalMod', label: 'クリティカル修正' },
  { key: 'corruptionGain', label: '上昇侵蝕率' }
];

/**
 * @param {{
 *   effects: Array<{
 *     name:string, level:number, encroach:string, note:string,
 *     limits: Record<'scenario'|'scene'|'round', { current:number, max:number|null, ebBonus:boolean }>
 *   }>,
 *   onSave: (effects: Array<object>) => void
 * }} options
 */
export function showEffectBox({ effects = [], onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'エフェクト一覧';
  form.appendChild(title);

  const listEl = document.createElement('div');
  listEl.className = 'effect-box-list';
  form.appendChild(listEl);

  const rows = [];

  function addRow(effect) {
    const item = document.createElement('div');
    item.className = 'effect-box-item';

    const headerRow = document.createElement('div');
    headerRow.className = 'effect-box-header-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'effect-box-name';
    nameInput.placeholder = 'エフェクト名';
    nameInput.value = effect?.name ?? '';

    // タイミング（メジャー/マイナー/オート等）。コンボ側で「同じタイミングのエフェクトのみ表示」
    // する絞り込みに使うため、JSON読み込み時のeffectNTimingをそのまま文字列として保持する。
    const timingInput = document.createElement('input');
    timingInput.type = 'text';
    timingInput.className = 'effect-box-timing';
    timingInput.placeholder = 'タイミング';
    timingInput.value = effect?.timing ?? '';

    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.className = 'effect-box-level';
    levelInput.placeholder = 'Lv';
    levelInput.value = effect?.level ?? 0;

    const encroachInput = document.createElement('input');
    encroachInput.type = 'text';
    encroachInput.className = 'effect-box-encroach';
    encroachInput.placeholder = '上昇侵蝕率';
    encroachInput.value = effect?.encroach ?? '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      item.remove();
      const idx = rows.findIndex(r => r.item === item);
      if (idx !== -1) rows.splice(idx, 1);
    });

    headerRow.appendChild(nameInput);
    headerRow.appendChild(timingInput);
    headerRow.appendChild(levelInput);
    headerRow.appendChild(encroachInput);
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    const noteInput = document.createElement('textarea');
    noteInput.className = 'effect-box-note';
    noteInput.placeholder = '効果';
    noteInput.rows = 2;
    noteInput.value = effect?.note ?? '';
    item.appendChild(noteInput);

    // 回数制限：シナリオ/シーン/ラウンドそれぞれ独立に「現在/上限」＋EB補正の有無を持てる
    // （例：シナリオ2回とシーン1回を同時に持つエフェクトに対応するため、排他にしない）
    const limitsWrap = document.createElement('div');
    limitsWrap.className = 'effect-box-limits';

    const limitControls = {};
    LIMIT_CATEGORIES.forEach(category => {
      const limitData = effect?.limits?.[category] ?? defaultLimit();

      const limitRow = document.createElement('div');
      limitRow.className = 'effect-box-limit-row';

      const limitLabel = document.createElement('span');
      limitLabel.className = 'effect-box-limit-label';
      limitLabel.textContent = LIMIT_CATEGORY_LABELS[category];
      limitRow.appendChild(limitLabel);

      const currentInput = document.createElement('input');
      currentInput.type = 'number';
      currentInput.className = 'effect-box-limit-current';
      currentInput.min = '0';
      currentInput.value = limitData.current ?? 0;
      limitRow.appendChild(currentInput);

      const slash = document.createElement('span');
      slash.className = 'effect-box-limit-slash';
      slash.textContent = '/';
      limitRow.appendChild(slash);

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.className = 'effect-box-limit-max';
      maxInput.min = '0';
      maxInput.placeholder = '無制限';
      maxInput.value = limitData.max ?? '';
      limitRow.appendChild(maxInput);

      const countSuffix = document.createElement('span');
      countSuffix.textContent = '回';
      limitRow.appendChild(countSuffix);

      const ebLabel = document.createElement('label');
      ebLabel.className = 'effect-box-limit-eb';
      const ebCheckbox = document.createElement('input');
      ebCheckbox.type = 'checkbox';
      ebCheckbox.checked = !!limitData.ebBonus;
      ebLabel.appendChild(ebCheckbox);
      ebLabel.appendChild(document.createTextNode('EB補正'));
      limitRow.appendChild(ebLabel);

      limitsWrap.appendChild(limitRow);
      limitControls[category] = { currentInput, maxInput, ebCheckbox };
    });

    item.appendChild(limitsWrap);

    // コンボ時修正：このエフェクトがコンボへ組み込まれたときの修正値（単体使用時とは別値）
    const comboWrap = document.createElement('div');
    comboWrap.className = 'effect-box-combo-mods';

    const comboTitle = document.createElement('div');
    comboTitle.className = 'effect-box-combo-title';
    comboTitle.textContent = 'コンボ時修正';
    comboWrap.appendChild(comboTitle);

    const comboRow = document.createElement('div');
    comboRow.className = 'effect-box-combo-row';

    const comboControls = {};
    COMBO_MOD_FIELDS.forEach(({ key, label }) => {
      const field = document.createElement('div');
      field.className = 'effect-box-combo-field';

      const fieldLabel = document.createElement('span');
      fieldLabel.className = 'effect-box-combo-label';
      fieldLabel.textContent = label;

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'effect-box-combo-input';
      input.value = effect?.combo?.[key] ?? 0;

      field.appendChild(fieldLabel);
      field.appendChild(input);
      comboRow.appendChild(field);

      comboControls[key] = input;
    });

    comboWrap.appendChild(comboRow);
    item.appendChild(comboWrap);

    listEl.appendChild(item);

    rows.push({ item, nameInput, timingInput, levelInput, encroachInput, noteInput, limitControls, comboControls });
  }

  effects.forEach(addRow);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '+ エフェクトを追加';
  addBtn.addEventListener('click', () => addRow(null));
  form.appendChild(addBtn);

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

    const nextEffects = rows
      .map(row => {
        const limits = {};
        LIMIT_CATEGORIES.forEach(category => {
          const { currentInput, maxInput, ebCheckbox } = row.limitControls[category];
          const rawMax = maxInput.value.trim();
          limits[category] = {
            current: Number(currentInput.value) || 0,
            max: rawMax === '' ? null : (Number(rawMax) || 0),
            ebBonus: ebCheckbox.checked
          };
        });

        const combo = {};
        COMBO_MOD_FIELDS.forEach(({ key }) => {
          combo[key] = Number(row.comboControls[key].value) || 0;
        });

        return {
          name: row.nameInput.value.trim(),
          timing: row.timingInput.value.trim(),
          level: Number(row.levelInput.value) || 0,
          encroach: row.encroachInput.value.trim(),
          note: row.noteInput.value,
          limits,
          combo
        };
      })
      .filter(effect => effect.name !== '');

    dialog.close();
    onSave(nextEffects);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
