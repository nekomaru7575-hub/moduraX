// js/parameters/dx3-effect-box.js
// DX3の「エフェクト」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// 保存すると即座にonSaveへ新しい配列を渡す。Core側はこの配列の中身を解釈しない。

import { analyzeComboModFormula, normalizeComboModFormula, listFormulaNames } from './dx3-formula.js';
import { lockFormControls } from '../read-only-form.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

export const LIMIT_CATEGORIES = ['scenario', 'scene', 'round'];
const LIMIT_CATEGORY_LABELS = {
  scenario: 'シナリオ',
  scene: 'シーン',
  round: 'ラウンド'
};

function defaultLimit() {
  return { current: 0, max: null };
}

// エフェクトを「コンボとして使用した場合」の修正値。単体使用時とは別に持つ
// （コンボ側はこれらの値を持たず、選択されたエフェクトの値を合算して使う）。
// 上昇侵蝕率はヘッダー行の「上昇侵蝕率」欄（effect.encroach）と重複するため、ここには持たない
// （コンボ発動時はeffect.encroachを数値として解釈して使う。dx3-combo-box.js側で処理）。
export const COMBO_MOD_FIELDS = [
  { key: 'checkDice', label: '判定ダイス' },
  { key: 'fixedValue', label: '固定値' },
  { key: 'attackPower', label: '攻撃力修正' },
  { key: 'damageDice', label: 'ダメージダイス' },
  { key: 'criticalMod', label: 'クリティカル修正' }
];

/**
 * @param {{
 *   effects: Array<{
 *     name:string, level:number, encroach:string, note:string,
 *     limits: Record<'scenario'|'scene'|'round', { current:number, max:number|null }>
 *   }>,
 *   parameters?: Record<string, {label?:string, key?:string, value?:number}>,
 *     コンボ時修正の式に書ける{パラメータ名}を検証・提示するために使う（値の評価はしない）。
 *   readOnly?: boolean 他人のコマを表示だけしている時。中身は同じまま入力だけを封じる
 *     （js/character-dialog.jsのcanEdit）。
 *   onSave: (effects: Array<object>) => void
 * }} options
 */
export function showEffectBox({ effects = [], parameters = {}, readOnly = false, onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 式に書ける名前（Lv＋このコマのパラメータのラベル）。入力欄のtitleと注意文で使う。
  const formulaNamesHint = listFormulaNames(parameters).join('、');

  // 入力中の式について、使用時に0になってしまう理由（未知の名前・読めない書式）を1行で返す。
  // 問題が無ければnull。値そのものは評価しない（使用者のバフ状況によって変わるため）。
  function describeFormulaProblem(rawFormula, level) {
    const { unresolvedNames, invalidSyntax, empty } = analyzeComboModFormula(
      { formula: rawFormula },
      {
        effect: { level },
        token: { parameters },
        getEffectiveParameterValue: (token, paramId) => token.parameters[paramId]?.value ?? 0
      }
    );

    if (empty) return null;
    if (unresolvedNames.length > 0) {
      return `「${unresolvedNames.join('」「')}」は式で使える名前ではありません（使える名前: ${formulaNamesHint}）`;
    }
    if (invalidSyntax) {
      return '式として読めません（数値・+ - * / ・( ) と {名前} だけが使えます）';
    }
    return null;
  }

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

    // 回数制限：シナリオ/シーン/ラウンドそれぞれ独立に「現在/上限」を持てる
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

      // 上限は「EB回まで」のようなエフェクトがあるため、数値ではなく式を書けるようにしてある
      // （解決はコンボ時修正と同じdx3-formula.jsのresolveComboModFormula。判定はdx3-combo-box.js）。
      const maxInput = document.createElement('input');
      maxInput.type = 'text';
      maxInput.className = 'effect-box-limit-max';
      maxInput.placeholder = '無制限';
      maxInput.title = '空欄で無制限。数値のほか {EB} / {Lv} などの式も使える（例: {EB}, 1+{Lv}）';
      maxInput.value = limitData.max ?? '';
      limitRow.appendChild(maxInput);

      const countSuffix = document.createElement('span');
      countSuffix.textContent = '回';
      limitRow.appendChild(countSuffix);

      limitsWrap.appendChild(limitRow);
      limitControls[category] = { currentInput, maxInput };
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

      const savedMod = effect?.combo?.[key];

      // 修正値は文字列の式。{Lv}はこのエフェクト自身のレベルへ、{攻撃力}等の任意の
      // パラメータ名は使用者の実効値へ置換したうえで四則演算として評価する
      // （dx3-formula.jsのresolveComboModFormula参照）。旧形式{mode,value}の
      // 保存済みデータもnormalizeComboModFormulaで自動的に式へ変換して表示する。
      const formulaInput = document.createElement('input');
      formulaInput.type = 'text';
      formulaInput.className = 'effect-box-combo-formula';
      formulaInput.placeholder = '例: 3 / {Lv}*2 / {攻撃力}+1';
      formulaInput.title = `使える名前: ${formulaNamesHint}`;
      formulaInput.value = normalizeComboModFormula(savedMod);

      field.appendChild(fieldLabel);
      field.appendChild(formulaInput);

      // クリティカル修正のみ、クリティカル値の下限（このエフェクトが有効な間、修正後の
      // クリティカル値がこれを下回らないようにする値）を追加で持てる。空欄なら下限なし。
      let floorInput = null;
      if (key === 'criticalMod') {
        floorInput = document.createElement('input');
        floorInput.type = 'number';
        floorInput.className = 'effect-box-combo-input effect-box-combo-floor';
        floorInput.placeholder = '下限';
        floorInput.title = 'クリティカル値の下限（空欄で下限なし）';
        floorInput.value = savedMod?.floor ?? '';
        field.appendChild(floorInput);
      }

      comboRow.appendChild(field);

      comboControls[key] = { formulaInput, floorInput };
    });

    comboWrap.appendChild(comboRow);

    // 評価できない式は使用時に黙って0として扱われる（＝バフが付かない）ため、入力した時点で
    // 理由を出す。保存自体はブロックしない（式を後から埋める運用を邪魔しないため）。
    const comboError = document.createElement('div');
    comboError.className = 'effect-box-combo-error';
    comboError.style.display = 'none';
    comboWrap.appendChild(comboError);

    const validateComboMods = () => {
      const level = Number(levelInput.value) || 0;
      const problems = COMBO_MOD_FIELDS
        .map(({ key, label }) => {
          const message = describeFormulaProblem(comboControls[key].formulaInput.value, level);
          return message ? `${label}: ${message}` : null;
        })
        .filter(Boolean);

      comboError.textContent = problems.join('\n');
      comboError.style.display = problems.length > 0 ? '' : 'none';
    };

    COMBO_MOD_FIELDS.forEach(({ key }) => {
      comboControls[key].formulaInput.addEventListener('input', validateComboMods);
    });
    levelInput.addEventListener('input', validateComboMods);
    validateComboMods();

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

  if (readOnly) {
    addBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    cancelBtn.textContent = '閉じる';
    lockFormControls(form, { keep: [cancelBtn] });
  }

  if (!readOnly) form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextEffects = rows
      .map(row => {
        const limits = {};
        LIMIT_CATEGORIES.forEach(category => {
          const { currentInput, maxInput } = row.limitControls[category];
          const rawMax = maxInput.value.trim();
          limits[category] = {
            current: Number(currentInput.value) || 0,
            // 式のまま保存し、使用時に解決する（数値へ丸めると{EB}等が失われるため）
            max: rawMax === '' ? null : rawMax
          };
        });

        const combo = {};
        COMBO_MOD_FIELDS.forEach(({ key }) => {
          const { formulaInput, floorInput } = row.comboControls[key];
          combo[key] = { formula: formulaInput.value.trim() };
          if (floorInput) {
            const rawFloor = floorInput.value.trim();
            combo[key].floor = rawFloor === '' ? null : (Number(rawFloor) || 0);
          }
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
