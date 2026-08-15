import { buildParameters } from './paramFactory.js';
import { createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd } from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
const CHARGE_COMMAND_PATTERN = /^charge\((\d+)\)$/i;
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

// チャージで振った目は「ダイスドラフト」のプールへ入り、パネル（js/dice-draft-panel.js）で
// スキルへドラッグして使う。スキルの「対応する数字」と同じ目だけが置け、置いた個数だけ使用できる
// ＝ requirement の kind:'match'。この宣言が入るまで、「対応する数字」は表示用のメモでしかなく、
// どのコードとも繋がっていなかった。
//
// legacyCountParameters は face1..face6 からの移行元。以前のcharge()は出目を数えてこれらへ
// 加算していたので、値が残っているコマではパネルに「プールへ移す」ボタンが出る。
// face1..face6 自体は残す：スキルの修正対象（modTargets）として今も使われ、手入力もできる。
const STELLA_KNIGHTS_DRAFT_SPEC = createDiceDraftSpec({
  id: 'stella-knights-draft',
  label: '出目',
  diceSides: 6,
  bcdiceSystem: STELLA_KNIGHTS_BCDICE_SYSTEM,
  skillSpec: STELLA_KNIGHTS_SKILL_SPEC,
  requirement: { kind: 'match', valueField: 'number' },
  legacyCountParameters: FACE_PARAMETERS.map((definition, index) => ({
    paramId: `STELLA_KNIGHTS:${definition.key}`,
    value: index + 1
  }))
});

function buildStellaKnightsCharacterParameters() {
  return buildParameters('STELLA_KNIGHTS', FACE_PARAMETERS);
}

// --- ブーケ合計（ルーム変数） ---
// この部屋でブーケのスタンプが押された回数の、参加者全員ぶんの合計。
// 数え札そのものはCoreが持っている（js/game-store.jsのstampCounts）ので、ここは
// 「どれを足すか」だけを決める。手入力させない（editable:false）のは自動計算値だから、
// 消させない（locked:true）のは、既にこのシステムで動いている部屋にも後から補完させるため
// （js/parameters/registry.jsのwithMissingPluginRoomParameters）。
const BOUQUET_STAMP_ID = 'STELLA_KNIGHTS:bouquet';
const BOUQUET_TOTAL_PARAM_ID = 'STELLA_KNIGHTS:bouquetTotal';

const ROOM_PARAMETERS = [
  { key: 'bouquetTotal', label: 'ブーケ合計', value: 0, locked: true, editable: false }
];

function buildStellaKnightsRoomParameters() {
  return buildParameters('STELLA_KNIGHTS', ROOM_PARAMETERS);
}

function computeStellaKnightsDerivedRoomParameters(parameters, context = {}) {
  const perParticipant = context.stampCounts?.[BOUQUET_STAMP_ID] ?? {};
  // 壊れた値（保存データを手で書き換えられた等）が混ざっていても合計を壊さない
  const total = Object.values(perParticipant)
    .reduce((sum, count) => sum + (Number.isInteger(count) && count > 0 ? count : 0), 0);

  return { [BOUQUET_TOTAL_PARAM_ID]: total };
}

function looksLikeStellaKnightsChatCommand(rawInput) {
  return CHARGE_COMMAND_PATTERN.test(String(rawInput).trim());
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

// チャージ。振った目はダイスドラフトのプールへ入る（以前はface1..face6へ個数として
// 加算していた。残っている値の移行はパネル側の「プールへ移す」ボタンが担当する）。
// 個数の検証・コマ未選択・ダイスを振れない画面の案内は runDiceDraftRoll がまとめて行うので、
// ここは書式の判定だけをする。
function handleStellaKnightsChatCommand(rawInput, { token, dispatch, rollBCDice }) {
  const input = String(rawInput).trim();
  const match = input.match(CHARGE_COMMAND_PATTERN);
  if (!match) return false;

  runDiceDraftRoll({
    spec: STELLA_KNIGHTS_DRAFT_SPEC,
    token,
    dispatch,
    rollBCDice,
    count: Number(match[1]),
    knownSkillNames: readStellaKnightsSkills(token?.components).map(skill => skill.name),
    chatCommand: input
  });

  // 書式が合った時点で必ずtrueを返す（falseだとCoreがただのダイスコマンドとして再解釈する）
  return true;
}

export const STELLA_KNIGHTS_PLUGIN = {
  id: 'STELLA_KNIGHTS',
  label: '銀剣のステラナイツ',
  buildCharacterParameters: buildStellaKnightsCharacterParameters,
  buildRoomParameters: buildStellaKnightsRoomParameters,
  computeDerivedRoomParameters: computeStellaKnightsDerivedRoomParameters,
  renderCharacterPanel: renderStellaKnightsCharacterPanel,
  handleChatCommand: handleStellaKnightsChatCommand,
  looksLikeOwnChatCommand: looksLikeStellaKnightsChatCommand,
  resetComponentsOnPhaseEnd: resetStellaKnightsComponentsOnPhaseEnd,
  diceDraft: STELLA_KNIGHTS_DRAFT_SPEC,
  stamps: [
    {id:`bouquet`, label : `ブーケ`,file:`bouquet.png`}
  ]
};
