// js/parameters/arianrhod.js
// アリアンロッドRPG 2E のプラグイン記述子。
//
// このシステム固有の知識だけを持つ：
//   - 能力ボーナス・判定値修正のレジスタ・MP/フェイト/攻撃力・CL というパラメータの並び
//   - スキル（タイミング・SL・コスト・対象）の形
//   - 行動セット（ムーブ/マイナー/メジャーの宣言）の判定式・ダメージ式
// 一覧UI・使用制限・回数制限・修正値・使用処理は共通フレームワーク（js/parameters/skill/）が持つ。
//
// このファイルはNode（server/index.js → game-store.js → registry.js）からも読み込まれるため、
// トップレベルでdocument/windowに触れないこと（docs/plugin-guide.mdの8.1）。

import { buildParameters } from './paramFactory.js';
import {
  createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd, findSkillByName,
  buildSkillUseCommandPattern
} from './skill/skill-model.js';
import { runSkillUse } from './skill/skill-use.js';
import { showSkillBox } from './skill/skill-box.js';
import { showArianrhodAbilityBox } from './arianrhod-ability-box.js';
import {
  showActionSetBox, normalizeActionSetList, findActionSetByName,
  runActionSetActivate, runActionSetCheck, runActionSetDamage
} from './arianrhod-action-set-box.js';

const SOURCE = 'ARIANRHOD';
const paramId = (key) => `${SOURCE}:${key}`;

// 判定・ダメージ式の受け皿。値は原則バフでしか動かないのでeditable:falseにしてある
// （editable:falseでもADD_BUFFは効く。docs/plugin-guide.mdの4章）。
const DICE_MOD_PARAM_ID = paramId('AdB');    // ダイス数修正
const VALUE_MOD_PARAM_ID = paramId('AnB');   // 判定値修正
const ATTACK_MOD_PARAM_ID = paramId('DaB');  // 攻撃力修正
const DAMAGE_DICE_PARAM_ID = paramId('DdB'); // ダメージダイス修正
const ATTACK_PARAM_ID = paramId('atk');
const MP_PARAM_ID = paramId('MP');
const FATE_PARAM_ID = paramId('Fate');

// BCDiceのシステムID（/api/bcdice/game_systemの一覧の表記と一字一句同じにすること）。
// 記述子のbcdiceSystemと、行動セットの判定/ダメージロールの両方でこれを使う。
const BCDICE_SYSTEM = 'Arianrhod';

// 能力ボーナス。キーを略称にしてあるのは、スキルの式やバフコマンドから{STR}と書けるようにするため。
const ABILITY_BONUSES = [
  { key: 'STR', label: '筋力ボーナス' },
  { key: 'DEX', label: '器用ボーナス' },
  { key: 'AGI', label: '敏捷ボーナス' },
  { key: 'INT', label: '知力ボーナス' },
  { key: 'PER', label: '感知ボーナス' },
  { key: 'MND', label: '精神ボーナス' },
  { key: 'LUC', label: '幸運ボーナス' }
];

// 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。
// 自動計算やコマンドの受け皿になる値がコマごとに欠けると直しようがないため。
export const ARIANRHOD_PARAMETERS = [
  { key: 'MP', label: 'MP', value: 0 },
  { key: 'Fate', label: 'フェイト', value: 0 },
  // 攻撃力はダメージ式の固定値。手入力はするが一覧には出さない
  { key: 'atk', label: '攻撃力', value: 0, visible: false },
  ...ABILITY_BONUSES.map(ability => ({ ...ability, value: 0, editable: false, visible: false })),
  { key: 'AdB', label: 'ダイス数修正(AdB)', value: 0, editable: false, visible: false },
  { key: 'AnB', label: '判定値修正(AnB)', value: 0, editable: false, visible: false },
  { key: 'DaB', label: '攻撃力修正(DaB)', value: 0, editable: false, visible: false },
  { key: 'DdB', label: 'ダメージダイス修正(DdB)', value: 0, editable: false, visible: false },
  { key: 'CL', label: 'レベル(CL)', value: 1, editable: false, visible: false }
];

export function buildArianrhodCharacterParameters() {
  return buildParameters(SOURCE, ARIANRHOD_PARAMETERS, { locked: true });
}

// 行動セットの「能力」プルダウンの選択肢
const ABILITY_CHOICES = ABILITY_BONUSES.map(ability => ({
  paramId: paramId(ability.key), label: ability.label
}));

// 能力ボーナス・CLのボックスに並べる行。どちらもeditable:falseで更新ダイアログから
// 手入力できないため、コマ作成ツールでのみ編集できる入口をここで持つ。
const ABILITY_BOX_ROWS = [
  ...ABILITY_CHOICES,
  { paramId: paramId('CL'), label: 'レベル(CL)' }
];

// 更新ダイアログのプラグイン専用スペースに入力欄を出すパラメータ。
// プラグインが専用スペースを持つと、そのプラグイン由来のパラメータは汎用一覧から外れる
// （js/character-dialog.jsのpluginOwnsDisplay）ため、ここに出さないと直す場所が無くなる。
const PANEL_PARAM_ROWS = [
  { paramId: MP_PARAM_ID, label: 'MP' },
  { paramId: FATE_PARAM_ID, label: 'フェイト' },
  { paramId: ATTACK_PARAM_ID, label: '攻撃力' }
];

const ACTION_SET_COMPONENT_KEY = 'actionSets';

// アリアンロッドのスキルを、汎用の「スキル」として宣言する。
//
// タイミングをtextにしているのは、「メジャー／マイナー」のような複合表記や、
// シートからの表記ゆれをそのまま持てるようにするため。行動セットの枠は
// この文字列との部分一致でスキルを絞る（arianrhod-action-set-box.jsのskillFitsSlot）。
//
// コストは2つ。1つ目は種類がMPで固定、2つ目は行ごとに種類を選ぶ。どちらも
// sign:-1で「入力した正の数を減らす」形にしてある（DX3の上昇侵蝕率のような加算ではない）。
// 支払いはSET_PARAMETERで基礎値へ書くので、種類の選択肢はeditable:trueのパラメータに限る。
export const ARIANRHOD_SKILL_SPEC = createSkillSpec({
  id: 'arianrhod-skill',
  noun: 'スキル',
  componentKey: 'skills',
  fields: [
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'sl', label: 'SL', type: 'number', className: 'effect-box-level', formulaName: 'SL' },
    {
      key: 'mp', label: 'MP', type: 'number', className: 'effect-box-encroach',
      onUse: { addToParamId: MP_PARAM_ID, sign: -1 }
    },
    {
      key: 'costType', label: 'コスト種別', type: 'select',
      options: [
        { value: '', label: '（なし）' },
        { value: FATE_PARAM_ID, label: 'フェイト' },
        { value: 'core:hp', label: 'HP' },
        { value: ATTACK_PARAM_ID, label: '攻撃力' }
      ]
    },
    {
      key: 'costValue', label: 'コスト値', type: 'number',
      availableWhen: fields => !!fields.costType,
      onUse: { paramIdFromField: 'costType', sign: -1 }
    },
    {
      key: 'target', label: '対象', type: 'select',
      options: [
        { value: 'self', label: '自身' },
        { value: 'n', label: 'n体' },
        { value: 'area', label: '範囲' },
        { value: 'scene', label: 'シーン' }
      ]
    },
    {
      key: 'targetCount', label: '体数', type: 'number',
      availableWhen: fields => fields.target === 'n'
    }
  ],
  periods: [
    { key: 'scenario', label: 'シナリオ' },
    { key: 'scene', label: 'シーン' },
    { key: 'round', label: 'ラウンド' }
  ],
  modTargets: [
    { paramId: DICE_MOD_PARAM_ID, label: 'ダイス数' },
    { paramId: VALUE_MOD_PARAM_ID, label: '判定値' },
    { paramId: ATTACK_MOD_PARAM_ID, label: '攻撃力' },
    { paramId: DAMAGE_DICE_PARAM_ID, label: 'ダメージダイス' }
  ]
});

// componentsから正規形のスキル一覧を取り出す（js/parameters/dx3.jsのreadDX3Effectsと同型）。
// 保存済みが古い形でもここを通せば新しい形として読める。
export function readArianrhodSkills(components) {
  return normalizeSkillList(ARIANRHOD_SKILL_SPEC, components?.[ARIANRHOD_SKILL_SPEC.componentKey] ?? []);
}

export function readArianrhodActionSets(components) {
  return normalizeActionSetList(components?.[ACTION_SET_COMPONENT_KEY] ?? []);
}

// キャラクター作成/更新ダイアログのプラグイン専用スペース。
function renderArianrhodCharacterPanel({
  container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents,
  getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false
}) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = 'アリアンロッドRPG 2E';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  const rows = PANEL_PARAM_ROWS.map(({ paramId: rowParamId, label: fallbackLabel }) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    // 一覧の見出しと食い違わないよう、コマが実際に持っているラベルを優先して読む
    label.textContent = parameters[rowParamId]?.label ?? fallbackLabel;
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    input.value = Number(parameters[rowParamId]?.value) || 0;
    input.disabled = !canEdit;

    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);

    return { paramId: rowParamId, input };
  });

  // 能力ボーナス・CL。editable:falseなので、部屋の外のコマ作成ツール
  // （allowParameterEdit:true）でだけ編集できる（DX3の能力値・技能値と同じ扱い）。
  const canEditAbilityValues = allowParameterEdit && canEdit && typeof dispatch === 'function' && !!tokenId;
  const abilityBtn = document.createElement('button');
  abilityBtn.type = 'button';
  abilityBtn.className = 'dialog-add-row-btn';
  abilityBtn.style.marginTop = '8px';
  abilityBtn.textContent = canEditAbilityValues ? '能力ボーナス・レベルを編集' : '能力ボーナス・レベルを表示';
  abilityBtn.addEventListener('click', () => {
    // ボックスで保存した後に開き直しても巻き戻らないよう、都度最新のparametersを読む
    const token = getToken ? getToken() : null;
    showArianrhodAbilityBox({
      parameters: token?.parameters ?? parameters,
      rows: ABILITY_BOX_ROWS,
      editable: canEditAbilityValues,
      // editable:falseのパラメータへはSET_PARAMETERが通らない（js/game-store.jsのガード）ため、
      // 値の上書きを担当する既存のIMPORT_CHARACTER_DATAで書き込む。
      onSave: canEditAbilityValues
        ? (valueOverrides) => dispatch('IMPORT_CHARACTER_DATA', { id: tokenId, valueOverrides })
        : undefined
    });
  });
  container.appendChild(abilityBtn);

  // スキル一覧・行動セット一覧。既存のコマの更新時のみ開ける
  // （新規作成時はまだcomponentsを持たないため対象外）。
  if (mode === 'edit' && onComponentChange) {
    // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新のcomponentsを読む
    const readComponents = () => (getComponents ? getComponents() : components) ?? {};
    const readSkills = () => readArianrhodSkills(readComponents());
    const readActionSets = () => readArianrhodActionSets(readComponents());

    const skillBtn = document.createElement('button');
    skillBtn.type = 'button';
    skillBtn.className = 'dialog-add-row-btn';
    skillBtn.style.marginTop = '8px';
    const updateSkillBtnLabel = () => {
      skillBtn.textContent = `${ARIANRHOD_SKILL_SPEC.noun}一覧を開く（${readSkills().length}件）`;
    };
    updateSkillBtnLabel();
    skillBtn.addEventListener('click', () => {
      showSkillBox({
        spec: ARIANRHOD_SKILL_SPEC,
        skills: readSkills(),
        // 修正の対象に選べるパラメータと、式に書ける{パラメータ名}の検証・提示に使う
        parameters: (getToken ? getToken()?.parameters : null) ?? parameters,
        readOnly: !canEdit,
        onSave: (nextSkills) => {
          onComponentChange(ARIANRHOD_SKILL_SPEC.componentKey, nextSkills);
          updateSkillBtnLabel();
        }
      });
    });
    container.appendChild(skillBtn);

    const setBtn = document.createElement('button');
    setBtn.type = 'button';
    setBtn.className = 'dialog-add-row-btn';
    setBtn.style.marginTop = '8px';
    const updateSetBtnLabel = () => {
      setBtn.textContent = `行動セット一覧を開く（${readActionSets().length}件）`;
    };
    updateSetBtnLabel();
    setBtn.addEventListener('click', () => {
      showActionSetBox({
        actionSets: readActionSets(),
        skills: readSkills(),
        abilityChoices: ABILITY_CHOICES,
        readOnly: !canEdit,
        onSave: (nextSets) => {
          onComponentChange(ACTION_SET_COMPONENT_KEY, nextSets);
          updateSetBtnLabel();
        }
      });
    });
    container.appendChild(setBtn);
  }

  return {
    getValues: () => Object.fromEntries(rows.map(({ paramId: rowParamId, input }) => [
      rowParamId, Math.trunc(Number(input.value) || 0)
    ]))
  };
}

// 「スキル使用(スキル名)」。書式はspecの呼び名から組み立てる。
const SKILL_USE_COMMAND_PATTERN = buildSkillUseCommandPattern(ARIANRHOD_SKILL_SPEC);

// 行動セットのチャットコマンド。set.awk(名前)で発動、set.hk(名前)で判定、set.dmg(名前)で
// ダメージロール（実処理はarianrhod-action-set-box.jsのrunActionSet*）。
const ACTION_SET_COMMAND_PATTERN = /^set\.(awk|hk|dmg)\((.+)\)$/;

// この入力がアリアンロッドのコマンド構文に見えるか（実行できるかは問わない）。
// プラグインが適用されていない部屋で打たれたときに理由を返すためだけに使う（副作用を持たせない）。
function looksLikeArianrhodChatCommand(rawInput) {
  const input = String(rawInput).trim();
  return SKILL_USE_COMMAND_PATTERN.test(input) || ACTION_SET_COMMAND_PATTERN.test(input);
}

/**
 * アリアンロッド固有のチャットコマンドを解釈・実行する。
 * 書式が合った時点で必ずtrueを返すこと（falseを返すとCoreがただのダイスコマンドとして
 * 解釈し直してしまう。docs/plugin-guide.mdの3.4）。
 */
function handleArianrhodChatCommand(rawInput, {
  token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice
}) {
  const input = String(rawInput).trim();

  const skillUseMatch = input.match(SKILL_USE_COMMAND_PATTERN);
  if (skillUseMatch) {
    const name = skillUseMatch[1].trim();

    if (!token) {
      alert(`${ARIANRHOD_SKILL_SPEC.noun}を使用する参照キャラクターを選択してください。`);
      return true;
    }

    const skills = readArianrhodSkills(token.components);
    const skill = findSkillByName(skills, name);
    if (!skill) {
      alert(`${ARIANRHOD_SKILL_SPEC.noun}「${name}」が見つかりません。`);
      return true;
    }

    const tokenId = token.id;
    runSkillUse({
      spec: ARIANRHOD_SKILL_SPEC,
      targetSkills: [skill],
      allSkills: skills,
      tokenId, dispatch, getToken: () => token, getEffectiveParameterValue, generateBuffId,
      chatCommand: input,
      logTitle: `${ARIANRHOD_SKILL_SPEC.noun}使用: ${skill.name}`,
      // 行動セットと同じ扱いにしておく（効果時間の指定が無い修正は、その攻撃＝プロセスの間だけ）。
      // set.dmgのプロセス終了でまとめて剥がれる。
      expirePhaseFallback: 'process',
      onSaveSkills: (nextSkills) => dispatch('SET_COMPONENT', {
        id: tokenId, componentKey: ARIANRHOD_SKILL_SPEC.componentKey, value: nextSkills
      })
    });
    return true;
  }

  const setMatch = input.match(ACTION_SET_COMMAND_PATTERN);
  if (!setMatch) return false;

  const [, action, rawName] = setMatch;
  const name = rawName.trim();

  if (!token) {
    alert('行動セットを実行する参照キャラクターを選択してください。');
    return true;
  }

  const actionSets = readArianrhodActionSets(token.components);
  const actionSet = findActionSetByName(actionSets, name);
  if (!actionSet) {
    alert(`行動セット「${name}」が見つかりません。`);
    return true;
  }

  const tokenId = token.id;
  const getToken = () => token;

  if (action === 'awk') {
    runActionSetActivate({
      spec: ARIANRHOD_SKILL_SPEC,
      actionSet,
      skills: readArianrhodSkills(token.components),
      tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId,
      chatCommand: input,
      onSaveSkills: (nextSkills) => dispatch('SET_COMPONENT', {
        id: tokenId, componentKey: ARIANRHOD_SKILL_SPEC.componentKey, value: nextSkills
      })
    });
  } else if (action === 'hk') {
    runActionSetCheck({
      actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice,
      bcdiceSystem: BCDICE_SYSTEM,
      diceModParamId: DICE_MOD_PARAM_ID,
      valueModParamId: VALUE_MOD_PARAM_ID,
      chatCommand: input
    });
  } else if (action === 'dmg') {
    runActionSetDamage({
      actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice,
      bcdiceSystem: BCDICE_SYSTEM,
      damageDiceParamId: DAMAGE_DICE_PARAM_ID,
      attackParamId: ATTACK_PARAM_ID,
      attackModParamId: ATTACK_MOD_PARAM_ID,
      chatCommand: input
    });
  }

  return true;
}

// シナリオ/シーン/ラウンド終了時、該当する期間のスキル使用数を0へ戻す。
// 変化が無ければ同一参照のcomponentsを返す（game-store.js側の差分検知に合わせるため）。
function resetArianrhodComponentsOnPhaseEnd(components, phase) {
  const key = ARIANRHOD_SKILL_SPEC.componentKey;
  const skills = components?.[key];
  const nextSkills = resetSkillUsageOnPhaseEnd(ARIANRHOD_SKILL_SPEC, skills, phase);

  return nextSkills === skills ? components : { ...components, [key]: nextSkills };
}

export const ARIANRHOD_PLUGIN = {
  id: SOURCE,
  label: 'アリアンロッドRPG 2E',
  buildCharacterParameters: buildArianrhodCharacterParameters,
  renderCharacterPanel: renderArianrhodCharacterPanel,
  handleChatCommand: handleArianrhodChatCommand,
  looksLikeOwnChatCommand: looksLikeArianrhodChatCommand,
  resetComponentsOnPhaseEnd: resetArianrhodComponentsOnPhaseEnd,
  bcdiceSystem: BCDICE_SYSTEM
};
