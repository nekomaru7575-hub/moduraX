import { buildParameters } from './paramFactory.js';
import { createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd } from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';
import { runDiceChange } from './dice-draft/dice-draft-pool.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
const CHARGE_COMMAND_PATTERN = /^charge\((\d+)\)$/i;
// プチラッキー(a>b) … プールの目aを1個bへ変え、ブーケを |a-b|×3 払う。
// 区切りは全角の＞も受ける（dice.change と揃える）。
const PETIT_LUCKY_COMMAND_PATTERN = /^プチラッキー\(\s*(\d+)\s*[>＞]\s*(\d+)\s*\)$/;
const PETIT_LUCKY_COST_PER_STEP = 3;
const SKILL_COMPONENT_KEY = 'stellaKnightsSkills';
const MAIN_TAB_ID = 'main';

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

// --- ブーケ（コマのパラメータ） ---
// プチラッキーのような能力の対価に払う持ち点。手で増減させる値なので editable:true、
// 一覧に出す値なので visible:true。locked:true は削除させないためと、既にこのシステムで
// 動いている部屋のコマにも後から補完させるため（js/parameters/registry.jsの
// withMissingPluginParameters）。
//
// 部屋が持つ「ブーケ合計」（下のルーム変数）とは別物。あちらはブーケのスタンプが押された
// 回数の集計で、こちらは各コマの持ち点。paramIdもラベルも違うので、チャットの
// {ブーケ} / {ブーケ合計} も取り違えない。
const BOUQUET_PARAM_ID = 'STELLA_KNIGHTS:bouquet';

const CHARACTER_PARAMETERS = [
  { key: 'bouquet', label: 'ブーケ', value: 0, visible: true, locked: true, editable: true }
];

function buildStellaKnightsCharacterParameters() {
  return buildParameters('STELLA_KNIGHTS', CHARACTER_PARAMETERS);
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
  const input = String(rawInput).trim();
  return CHARGE_COMMAND_PATTERN.test(input) || PETIT_LUCKY_COMMAND_PATTERN.test(input);
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

// プチラッキー(a>b) … プールの目aを1個bへ変え、ブーケを |a-b|×3 払う。払えないなら使えない。
//
// 中身は共通の dice.change（runDiceChange）そのもので、足しているのは対価だけ。
// 【順番が要】状態を1つも変えないうちに「使えるかどうか」を決め切る。ブーケの残りを先に見て、
// 次に runDiceChange（目が足りなければ1個も変えずに失敗する）を通す。こうしておけば
// 「ブーケだけ減って目が変わらない」「目が変わったのに払っていない」が起きない。
function runPetitLucky(input, { token, dispatch }) {
  const match = input.match(PETIT_LUCKY_COMMAND_PATTERN);
  if (!match) return false;

  if (!token) {
    alert('キャラクターを選択してください。');
    return true;
  }

  const from = Number(match[1]);
  const to = Number(match[2]);
  const cost = Math.abs(from - to) * PETIT_LUCKY_COST_PER_STEP;

  // 読むのも書くのも基礎値。getEffectiveParameterValueの結果をSET_PARAMETERで書き戻すと
  // バフの分が基礎値へ混入して二重に効く（docs/plugin-guide.mdの7章）。
  const current = Number(token.parameters?.[BOUQUET_PARAM_ID]?.value) || 0;
  if (current - cost < 0) {
    alert(`ブーケが足りません（必要 ${cost} / 現在 ${current}）。`);
    return true;
  }

  // ログは下で1行だけ出すのでsilent。1回の操作でログが2行進むと、直前の結果が流れてしまう
  // （js/parameters/dice-draft/dice-draft-use.jsが消滅の知らせを畳んでいるのと同じ理由）。
  const changed = runDiceChange({
    spec: STELLA_KNIGHTS_DRAFT_SPEC,
    token,
    dispatch,
    from,
    to,
    count: 1,
    knownSkillNames: readStellaKnightsSkills(token.components).map(skill => skill.name),
    silent: true
  });
  // 目が足りなかった。理由はrunDiceChangeが伝えているので、ブーケは減らさずに終わる
  if (!changed.ok) return true;

  dispatch('SET_PARAMETER', {
    characterId: token.id, paramId: BOUQUET_PARAM_ID, value: current - cost
  });

  dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_TAB_ID,
    entry: {
      system: STELLA_KNIGHTS_DRAFT_SPEC.label,
      character: token.name || '',
      characterId: token.id || null,
      color: token.textColor || null,
      command: input,
      resultText: `プチラッキー: ${from}の目 → ${to}の目\nブーケ -${cost}（${current} → ${current - cost}）`
    }
  });

  return true;
}

// チャージ。振った目はダイスドラフトのプールへ入る。
// 個数の検証・コマ未選択・ダイスを振れない画面の案内は runDiceDraftRoll がまとめて行うので、
// ここは書式の判定だけをする。
function handleStellaKnightsChatCommand(rawInput, { token, dispatch, rollBCDice }) {
  const input = String(rawInput).trim();

  if (runPetitLucky(input, { token, dispatch })) return true;

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
  // 出目の在庫はダイスドラフトのプールが持つので、コマ固有のパラメータはブーケ（持ち点）だけ
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
