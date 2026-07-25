// js/parameters/dx3-combo-box.js
// DX3の「コンボ」一覧・編集を行うボックス。コンボは登録済みエフェクトの組み合わせ
// （参照リストのみ）で、各エフェクトが持つ「コンボ時修正」（dx3-effect-box.js側の値）を
// 合算して判定・ダメージロールに使う。
//
// 発動/判定/ダメージの実処理（バフ付与・パラメータ変更・ダイスロール）はこのファイルの
// runComboActivate/runComboCheck/runComboDamageが担うが、これらはボタンではなく
// チャットコマンド（combo.awk(コンボ名)/combo.jdm(コンボ名)/combo.dmg(コンボ名)）から
// 実行する。コマンドの解釈はjs/parameters/dx3.jsのhandleDX3ChatCommandが行い、
// js/main.jsのtryHandlePluginChatCommand→js/parameters/registry.jsのhandlePluginChatCommand
// 経由で呼び出される。このボックス自体はコンボの登録・編集と、チャットパレットに
// 貼り付けるための3コマンドのコピーだけを担当する。
// game-store.jsは parameters/registry.js → dx3.js から参照されるため、ここで直接import
// するとgame-store.js → registry.js → dx3.js → dx3-combo-box.js → game-store.js という
// 循環importになってしまう。そのためstore操作・rollBCDiceは、実行系の関数
// （runComboActivate等）の引数として呼び出し元（js/main.js）から受け取る。

import { COMBO_MOD_FIELDS } from './dx3-effect-box.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

// エフェクトの「コンボ時修正」キー → バフの対象パラメータID（DX3の拡張レジスタ、js/parameters/dx3.js参照）
const COMBO_PARAM_MAP = {
  checkDice: 'DX3:AdB',
  fixedValue: 'DX3:AnB',
  attackPower: 'DX3:DaB',
  damageDice: 'DX3:DdB',
  criticalMod: 'DX3:AcB'
};

// コンボ時修正1件分の値。「固定値」はそのまま、「係数」は(エフェクトのLv + EB)に掛けた値を返す
// （例：判定ダイス+レベル×3のような効果テキストに対応するため）。
function comboModContribution(effect, key, eb) {
  const mod = effect.combo?.[key];
  if (!mod) return 0;
  const value = mod.value || 0;
  if (mod.mode === 'coefficient') {
    return value * ((effect.level || 0) + eb);
  }
  return value;
}

function sumComboMod(effects, key, eb) {
  return effects.reduce((sum, e) => sum + comboModContribution(e, key, eb), 0);
}

// 上昇侵蝕率はエフェクト自身の「上昇侵蝕率」欄（encroach）をそのまま使う。
// シート上は「効果参照」等の非数値も入るため、数値化できないものは0として扱う。
function parseEncroachNumber(encroach) {
  const n = Number(encroach);
  return Number.isFinite(n) ? n : 0;
}

// コンボの「使用能力値」「使用技能」プルダウンをそれぞれの種類だけに絞り込むための判定。
// dx3-ability-box.jsのDX3_ABILITY_SKILL_GROUPSと同じ対応関係を、ここでは選択肢の
// フィルタ用に持つ（循環importを避けるため、js/parameters/dx3.js側の定義はimportせず
// このファイル内に必要な分だけ複製する）。
const DX3_ABILITY_KEYS = ['sttTotalBody', 'sttTotalSense', 'sttTotalMind', 'sttTotalSocial'];
const DX3_FIXED_SKILL_KEYS = ['skillMelee', 'skillRanged', 'skillDodge', 'skillProcure', 'skillPercept', 'skillWill', 'skillNegotiate', 'skillRC'];
const DX3_VARIABLE_SKILL_PREFIXES = ['skillArt', 'skillKnow', 'skillRide', 'skillInfo'];

function isDX3AbilityParam(paramId) {
  return DX3_ABILITY_KEYS.some(key => paramId === `DX3:${key}`);
}

function isDX3SkillParam(paramId) {
  if (!paramId.startsWith('DX3:')) return false;
  const key = paramId.slice(4);
  if (DX3_FIXED_SKILL_KEYS.includes(key)) return true;
  return DX3_VARIABLE_SKILL_PREFIXES.some(prefix => key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length)));
}

// タイミングのプルダウンを、DX3のアクション順に近い並びで表示するための優先順位。
// 一覧にない値（シート側の表記ゆれ等）は末尾にそのまま表示する。
const DX3_TIMING_ORDER = ['オート', 'セットアップ', 'メジャー', 'マイナー', 'ジャッジ', 'リアクション', 'インスタント'];

function sortTimings(timings) {
  return [...timings].sort((a, b) => {
    const ia = DX3_TIMING_ORDER.indexOf(a);
    const ib = DX3_TIMING_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ja');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
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

// チャットパレット貼り付け用の3コマンド（発動/判定/ダメージ）を生成する。
// js/parameters/dx3.js側のhandleDX3ChatCommandが同じ書式（combo.awk/combo.jdm/combo.dmg）で解釈する。
export function buildComboChatLines(comboName) {
  return [
    `combo.awk(${comboName})`,
    `combo.jdm(${comboName})`,
    `combo.dmg(${comboName})`
  ];
}

// コンボ一覧から名前（完全一致）でコンボを探す。チャットコマンドがコンボ名から
// 保存済みのコンボデータを引くために使う。
export function findComboByName(combos, name) {
  return combos.find(c => c.name === name) ?? null;
}

// --- 発動/判定/ダメージの実処理。チャットコマンド（combo.awk/combo.jdm/combo.dmg、
// js/parameters/dx3.jsのhandleDX3ChatCommand）から呼び出される。 ---

/**
 * @param {{combo:object, effects:Array<object>, tokenId:string, dispatch:Function,
 *   getToken:Function, getEffectiveParameterValue:Function, generateBuffId:Function,
 *   onSaveEffects:Function}} options
 */
export function runComboActivate({
  combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects
}) {
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

  // 2. 判定ダイス/固定値/攻撃力修正/ダメージダイス/クリティカル修正をバフとして付与
  // 上昇侵蝕率はここでは加算しない（runComboDamageで、ダメージロール後に反映する）。
  // 係数モードの換算に使うEB（DX3:corEB）はここで一度だけ取得する
  const eb = getEffectiveParameterValue(token, 'DX3:corEB') ?? 0;
  Object.entries(COMBO_PARAM_MAP).forEach(([key, paramId]) => {
    const delta = sumComboMod(selectedEffects, key, eb);
    if (!delta) return;
    // バフ名はコンボ名ではなく、このパラメータへ実際に修正を与えたエフェクト名（複数なら" + "区切り）にする。
    const contributingNames = selectedEffects
      .filter(e => comboModContribution(e, key, eb) !== 0)
      .map(e => e.name)
      .join(' + ');
    dispatch('ADD_BUFF', {
      tokenId, id: generateBuffId(), name: contributingNames || combo.name, paramId, delta, expirePhase: 'process', tag: combo.id
    });
  });

  const effectNamesText = selectedEffects.map(e => e.name).join(' + ');
  logToMain(dispatch, effectNamesText
    ? `コンボ発動: ${combo.name}\n${effectNamesText}`
    : `コンボ発動: ${combo.name}`);
}

/**
 * @param {{combo:object, tokenId:string, dispatch:Function, getToken:Function,
 *   getEffectiveParameterValue:Function, generateBuffId:Function, rollBCDice:Function}} options
 */
export async function runComboCheck({
  combo, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice
}) {
  const token = getToken();
  if (!token) return;

  const ability = combo.abilityParamId ? (getEffectiveParameterValue(token, combo.abilityParamId) ?? 0) : 0;
  const checkDice = getEffectiveParameterValue(token, 'DX3:AdB') ?? 0;
  const db = getEffectiveParameterValue(token, 'DX3:corDB') ?? 0;
  const skill = combo.skillParamId ? (getEffectiveParameterValue(token, combo.skillParamId) ?? 0) : 0;
  const fixedValue = getEffectiveParameterValue(token, 'DX3:AnB') ?? 0;
  const criticalMod = getEffectiveParameterValue(token, 'DX3:AcB') ?? 0;

  const diceCount = Math.max(1, Math.round(ability + checkDice + db));
  const criticalValue = 10 + criticalMod;
  const command = `${diceCount}DX${criticalValue}+${skill}+${fixedValue}`;

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
        paramId: 'DX3:DdB', delta: bonusDice, expirePhase: null, tag: combo.id
      });
    }
  } catch (error) {
    alert(`コンボ判定でエラーが発生しました: ${error.message}`);
  }
}

/**
 * @param {{combo:object, effects:Array<object>, tokenId:string, dispatch:Function,
 *   getToken:Function, getEffectiveParameterValue:Function, rollBCDice:Function}} options
 */
export async function runComboDamage({
  combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice
}) {
  const token = getToken();
  if (!token) return;

  const damageDice = getEffectiveParameterValue(token, 'DX3:DdB') ?? 0;
  const attackPower = getEffectiveParameterValue(token, 'DX3:attackPower') ?? 0;
  const attackPowerMod = getEffectiveParameterValue(token, 'DX3:DaB') ?? 0;

  const diceCount = Math.max(1, Math.round(damageDice));
  const command = `${diceCount}D10+${attackPower}+${attackPowerMod}`;

  try {
    const { success, resultText } = await rollBCDice('DoubleCross', command);

    // 上昇侵蝕率：エフェクトの「上昇侵蝕率」欄（encroach）の合計で基礎値を永続的に増やす。
    // ダメージを出した後に反映してほしいという要望のため、発動(runComboActivate)ではなく
    // ここ（ダメージロール後）で加算する。
    const selectedEffects = effects.filter(e => combo.effectNames.includes(e.name));
    const corruptionGain = selectedEffects.reduce((sum, e) => sum + parseEncroachNumber(e.encroach), 0);

    const corruptionText = corruptionGain ? `\n上昇侵蝕率: +${corruptionGain}` : '';
    logToMain(dispatch, `コンボダメージ: ${combo.name}\n${success ? resultText : `エラー: ${resultText}`}${corruptionText}`);

    if (corruptionGain) {
      const baseCorruption = token.parameters['DX3:corruption']?.value ?? 0;
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: 'DX3:corruption', value: baseCorruption + corruptionGain });
    }
  } catch (error) {
    alert(`コンボダメージでエラーが発生しました: ${error.message}`);
  } finally {
    dispatch('REMOVE_BUFFS_BY_TAG', { tokenId, tag: combo.id });
  }
}

/**
 * @param {{
 *   combos: Array<{id:string,name:string,timing:string|null,effectNames:string[],abilityParamId:string|null,skillParamId:string|null}>,
 *   effects: Array<object>,
 *   parameters: Record<string, {label:string}>,
 *   onSave: (combos: Array<object>) => void
 * }} options
 */
export function showComboBox({
  combos = [], effects = [], parameters = {},
  onSave
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
  note.textContent = '発動/判定/ダメージはチャットコマンド（combo.awk(コンボ名)/combo.jdm(コンボ名)/combo.dmg(コンボ名)）から実行します。「コマンドをコピー」で3つのコマンドをコピーし、チャットパレットの編集欄（複数行貼り付け可）に貼り付けてください。保存済みの内容に対して実行されるため、エフェクトの選択や能力値/技能値を変えたら、先に保存してください。';
  form.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'effect-box-list';
  form.appendChild(listEl);

  const rows = [];

  // --- 一覧の描画 ---

  function addRow(combo) {
    const savedCombo = {
      id: combo?.id ?? `combo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: combo?.name ?? '',
      timing: combo?.timing ?? null,
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

    // タイミング（メジャー/マイナー等）。選択すると、下の「使用するエフェクト」を
    // 同じタイミングのものだけに絞り込む。未選択（すべて）の場合は絞り込まない。
    const timingField = document.createElement('div');
    timingField.className = 'effect-box-combo-field';
    const timingLabel = document.createElement('span');
    timingLabel.className = 'effect-box-combo-label';
    timingLabel.textContent = 'タイミング';
    const timingSelect = document.createElement('select');
    const timingAllOpt = document.createElement('option');
    timingAllOpt.value = '';
    timingAllOpt.textContent = '（すべて）';
    timingSelect.appendChild(timingAllOpt);
    const availableTimings = new Set(effects.map(e => e.timing).filter(Boolean));
    if (savedCombo.timing) availableTimings.add(savedCombo.timing);
    sortTimings([...availableTimings]).forEach(timing => {
      const opt = document.createElement('option');
      opt.value = timing;
      opt.textContent = timing;
      timingSelect.appendChild(opt);
    });
    timingSelect.value = savedCombo.timing || '';
    timingField.appendChild(timingLabel);
    timingField.appendChild(timingSelect);
    item.appendChild(timingField);

    // エフェクト選択（チェックボックス一覧）。タイミングで絞り込んでも選択状態自体は
    // checkedEffectNamesに保持し続けるため、絞り込みを変えても既存の選択は失われない。
    const effectsWrap = document.createElement('div');
    effectsWrap.className = 'effect-box-limits';
    const effectsLabel = document.createElement('div');
    effectsLabel.className = 'effect-box-combo-title';
    effectsLabel.textContent = '使用するエフェクト';
    effectsWrap.appendChild(effectsLabel);

    const checkboxListEl = document.createElement('div');
    effectsWrap.appendChild(checkboxListEl);
    item.appendChild(effectsWrap);

    const checkedEffectNames = new Set(savedCombo.effectNames);

    function renderEffectCheckboxes() {
      checkboxListEl.innerHTML = '';

      if (effects.length === 0) {
        const empty = document.createElement('span');
        empty.style.color = '#888';
        empty.style.fontSize = '0.8rem';
        empty.textContent = '（登録済みのエフェクトがありません）';
        checkboxListEl.appendChild(empty);
        return;
      }

      const timing = timingSelect.value;
      const visibleEffects = effects.filter(e => !timing || e.timing === timing);
      if (visibleEffects.length === 0) {
        const empty = document.createElement('span');
        empty.style.color = '#888';
        empty.style.fontSize = '0.8rem';
        empty.textContent = `（タイミング「${timing}」のエフェクトがありません）`;
        checkboxListEl.appendChild(empty);
        return;
      }

      visibleEffects.forEach(effect => {
        const label = document.createElement('label');
        label.className = 'effect-box-limit-eb';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checkedEffectNames.has(effect.name);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) checkedEffectNames.add(effect.name);
          else checkedEffectNames.delete(effect.name);
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(effect.name));
        checkboxListEl.appendChild(label);
      });
    }

    timingSelect.addEventListener('change', renderEffectCheckboxes);
    renderEffectCheckboxes();

    // 使用能力値/技能値
    const selectRow = document.createElement('div');
    selectRow.className = 'effect-box-combo-row';

    function buildParamSelect(selectedId, filterFn) {
      const select = document.createElement('select');
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '（選択なし）';
      select.appendChild(noneOpt);
      Object.entries(parameters)
        .filter(([paramId]) => filterFn(paramId))
        .forEach(([paramId, param]) => {
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
    const abilitySelect = buildParamSelect(savedCombo.abilityParamId, isDX3AbilityParam);
    abilityField.appendChild(abilityLabel);
    abilityField.appendChild(abilitySelect);
    selectRow.appendChild(abilityField);

    const skillField = document.createElement('div');
    skillField.className = 'effect-box-combo-field';
    const skillLabel = document.createElement('span');
    skillLabel.className = 'effect-box-combo-label';
    skillLabel.textContent = '使用技能';
    const skillSelect = buildParamSelect(savedCombo.skillParamId, isDX3SkillParam);
    skillField.appendChild(skillLabel);
    skillField.appendChild(skillSelect);
    selectRow.appendChild(skillField);

    item.appendChild(selectRow);

    // 発動/判定/ダメージは実行ボタンではなく、チャットコマンド
    // （combo.awk/combo.jdm/combo.dmg、js/parameters/dx3.jsのhandleDX3ChatCommandが処理）
    // から行う。ここではその3行をクリップボードへコピーし、チャットパレットの編集欄に
    // 貼り付けて使えるようにするだけにする。
    const actionRow = document.createElement('div');
    actionRow.className = 'dialog-button-row';
    actionRow.style.marginTop = '8px';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'dialog-add-row-btn';
    copyBtn.textContent = 'コマンドをコピー';
    copyBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim() || savedCombo.name;
      if (!name) {
        alert('コンボ名を入力してください。');
        return;
      }
      const text = buildComboChatLines(name).join('\n');
      const originalLabel = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'コピーしました';
      } catch (error) {
        alert(`クリップボードへのコピーに失敗しました: ${error.message}`);
        return;
      }
      setTimeout(() => { copyBtn.textContent = originalLabel; }, 1500);
    });

    actionRow.appendChild(copyBtn);
    item.appendChild(actionRow);

    listEl.appendChild(item);

    rows.push({ item, savedCombo, nameInput, timingSelect, checkedEffectNames, abilitySelect, skillSelect });
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
        timing: row.timingSelect.value || null,
        // タイミングの絞り込みで一時的に隠れているエフェクトも選択状態を保つため、
        // 表示中のチェックボックスではなくcheckedEffectNames（Set）を正とする。
        effectNames: effects.filter(e => row.checkedEffectNames.has(e.name)).map(e => e.name),
        abilityParamId: row.abilitySelect.value || null,
        skillParamId: row.skillSelect.value || null
      }))
      .filter(combo => combo.name !== '');

    // ダイアログは閉じない（保存後もそのままコンボの追加・編集・コマンドコピーを続けられるようにするため）。
    nextCombos.forEach(nc => {
      const row = rows.find(r => r.savedCombo.id === nc.id);
      if (row) Object.assign(row.savedCombo, nc);
    });

    onSave(nextCombos);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
