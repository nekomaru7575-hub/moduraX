// js/parameters/dx3-combo-box.js
// DX3の「コンボ」一覧・編集・実行を行うボックス。コンボは登録済みエフェクトの組み合わせ
// （参照リストのみ）で、各エフェクトが持つ「コンボ時修正」（dx3-effect-box.js側の値）を
// 合算して判定・ダメージロールに使う。
//
// 発動/判定/ダメージの実処理（バフ付与・パラメータ変更・ダイスロール）はこのファイルで
// 完結させる。game-store.jsは parameters/registry.js → dx3.js から参照されるため、
// ここで直接import するとgame-store.js → registry.js → dx3.js → dx3-combo-box.js →
// game-store.js という循環importになってしまう。そのため store操作・rollBCDiceは
// 呼び出し元（board-data-driven.js）からpropsとしてすべて受け取る
// （getComponents/onComponentChangeと同じ流儀）。

import { COMBO_MOD_FIELDS } from './dx3-effect-box.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

// エフェクトの「コンボ時修正」キー → バフの対象パラメータID
const COMBO_PARAM_MAP = {
  checkDice: 'DX3:comboCheckDice',
  fixedValue: 'DX3:comboFixedValue',
  attackPower: 'DX3:comboAttackPower',
  damageDice: 'DX3:comboDamageDice',
  criticalMod: 'DX3:comboCriticalMod'
};

function sumComboMod(effects, key) {
  return effects.reduce((sum, e) => sum + (e.combo?.[key] || 0), 0);
}

// BCDiceの結果テキストは "(コマンド) ＞ 内訳 ＞ 合計" の形。内訳の解釈（クリティカルの
// 展開等）はBCDice(DoubleCross)側に任せ、最後の「＞」より後ろの数値だけを読み取る。
function parseFinalNumber(resultText) {
  const parts = String(resultText).split('＞').map(s => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  const match = last.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function logToMain(dispatch, resultText) {
  dispatch('ADD_CHAT_MESSAGE', {
    tabId: 'main',
    entry: { system: 'コンボ', resultText }
  });
}

/**
 * @param {{
 *   combos: Array<{id:string,name:string,effectNames:string[],abilityParamId:string|null,skillParamId:string|null}>,
 *   effects: Array<object>,
 *   parameters: Record<string, {label:string}>,
 *   tokenId: string,
 *   dispatch: (action:string, payload:object) => void,
 *   getToken: () => object,
 *   getEffectiveParameterValue: (token:object, paramId:string) => number|undefined,
 *   generateBuffId: () => string,
 *   rollBCDice: (system:string, command:string) => Promise<{success:boolean, resultText:string}>,
 *   onSave: (combos: Array<object>) => void,
 *   onSaveEffects: (effects: Array<object>) => void
 * }} options
 */
export function showComboBox({
  combos = [], effects = [], parameters = {}, tokenId,
  dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice,
  onSave, onSaveEffects
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'コンボ一覧';
  form.appendChild(title);

  const note = document.createElement('p');
  note.style.color = '#888';
  note.style.fontSize = '0.8rem';
  note.textContent = '発動/判定/ダメージは保存済みの内容に対して実行されます。エフェクトの選択や能力値/技能値を変えたら、先に保存してください。';
  form.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'effect-box-list';
  form.appendChild(listEl);

  const rows = [];

  // --- 発動/判定/ダメージの実処理 ---

  function activateCombo(combo) {
    const token = getToken();
    if (!token) return;

    const selectedEffects = effects.filter(e => combo.effectNames.includes(e.name));

    // 1. 回数制限のカウント（シナリオ/シーン/ラウンドすべて+1。上限が無いカテゴリも
    //    記録だけはしておく）
    const nextEffects = effects.map(e => {
      if (!combo.effectNames.includes(e.name)) return e;
      const limits = e.limits || {};
      const bump = (cat) => ({ ...(limits[cat] || { current: 0, max: null, ebBonus: false }), current: (limits[cat]?.current || 0) + 1 });
      return { ...e, limits: { scenario: bump('scenario'), scene: bump('scene'), round: bump('round') } };
    });
    onSaveEffects(nextEffects);

    // 2. 上昇侵蝕率：基礎値を永続的に増やす
    const corruptionGain = sumComboMod(selectedEffects, 'corruptionGain');
    if (corruptionGain) {
      const baseCorruption = token.parameters['DX3:corruption']?.value ?? 0;
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: 'DX3:corruption', value: baseCorruption + corruptionGain });
    }

    // 3. 判定ダイス/固定値/攻撃力修正/ダメージダイス/クリティカル修正をバフとして付与
    Object.entries(COMBO_PARAM_MAP).forEach(([key, paramId]) => {
      const delta = sumComboMod(selectedEffects, key);
      if (!delta) return;
      dispatch('ADD_BUFF', {
        tokenId, id: generateBuffId(), name: `コンボ:${combo.name}`, paramId, delta, expirePhase: null, tag: combo.id
      });
    });

    logToMain(dispatch, `コンボ発動: ${combo.name}`);
  }

  async function checkCombo(combo, button) {
    const token = getToken();
    if (!token) return;

    const ability = combo.abilityParamId ? (getEffectiveParameterValue(token, combo.abilityParamId) ?? 0) : 0;
    const checkDice = getEffectiveParameterValue(token, 'DX3:comboCheckDice') ?? 0;
    const db = getEffectiveParameterValue(token, 'DX3:corDB') ?? 0;
    const skill = combo.skillParamId ? (getEffectiveParameterValue(token, combo.skillParamId) ?? 0) : 0;
    const fixedValue = getEffectiveParameterValue(token, 'DX3:comboFixedValue') ?? 0;
    const criticalMod = getEffectiveParameterValue(token, 'DX3:comboCriticalMod') ?? 0;

    const diceCount = Math.max(1, Math.round(ability + checkDice + db));
    const criticalValue = 10 + criticalMod;
    const command = `${diceCount}DX${criticalValue}+${skill}+${fixedValue}`;

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = '判定中...';

    try {
      const { success, resultText } = await rollBCDice('DoubleCross', command);
      if (!success) {
        alert(`コンボ判定に失敗しました: ${resultText}`);
        return;
      }

      logToMain(dispatch, `コンボ判定: ${combo.name}\n${resultText}`);

      const achievement = parseFinalNumber(resultText);
      if (achievement !== null) {
        const bonusDice = Math.ceil(achievement / 10);
        dispatch('ADD_BUFF', {
          tokenId, id: generateBuffId(), name: `コンボ:${combo.name}(達成値ボーナス)`,
          paramId: 'DX3:comboDamageDice', delta: bonusDice, expirePhase: null, tag: combo.id
        });
      }
    } catch (error) {
      alert(`コンボ判定でエラーが発生しました: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  async function damageCombo(combo, button) {
    const token = getToken();
    if (!token) return;

    const damageDice = getEffectiveParameterValue(token, 'DX3:comboDamageDice') ?? 0;
    const attackPower = getEffectiveParameterValue(token, 'DX3:attackPower') ?? 0;
    const attackPowerMod = getEffectiveParameterValue(token, 'DX3:comboAttackPower') ?? 0;

    const diceCount = Math.max(1, Math.round(damageDice));
    const command = `${diceCount}D10+${attackPower}+${attackPowerMod}`;

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'ロール中...';

    try {
      const { success, resultText } = await rollBCDice('DoubleCross', command);
      logToMain(dispatch, `コンボダメージ: ${combo.name}\n${success ? resultText : `エラー: ${resultText}`}`);
    } catch (error) {
      alert(`コンボダメージでエラーが発生しました: ${error.message}`);
    } finally {
      dispatch('REMOVE_BUFFS_BY_TAG', { tokenId, tag: combo.id });
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  // --- 一覧の描画 ---

  function addRow(combo) {
    const savedCombo = {
      id: combo?.id ?? `combo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: combo?.name ?? '',
      effectNames: combo?.effectNames ?? [],
      abilityParamId: combo?.abilityParamId ?? null,
      skillParamId: combo?.skillParamId ?? null
    };

    const item = document.createElement('div');
    item.className = 'effect-box-item';

    const headerRow = document.createElement('div');
    headerRow.className = 'effect-box-header-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'effect-box-name';
    nameInput.placeholder = 'コンボ名';
    nameInput.value = savedCombo.name;

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
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    // エフェクト選択（チェックボックス一覧）
    const effectsWrap = document.createElement('div');
    effectsWrap.className = 'effect-box-limits';
    const effectsLabel = document.createElement('div');
    effectsLabel.className = 'effect-box-combo-title';
    effectsLabel.textContent = '使用するエフェクト';
    effectsWrap.appendChild(effectsLabel);

    const effectCheckboxes = [];
    if (effects.length === 0) {
      const empty = document.createElement('span');
      empty.style.color = '#888';
      empty.style.fontSize = '0.8rem';
      empty.textContent = '（登録済みのエフェクトがありません）';
      effectsWrap.appendChild(empty);
    }
    effects.forEach(effect => {
      const label = document.createElement('label');
      label.className = 'effect-box-limit-eb';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = savedCombo.effectNames.includes(effect.name);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(effect.name));
      effectsWrap.appendChild(label);
      effectCheckboxes.push({ name: effect.name, checkbox });
    });
    item.appendChild(effectsWrap);

    // 使用能力値/技能値
    const selectRow = document.createElement('div');
    selectRow.className = 'effect-box-combo-row';

    function buildParamSelect(selectedId) {
      const select = document.createElement('select');
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '（選択なし）';
      select.appendChild(noneOpt);
      Object.entries(parameters).forEach(([paramId, param]) => {
        const opt = document.createElement('option');
        opt.value = paramId;
        opt.textContent = param.label;
        select.appendChild(opt);
      });
      select.value = selectedId || '';
      return select;
    }

    const abilityField = document.createElement('div');
    abilityField.className = 'effect-box-combo-field';
    const abilityLabel = document.createElement('span');
    abilityLabel.className = 'effect-box-combo-label';
    abilityLabel.textContent = '使用能力値';
    const abilitySelect = buildParamSelect(savedCombo.abilityParamId);
    abilityField.appendChild(abilityLabel);
    abilityField.appendChild(abilitySelect);
    selectRow.appendChild(abilityField);

    const skillField = document.createElement('div');
    skillField.className = 'effect-box-combo-field';
    const skillLabel = document.createElement('span');
    skillLabel.className = 'effect-box-combo-label';
    skillLabel.textContent = '使用技能';
    const skillSelect = buildParamSelect(savedCombo.skillParamId);
    skillField.appendChild(skillLabel);
    skillField.appendChild(skillSelect);
    selectRow.appendChild(skillField);

    item.appendChild(selectRow);

    // 発動/判定/ダメージボタン（保存済みのsavedComboに対して動作する）
    const actionRow = document.createElement('div');
    actionRow.className = 'dialog-button-row';
    actionRow.style.marginTop = '8px';

    const activateBtn = document.createElement('button');
    activateBtn.type = 'button';
    activateBtn.className = 'dialog-add-row-btn';
    activateBtn.textContent = '発動';
    activateBtn.addEventListener('click', () => activateCombo(savedCombo));

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'dialog-add-row-btn';
    checkBtn.textContent = '判定';
    checkBtn.addEventListener('click', () => checkCombo(savedCombo, checkBtn));

    const damageBtn = document.createElement('button');
    damageBtn.type = 'button';
    damageBtn.className = 'dialog-add-row-btn';
    damageBtn.textContent = 'ダメージ';
    damageBtn.addEventListener('click', () => damageCombo(savedCombo, damageBtn));

    actionRow.appendChild(activateBtn);
    actionRow.appendChild(checkBtn);
    actionRow.appendChild(damageBtn);
    item.appendChild(actionRow);

    listEl.appendChild(item);

    rows.push({ item, savedCombo, nameInput, effectCheckboxes, abilitySelect, skillSelect });
  }

  combos.forEach(addRow);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '+ コンボを追加';
  addBtn.addEventListener('click', () => addRow(null));
  form.appendChild(addBtn);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '閉じる';
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

    const nextCombos = rows
      .map(row => ({
        id: row.savedCombo.id,
        name: row.nameInput.value.trim(),
        effectNames: row.effectCheckboxes.filter(c => c.checkbox.checked).map(c => c.name),
        abilityParamId: row.abilitySelect.value || null,
        skillParamId: row.skillSelect.value || null
      }))
      .filter(combo => combo.name !== '');

    // ダイアログは閉じない（保存直後にそのまま発動/判定/ダメージを使えるようにするため）。
    // 発動/判定/ダメージは各行のsavedComboを参照するので、保存内容をその場で反映する。
    nextCombos.forEach(nc => {
      const row = rows.find(r => r.savedCombo.id === nc.id);
      if (row) Object.assign(row.savedCombo, nc);
    });

    onSave(nextCombos);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
