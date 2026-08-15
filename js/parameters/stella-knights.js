import { buildParameters } from './paramFactory.js';
import { createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd } from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
const CHARGE_COMMAND_PATTERN = /^charge\((\d+)\)$/i;
const SKILL_COMPONENT_KEY = 'stellaKnightsSkills';

const FACE_NUMBERS = [1, 2, 3, 4, 5, 6];
const FACE_LABELS = ['１', '２', '３', '４', '５', '６'];

const NUMBER_OPTIONS = [
  { value: '', label: 'なし' },
  ...FACE_NUMBERS.map(n => ({ value: String(n), label: String(n) }))
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
  // このシステムは出目1〜6それぞれにスキルを持つのが基本形なので、まだ1件も登録が無いコマには
  // 6つの枠を最初から配る。利用者は名前と効果を埋めるだけでよく、ドラフトのパネルにも
  // 最初から6枠が並ぶ。
  //
  // 名前を空にできないのは、ダイスドラフトがスキル名をキーに置き場を持つため
  // （名無しが6つあると、どの枠に乗せたのか区別できない）。旧「Nの目」パラメータと
  // 同じ呼び名を仮に入れてあるので、そのまま使ってもよいし書き換えてもよい。
  defaultSkills: FACE_NUMBERS.map((n, index) => ({
    name: `${FACE_LABELS[index]}の目`,
    fields: { type: '', timing: '', number: String(n) }
  }))
});

// チャージで振った目は「ダイスドラフト」のプールへ入り、パネル（js/dice-draft-panel.js）で
// スキルへドラッグして使う。スキルの「対応する数字」と同じ目だけが置け、置いた個数だけ使用できる
// ＝ requirement の kind:'match'。
//
// かつては出目の在庫を face1..face6 というパラメータで数えていたが、ドラフトのプールが
// その役目を引き継いだので廃止した（このシステムはコマ固有のパラメータを持たない）。
const STELLA_KNIGHTS_DRAFT_SPEC = createDiceDraftSpec({
  id: 'stella-knights-draft',
  label: '出目',
  diceSides: 6,
  bcdiceSystem: STELLA_KNIGHTS_BCDICE_SYSTEM,
  skillSpec: STELLA_KNIGHTS_SKILL_SPEC,
  requirement: { kind: 'match', valueField: 'number' }
});

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

  // 出目の在庫はダイスドラフトのプール（js/dice-draft-panel.js）が持つので、
  // この列に並べるパラメータはもう無い。

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

  // このシステムはコマ固有のパラメータを持たないので、返す値も無い
  return { getValues: () => ({}) };
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

// チャージ。振った目はダイスドラフトのプールへ入る。
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
  // buildCharacterParameters は持たない：出目の在庫はダイスドラフトのプールが持つので、
  // コマ固有のパラメータが1つも要らなくなった（ルーム変数のブーケ合計だけが残る）
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
