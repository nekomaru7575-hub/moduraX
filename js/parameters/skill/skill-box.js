// js/parameters/skill/skill-box.js
// スキル一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// 見出しも入力欄の構成もspec（js/parameters/skill/skill-model.jsのcreateSkillSpec）から
// 組み立てるので、このファイルはどのシステムの何を編集しているかを知らない。
// 保存すると即座にonSaveへ新しい配列を渡す。Core側はこの配列の中身を解釈しない。
//
// CSSクラスはエフェクトボックス時代の .effect-box-* をそのまま使っている
// （見た目を変えずに中身だけ汎用化するため。改名するなら別の変更として行う）。

import { lockFormControls } from '../../read-only-form.js';
import { analyzeFormula, listFormulaNames, COMPARATORS } from './skill-formula.js';
import { normalizeSkillList, EXPIRE_PHASE_CHOICES } from './skill-model.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * @param {{
 *   spec: object,                createSkillSpecの戻り値
 *   skills: Array<object>,       保存済みの一覧（旧形式でもよい。ここで正規化して表示する）
 *   parameters?: Record<string, {label?:string, key?:string, value?:number}>,
 *     修正の対象に選べるパラメータと、式に書ける{名前}の検証・提示に使う。
 *   readOnly?: boolean           他人のコマを表示だけしている時（js/character-dialog.jsのcanEdit）
 *   onSave: (skills: Array<object>) => void
 * }} options
 */
export function showSkillBox({ spec, skills = [], parameters = {}, readOnly = false, onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 式に書ける名前（specが宣言したフィールド＋このコマのパラメータのラベル）
  const formulaNamesHint = listFormulaNames(spec, parameters).join('、');

  // 入力中の式について、使用時に0になってしまう理由（未知の名前・読めない書式）を1行で返す。
  // 問題が無ければnull。値そのものは評価しない（使用者のバフ状況によって変わるため）。
  function describeFormulaProblem(rawFormula, skillFields) {
    const { unresolvedNames, invalidSyntax, empty } = analyzeFormula(rawFormula, {
      spec,
      skill: { fields: skillFields },
      token: { parameters },
      getEffectiveParameterValue: (token, paramId) => token.parameters[paramId]?.value ?? 0
    });

    if (empty) return null;
    if (unresolvedNames.length > 0) {
      return `「${unresolvedNames.join('」「')}」は式で使える名前ではありません（使える名前: ${formulaNamesHint}）`;
    }
    if (invalidSyntax) {
      return '式として読めません（数値・+ - * / ・( ) と {名前} だけが使えます）';
    }
    return null;
  }

  // 修正の対象に選べるパラメータ。specが宣言した対象を先に、それ以外をその後に並べる
  // （宣言分は「そのシステムで普通に使うもの」なので上に出したい）。
  const declaredParamIds = new Set(spec.modTargets.map(target => target.paramId));
  const otherParams = Object.entries(parameters)
    .filter(([paramId]) => !declaredParamIds.has(paramId))
    .map(([paramId, param]) => ({ paramId, label: param.label || paramId }));

  const form = document.createElement('form');
  form.appendChild(createElement('h3', null, `${spec.noun}一覧`));

  const listEl = createElement('div', 'effect-box-list');
  form.appendChild(listEl);

  const rows = [];

  function addRow(skill) {
    const item = createElement('div', 'effect-box-item');

    // --- 見出し行：名前 ＋ システム固有のフィールド ---
    const headerRow = createElement('div', 'effect-box-header-row');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'effect-box-name';
    nameInput.placeholder = `${spec.noun}名`;
    nameInput.value = skill?.name ?? '';
    headerRow.appendChild(nameInput);

    const fieldInputs = {};
    spec.fields.forEach(field => {
      const input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      input.className = field.className || 'effect-box-timing';
      input.placeholder = field.placeholder || field.label;
      input.title = field.label;
      input.value = skill?.fields?.[field.key] ?? (field.type === 'number' ? 0 : '');
      headerRow.appendChild(input);
      fieldInputs[field.key] = input;
    });

    const removeBtn = createElement('button', 'dialog-remove-row', '×');
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      item.remove();
      const index = rows.findIndex(row => row.item === item);
      if (index !== -1) rows.splice(index, 1);
    });
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    // 式の検証に渡す「今この行に入力されているフィールド値」。{Lv}のように
    // スキル自身のフィールドを参照する式があるため、入力のたびに読み直す。
    const readFieldValues = () => {
      const values = {};
      spec.fields.forEach(field => {
        values[field.key] = field.type === 'number'
          ? (Number(fieldInputs[field.key].value) || 0)
          : fieldInputs[field.key].value;
      });
      return values;
    };

    const noteInput = createElement('textarea', 'effect-box-note');
    noteInput.placeholder = '効果';
    noteInput.rows = 2;
    noteInput.value = skill?.note ?? '';
    item.appendChild(noteInput);

    // --- 効果時間：このスキルが与えるバフがいつ切れるか ---
    const expireField = createElement('div', 'effect-box-combo-field');
    expireField.appendChild(createElement('span', 'effect-box-combo-label', '効果時間'));
    const expireSelect = document.createElement('select');
    EXPIRE_PHASE_CHOICES.forEach(choice => {
      const option = document.createElement('option');
      option.value = choice.key;
      option.textContent = choice.label;
      expireSelect.appendChild(option);
    });
    expireSelect.value = skill?.expirePhase ?? '';
    expireSelect.title = '「（使用時の既定）」は、単体で使うかコンボに組み込むかで自動的に決まります';
    expireField.appendChild(expireSelect);
    item.appendChild(expireField);

    // --- 使用制限：期間ごとの回数 ---
    const limitsWrap = createElement('div', 'effect-box-limits');
    const limitControls = {};
    spec.periods.forEach(period => {
      const limit = skill?.limits?.counts?.[period.key] ?? { current: 0, max: null };

      const limitRow = createElement('div', 'effect-box-limit-row');
      limitRow.appendChild(createElement('span', 'effect-box-limit-label', period.label));

      const currentInput = document.createElement('input');
      currentInput.type = 'number';
      currentInput.className = 'effect-box-limit-current';
      currentInput.min = '0';
      currentInput.value = limit.current ?? 0;
      limitRow.appendChild(currentInput);

      limitRow.appendChild(createElement('span', 'effect-box-limit-slash', '/'));

      // 上限は「EB回まで」のようなスキルがあるため、数値ではなく式を書けるようにしてある
      const maxInput = document.createElement('input');
      maxInput.type = 'text';
      maxInput.className = 'effect-box-limit-max';
      maxInput.placeholder = '無制限';
      maxInput.title = `空欄で無制限。数値のほか式も使える（使える名前: ${formulaNamesHint}）`;
      maxInput.value = limit.max ?? '';
      limitRow.appendChild(maxInput);

      limitRow.appendChild(createElement('span', null, '回'));
      limitsWrap.appendChild(limitRow);
      limitControls[period.key] = { currentInput, maxInput };
    });
    item.appendChild(limitsWrap);

    // --- 使用制限：条件（「〇〇が△以下」）。全て満たさないと使用できない ---
    const conditionsWrap = createElement('div', 'effect-box-limits');
    conditionsWrap.appendChild(createElement('div', 'effect-box-combo-title', '使用条件（すべて満たすと使用できる）'));
    const conditionListEl = createElement('div', 'effect-box-limits');
    conditionsWrap.appendChild(conditionListEl);

    const conditionRows = [];

    function addConditionRow(condition) {
      const row = createElement('div', 'effect-box-limit-row');

      const leftInput = document.createElement('input');
      leftInput.type = 'text';
      leftInput.className = 'effect-box-limit-max';
      leftInput.placeholder = '例: {HP}';
      leftInput.title = `使える名前: ${formulaNamesHint}`;
      leftInput.value = condition?.left ?? '';

      const comparatorSelect = document.createElement('select');
      COMPARATORS.forEach(comparator => {
        const option = document.createElement('option');
        option.value = comparator.key;
        option.textContent = comparator.label;
        comparatorSelect.appendChild(option);
      });
      comparatorSelect.value = condition?.comparator ?? 'lte';

      const rightInput = document.createElement('input');
      rightInput.type = 'text';
      rightInput.className = 'effect-box-limit-max';
      rightInput.placeholder = '例: 10';
      rightInput.title = `使える名前: ${formulaNamesHint}`;
      rightInput.value = condition?.right ?? '';

      const removeConditionBtn = createElement('button', 'dialog-remove-row', '×');
      removeConditionBtn.type = 'button';
      removeConditionBtn.addEventListener('click', () => {
        row.remove();
        const index = conditionRows.findIndex(entry => entry.row === row);
        if (index !== -1) conditionRows.splice(index, 1);
        validate();
      });

      row.appendChild(leftInput);
      row.appendChild(comparatorSelect);
      row.appendChild(rightInput);
      row.appendChild(removeConditionBtn);
      conditionListEl.appendChild(row);

      [leftInput, rightInput].forEach(input => input.addEventListener('input', validate));
      conditionRows.push({ row, leftInput, comparatorSelect, rightInput });
    }

    (skill?.limits?.conditions ?? []).forEach(addConditionRow);

    const addConditionBtn = createElement('button', 'dialog-add-row-btn', '+ 使用条件を追加');
    addConditionBtn.type = 'button';
    addConditionBtn.addEventListener('click', () => addConditionRow(null));
    conditionsWrap.appendChild(addConditionBtn);
    item.appendChild(conditionsWrap);

    // --- 使用時の修正：対象パラメータ＋式。何件でも持てる ---
    const modsWrap = createElement('div', 'effect-box-combo-mods');
    modsWrap.appendChild(createElement('div', 'effect-box-combo-title', '使用時の修正（自身に付与）'));
    const modListEl = createElement('div', 'effect-box-limits');
    modsWrap.appendChild(modListEl);

    const modRows = [];

    function addModRow(mod) {
      const row = createElement('div', 'effect-box-limit-row');

      const targetSelect = document.createElement('select');
      const noneOption = document.createElement('option');
      noneOption.value = '';
      noneOption.textContent = '（対象なし）';
      targetSelect.appendChild(noneOption);

      const appendOptions = (groupLabel, entries) => {
        if (entries.length === 0) return;
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        entries.forEach(({ paramId, label }) => {
          const option = document.createElement('option');
          option.value = paramId;
          option.textContent = label;
          group.appendChild(option);
        });
        targetSelect.appendChild(group);
      };
      appendOptions(`${spec.noun}の修正値`, spec.modTargets.map(t => ({ paramId: t.paramId, label: t.label })));
      appendOptions('その他のパラメータ', otherParams);
      targetSelect.value = mod?.paramId ?? '';

      const formulaInput = document.createElement('input');
      formulaInput.type = 'text';
      formulaInput.className = 'effect-box-combo-formula';
      formulaInput.placeholder = '例: 3 / {Lv}*2';
      formulaInput.title = `使える名前: ${formulaNamesHint}`;
      formulaInput.value = mod?.formula ?? '';

      // 追加欄（DX3のクリティカル値下限）は、宣言のある対象を選んだときだけ出す
      const extraInput = document.createElement('input');
      extraInput.type = 'number';
      extraInput.className = 'effect-box-combo-input';

      const syncExtra = () => {
        const modTarget = spec.findModTarget(targetSelect.value);
        if (modTarget?.extra) {
          extraInput.style.display = '';
          extraInput.placeholder = modTarget.extra.label;
          extraInput.title = modTarget.extra.hint || modTarget.extra.label;
        } else {
          extraInput.style.display = 'none';
          // 対象を切り替えたときに、前の対象で入れた値が残って保存されないようにする
          extraInput.value = '';
        }
      };
      const initialTarget = spec.findModTarget(mod?.paramId ?? '');
      if (initialTarget?.extra) {
        const value = mod?.extra?.[initialTarget.extra.key];
        if (Number.isFinite(value)) extraInput.value = value;
      }
      syncExtra();

      const removeModBtn = createElement('button', 'dialog-remove-row', '×');
      removeModBtn.type = 'button';
      removeModBtn.addEventListener('click', () => {
        row.remove();
        const index = modRows.findIndex(entry => entry.row === row);
        if (index !== -1) modRows.splice(index, 1);
        validate();
      });

      row.appendChild(targetSelect);
      row.appendChild(formulaInput);
      row.appendChild(extraInput);
      row.appendChild(removeModBtn);
      modListEl.appendChild(row);

      targetSelect.addEventListener('change', syncExtra);
      formulaInput.addEventListener('input', validate);
      modRows.push({ row, targetSelect, formulaInput, extraInput });
    }

    (skill?.mods ?? []).forEach(addModRow);

    const addModBtn = createElement('button', 'dialog-add-row-btn', '+ 修正を追加');
    addModBtn.type = 'button';
    addModBtn.addEventListener('click', () => addModRow(null));
    modsWrap.appendChild(addModBtn);

    // 評価できない式は使用時に黙って0として扱われる（＝バフが付かない）ため、入力した時点で
    // 理由を出す。保存自体はブロックしない（式を後から埋める運用を邪魔しないため）。
    const errorEl = createElement('div', 'effect-box-combo-error');
    errorEl.style.display = 'none';
    modsWrap.appendChild(errorEl);
    item.appendChild(modsWrap);

    function validate() {
      const fieldValues = readFieldValues();
      const problems = [];

      modRows.forEach(({ targetSelect, formulaInput }) => {
        const message = describeFormulaProblem(formulaInput.value, fieldValues);
        if (!message) return;
        const label = spec.findModTarget(targetSelect.value)?.label
          ?? parameters[targetSelect.value]?.label
          ?? '修正';
        problems.push(`${label}: ${message}`);
      });

      spec.periods.forEach(period => {
        const message = describeFormulaProblem(limitControls[period.key].maxInput.value, fieldValues);
        if (message) problems.push(`${period.label}の上限: ${message}`);
      });

      conditionRows.forEach(({ leftInput, rightInput }, index) => {
        [leftInput, rightInput].forEach(input => {
          const message = describeFormulaProblem(input.value, fieldValues);
          if (message) problems.push(`使用条件${index + 1}: ${message}`);
        });
      });

      errorEl.textContent = problems.join('\n');
      errorEl.style.display = problems.length > 0 ? '' : 'none';
    }

    spec.periods.forEach(period => {
      limitControls[period.key].maxInput.addEventListener('input', validate);
    });
    // {Lv}のようにフィールドを参照する式があるため、フィールドを直したら検証し直す
    Object.values(fieldInputs).forEach(input => input.addEventListener('input', validate));
    validate();

    listEl.appendChild(item);
    rows.push({ item, nameInput, fieldInputs, noteInput, expireSelect, limitControls, conditionRows, modRows });
  }

  normalizeSkillList(spec, skills).forEach(addRow);

  const addBtn = createElement('button', 'dialog-add-row-btn', `+ ${spec.noun}を追加`);
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => addRow(null));
  form.appendChild(addBtn);

  const btnRow = createElement('div', 'dialog-button-row');
  const cancelBtn = createElement('button', null, 'キャンセル');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => dialog.close());

  const saveBtn = createElement('button', 'dialog-confirm-btn', '保存');
  saveBtn.type = 'submit';

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

    const nextSkills = rows
      .map(row => {
        const fields = {};
        spec.fields.forEach(field => {
          const raw = row.fieldInputs[field.key].value;
          fields[field.key] = field.type === 'number' ? (Number(raw) || 0) : raw.trim();
        });

        const counts = {};
        spec.periods.forEach(period => {
          const { currentInput, maxInput } = row.limitControls[period.key];
          const rawMax = maxInput.value.trim();
          counts[period.key] = {
            current: Number(currentInput.value) || 0,
            // 式のまま保存し、使用時に解決する（数値へ丸めると{EB}等が失われるため）
            max: rawMax === '' ? null : rawMax
          };
        });

        const conditions = row.conditionRows
          .map(({ leftInput, comparatorSelect, rightInput }) => ({
            left: leftInput.value.trim(),
            comparator: comparatorSelect.value,
            right: rightInput.value.trim()
          }))
          .filter(condition => condition.left !== '' || condition.right !== '');

        const mods = row.modRows
          .filter(({ targetSelect }) => targetSelect.value !== '')
          .map(({ targetSelect, formulaInput, extraInput }) => {
            const paramId = targetSelect.value;
            const mod = { paramId, formula: formulaInput.value.trim(), target: 'self', extra: {} };
            const modTarget = spec.findModTarget(paramId);
            if (modTarget?.extra) {
              const rawExtra = extraInput.value.trim();
              if (rawExtra !== '') mod.extra[modTarget.extra.key] = Number(rawExtra) || 0;
            }
            return mod;
          });

        return {
          name: row.nameInput.value.trim(),
          note: row.noteInput.value,
          fields,
          expirePhase: row.expireSelect.value,
          limits: { counts, conditions },
          mods
        };
      })
      .filter(skill => skill.name !== '');

    dialog.close();
    onSave(nextSkills);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
