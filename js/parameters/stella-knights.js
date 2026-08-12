import { MAX_ANIMATED_DICE } from '../dice-notation.js';
import { buildParameters } from './paramFactory.js';
import { createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd } from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
const CHARGE_COMMAND_PATTERN = /^charge\((\d+)\)$/i;
const MAIN_TAB_ID = 'main';
const SKILL_COMPONENT_KEY = 'stellaKnightsSkills';

const FACE_PARAMETERS = [
  { key: 'face1', label: '１の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face2', label: '２の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face3', label: '３の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face4', label: '４の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face5', label: '５の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face6', label: '６の目', value: 0, locked: true, editable: true, visible: false }
];

const NUMBER_OPTIONS = [
  { value: '', label: 'なし' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' }
];

const STELLA_KNIGHTS_SKILL_SPEC = createSkillSpec({
  id: 'stella-knights-skill',
  noun: 'スキル',
  componentKey: SKILL_COMPONENT_KEY,
  fields: [
    { key: 'type', label: '種別', type: 'text', className: 'effect-box-timing' },
    { key: 'timing', label: 'タイミング', type: 'text', className: 'effect-box-timing' },
    { key: 'number', label: '対応する数字', type: 'select', options: NUMBER_OPTIONS, className: 'effect-box-level' }
  ],
  periods: [{ key: 'scenario', label: 'シナリオ' }],
  modTargets: FACE_PARAMETERS.map((definition, index) => ({
    paramId: `STELLA_KNIGHTS:${definition.key}`,
    label: `${index + 1}の目`
  }))
});

function buildStellaKnightsCharacterParameters() {
  return buildParameters('STELLA_KNIGHTS', FACE_PARAMETERS);
}

function looksLikeStellaKnightsChatCommand(rawInput) {
  return CHARGE_COMMAND_PATTERN.test(String(rawInput).trim());
}

function countFaces(diceValues) {
  const counts = [0, 0, 0, 0, 0, 0];
  (diceValues ?? []).forEach(rand => {
    if (rand?.sides !== 6 || !Number.isInteger(rand.value)) return;
    if (rand.value < 1 || rand.value > 6) return;
    counts[rand.value - 1] += 1;
  });
  return counts;
}

function readFaceValue(parameters, face) {
  const value = parameters?.[`STELLA_KNIGHTS:face${face}`]?.value;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

// componentsから正規形のスキル一覧を取り出す（js/parameters/dx3.jsのreadDX3Effectsと同型）。
function readStellaKnightsSkills(components) {
  return normalizeSkillList(STELLA_KNIGHTS_SKILL_SPEC, components?.[SKILL_COMPONENT_KEY] ?? []);
}

function renderStellaKnightsCharacterPanel({
  container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents
}) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = '銀剣のステラナイツ';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  const rows = FACE_PARAMETERS.map((definition, index) => {
    const face = index + 1;
    const paramId = `STELLA_KNIGHTS:${definition.key}`;

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.textContent = definition.label;
    label.className = 'dialog-param-label';
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = readFaceValue(parameters, face);
    input.disabled = !canEdit;

    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);

    return { paramId, input };
  });

  // スキル一覧（ボックス）。既存キャラクターの更新時のみ開ける
  // （新規作成時はまだcomponentsを持たないため対象外。js/parameters/dx3.jsのエフェクト欄と同じ扱い）。
  if (mode === 'edit' && onComponentChange) {
    // ダイアログを開いたまま複数回編集しても巻き戻らないよう、開くたびに最新のcomponentsを読む
    // （getComponentsが無い場合のみ、開いた時点のスナップショットにフォールバック）。
    const readComponents = () => (getComponents ? getComponents() : components);
    const readSkills = () => readStellaKnightsSkills(readComponents());

    const skillBtn = document.createElement('button');
    skillBtn.type = 'button';
    skillBtn.className = 'dialog-add-row-btn';
    skillBtn.style.marginTop = '8px';

    const updateSkillBtnLabel = () => {
      skillBtn.textContent = `${STELLA_KNIGHTS_SKILL_SPEC.noun}一覧を開く（${readSkills().length}件）`;
    };
    updateSkillBtnLabel();

    skillBtn.addEventListener('click', () => {
      showSkillBox({
        spec: STELLA_KNIGHTS_SKILL_SPEC,
        skills: readSkills(),
        // 修正の対象に選べるパラメータと、式に書ける{パラメータ名}の検証・提示に使う
        parameters,
        readOnly: !canEdit,
        onSave: (nextSkills) => {
          onComponentChange(SKILL_COMPONENT_KEY, nextSkills);
          updateSkillBtnLabel();
        }
      });
    });
    container.appendChild(skillBtn);
  }

  return {
    getValues: () => Object.fromEntries(
      rows.map(({ paramId, input }) => [paramId, Math.max(0, Math.trunc(Number(input.value) || 0))])
    )
  };
}

// シナリオ終了時、スキルの使用回数（periods: scenario）を戻す
// （js/parameters/dx3.jsのresetDX3ComponentsOnPhaseEndと同型）。
// 変化が無ければ同一参照のcomponentsを返す（game-store.js側の差分検知に合わせるため）。
function resetStellaKnightsComponentsOnPhaseEnd(components, phase) {
  const key = STELLA_KNIGHTS_SKILL_SPEC.componentKey;
  const skills = components?.[key];
  const nextSkills = resetSkillUsageOnPhaseEnd(STELLA_KNIGHTS_SKILL_SPEC, skills, phase);

  return nextSkills === skills ? components : { ...components, [key]: nextSkills };
}

function buildChargeLines(token, counts, dispatch) {
  return counts.flatMap((count, index) => {
    if (count === 0) return [];

    const face = index + 1;
    const paramId = `STELLA_KNIGHTS:face${face}`;
    const param = token.parameters?.[paramId];
    const before = Number(param?.value ?? 0);
    const after = before + count;

    dispatch('SET_PARAMETER', { characterId: token.id, paramId, value: after });

    const label = param?.label ?? FACE_PARAMETERS[index].label;
    return `${label}: ${before} -> ${after} (+${count})`;
  });
}

function handleStellaKnightsChatCommand(rawInput, { token, dispatch, rollBCDice }) {
  const input = String(rawInput).trim();
  const match = input.match(CHARGE_COMMAND_PATTERN);
  if (!match) return false;

  if (!token) {
    alert('チャージを行うキャラクターを選択してください。');
    return true;
  }
  if (!rollBCDice) {
    alert('この画面ではダイスを振れません。部屋の中で実行してください。');
    return true;
  }

  const diceCount = Number(match[1]);
  if (!Number.isInteger(diceCount) || diceCount < 1) {
    alert('charge() のダイス数には 1 以上の整数を指定してください。');
    return true;
  }

  const command = `${diceCount}B6`;
  rollBCDice(STELLA_KNIGHTS_BCDICE_SYSTEM, command).then(({ success, resultText, diceValues }) => {
    if (!success) {
      alert(`チャージロールに失敗しました: ${resultText}`);
      return;
    }

    const counts = countFaces(diceValues);
    const changeLines = buildChargeLines(token, counts, dispatch);
    const diceDetail = diceValues?.length ? diceValues.map(d => d.value).join(', ') : '';

    if (diceValues?.length) {
      dispatch('ROLL_DICE_ANIMATION', {
        tabId: MAIN_TAB_ID,
        dice: diceValues.slice(0, MAX_ANIMATED_DICE)
      });
    }

    dispatch('ADD_CHAT_MESSAGE', {
      tabId: MAIN_TAB_ID,
      entry: {
        system: '銀剣のステラナイツ',
        character: token.name || '',
        characterId: token.id || null,
        color: token.textColor || null,
        command: input,
        diceDetail,
        resultText: [
          `チャージ: ${command}`,
          resultText,
          changeLines.length ? changeLines.join('\n') : '加算される出目はありませんでした。'
        ].join('\n')
      }
    });
  }).catch(error => {
    alert(`チャージロールでエラーが発生しました: ${error.message}`);
  });

  return true;
}

export const STELLA_KNIGHTS_PLUGIN = {
  id: 'STELLA_KNIGHTS',
  label: '銀剣のステラナイツ',
  buildCharacterParameters: buildStellaKnightsCharacterParameters,
  renderCharacterPanel: renderStellaKnightsCharacterPanel,
  handleChatCommand: handleStellaKnightsChatCommand,
  looksLikeOwnChatCommand: looksLikeStellaKnightsChatCommand,
  resetComponentsOnPhaseEnd: resetStellaKnightsComponentsOnPhaseEnd,
  stamps: [
    {id:`bouquet`, label : `ブーケ`,file:`bouquet.png`}
  ]
};
