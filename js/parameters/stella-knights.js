import { buildParameters } from './paramFactory.js';
import { createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd } from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';
import { runDiceChange } from './dice-draft/dice-draft-pool.js';
import { createAppspotSheetSource, sheetText, assignSheetNumber } from './sheet-source.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
// charge(n) … n個振る。charge / charge() … 個数を書かない形で、チャットに
// {チャージダイス数}+{現在のラウンド} と書いたのと同じ個数を振る（readImplicitChargeCount）。
const CHARGE_COMMAND_PATTERN = /^charge(?:\(\s*(\d+)?\s*\))?$/i;
// このシステムが適用されていない部屋での案内（looksLikeOwnChatCommand）に使う形。
// かっこ付きだけを自分のものと見なす：裸の charge はただの英単語かもしれないので、
// 他システムの部屋で発言を横取りしない。
const CHARGE_COMMAND_HINT_PATTERN = /^charge\(\s*\d*\s*\)$/i;
// プチラッキー(a>b) … プールの目aを1個bへ変え、ブーケを |a-b|×3 払う。
// 区切りは全角の＞も受ける（dice.change と揃える）。
const PETIT_LUCKY_COMMAND_PATTERN = /^プチラッキー\(\s*(\d+)\s*[>＞]\s*(\d+)\s*\)$/;
const PETIT_LUCKY_COST_PER_STEP = 3;

// ブーケを払うだけのコマンド（下の runBouquetSpend）。
// ダイス追加(n) … 1個につき4、nは3個まで。リロール … 一律5。
// プールも出目も動かさないのは、卓が実際にどう振り直すかまでは決めないため
// （プールへ目を足したいときはCore共通の dice.add、目を変えるなら dice.change がある）。
const DICE_ADD_COMMAND_PATTERN = /^ダイス追加\(\s*(\d+)\s*\)$/;
const DICE_ADD_COST_PER_DIE = 4;
const DICE_ADD_MAX_COUNT = 3;
// リロールは引数を取らないが、他のコマンドと揃えて「リロール()」の形も受ける。
const REROLL_COMMAND_PATTERN = /^リロール(?:\(\s*\))?$/;
const REROLL_COST = 5;
const SKILL_COMPONENT_KEY = 'stellaKnightsSkills';
const MAIN_TAB_ID = 'main';

const FACE_NUMBERS = [1, 2, 3, 4, 5, 6];
const FACE_LABELS = ['１', '２', '３', '４', '５', '６'];

// 「対応する数字」に入れると、1〜6のどの目でも置けるようになる印。シートの表記に
// 合わせて「0/7」と書くが、**0か7の目しか置けないという意味ではない**（d6に0も7も出ない）。
// 数字に見えて数字ではないので、判定はdice-draft-model.jsのanyValueが拾う。
const ANY_FACE_VALUE = '0/7';

// 「なし」は置かない。対応する数字が決まっていないスキルはダイスを1個も置けず、
// 選ぶ意味のある選択肢ではないため（そう保存された古いデータは空欄として出る）。
const NUMBER_OPTIONS = [
  ...FACE_NUMBERS.map(n => ({ value: String(n), label: String(n) })),
  { value: ANY_FACE_VALUE, label: ANY_FACE_VALUE }
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
  // 修正値はほとんど使わないので、使用ログには効果（note）を出す。
  // 「修正値バフはありません」の断り書きも出なくなる（毎回出ると読みづらいだけ）。
  // 修正の欄自体は残してある（allowMods:falseにすると保存済みの修正まで捨てられる）。
  logNote: true,
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
// ＝ requirement の kind:'match'。「対応する数字」が「0/7」のスキルだけは目を問わず、
// 1〜6どれでも置ける（anyValue）。数え方は同じで、1個で1回だ。
//
// かつては出目の在庫を face1..face6 というパラメータで数えていたが、ドラフトのプールが
// その役目を引き継いだので廃止した（このシステムはコマ固有のパラメータを持たない）。
const STELLA_KNIGHTS_DRAFT_SPEC = createDiceDraftSpec({
  id: 'stella-knights-draft',
  label: '出目',
  diceSides: 6,
  bcdiceSystem: STELLA_KNIGHTS_BCDICE_SYSTEM,
  skillSpec: STELLA_KNIGHTS_SKILL_SPEC,
  requirement: { kind: 'match', valueField: 'number', anyValue: ANY_FACE_VALUE }
});

// --- コマのパラメータ ---
// どれも手で増減させる値なので editable:true。locked:true は削除させないためと、
// 既にこのシステムで動いている部屋のコマにも後から補完させるため
// （js/parameters/registry.jsのwithMissingPluginParameters）。
//
// 防御力とチャージダイス数はシートに載っている値で、URLからの取り込みでも埋まる。
// チャージダイス数を visible:false にしてあるのは、卓の全員が常時見たい値ではなく
// 「charge(n) の n をいくつにするか」の控えだから。一覧には出ないが、更新画面では
// 直せるし、スキルの式からは {チャージダイス数} で読める。
//
// ブーケはプチラッキーのような能力の対価に払う持ち点。部屋が持つ「ブーケ合計」
// （下のルーム変数）とは別物で、あちらはブーケのスタンプが押された回数の集計、
// こちらは各コマの持ち点。paramIdもラベルも違うので、チャットの
// {ブーケ} / {ブーケ合計} も取り違えない。
const DEFENSE_PARAM_ID = 'STELLA_KNIGHTS:defense';
const CHARGE_PARAM_ID = 'STELLA_KNIGHTS:charge';
const BOUQUET_PARAM_ID = 'STELLA_KNIGHTS:bouquet';

// 耐久力はCoreの既定パラメータ（HP）をそのまま使う。取り込みの書き込み先にするだけで、
// ラベルは触らない（利用者が付けた名前を勝手に上書きしないため）。
const HP_PARAM_ID = 'core:hp';

// 個数を書かない charge の個数に足す、Coreのルーム変数「現在のラウンド」
// （js/parameters/core.jsのCORE_DEFAULT_ROOM_PARAMETERS）。値はCoreが維持する。
const ROUND_ROOM_PARAM_ID = 'core:round';

const CHARACTER_PARAMETERS = [
  { key: 'defense', label: '防御力', value: 0, visible: true, locked: true, editable: true },
  { key: 'charge', label: 'チャージダイス数', value: 0, visible: false, locked: true, editable: true },
  { key: 'bouquet', label: 'ブーケ', value: 0, visible: true, locked: true, editable: true }
];

function buildStellaKnightsCharacterParameters() {
  return buildParameters('STELLA_KNIGHTS', CHARACTER_PARAMETERS);
}

// 更新画面のプラグイン専用スペースに出す入力欄。並び順はシートの見出し（耐久力・防御力・
// チャージダイス数）に合わせてある。labelは、コマ側にパラメータがまだ無いとき用の控え。
const PANEL_PARAM_ROWS = CHARACTER_PARAMETERS.map(def => ({
  paramId: `STELLA_KNIGHTS:${def.key}`,
  label: def.label
}));

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
  // リロールは裸のchargeと同じ扱いで、かっこ付きの形だけを自分のものと見なす
  // （「リロール」の一言は他システムの部屋ではただの発言かもしれない）。
  return CHARGE_COMMAND_HINT_PATTERN.test(input)
    || PETIT_LUCKY_COMMAND_PATTERN.test(input)
    || DICE_ADD_COMMAND_PATTERN.test(input)
    || /^リロール\(\s*\)$/.test(input);
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
  // 並べるのはシートに載っている値と持ち点だけ。
  //
  // 【この欄が要る理由】プラグインが専用スペースを持つと、そのプラグイン由来のパラメータは
  // 更新画面の汎用一覧から外される（js/character-dialog.jsのpluginOwnsDisplay）。
  // ここに入力欄を出さないと、手で直せる場所がどこにも無くなる。
  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  const rows = PANEL_PARAM_ROWS.map(({ paramId, label: fallbackLabel }) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    // 一覧の見出しと食い違わないよう、コマが実際に持っているラベルを優先して読む
    label.textContent = parameters[paramId]?.label ?? fallbackLabel;
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = Number(parameters[paramId]?.value) || 0;
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

  // 描いた行だけを返す。どれも0未満にはならない値なので、ここで下限を切っておく
  // （ブーケが負のままだとプチラッキーの残高の判定が意味を失う）。
  return {
    getValues: () => Object.fromEntries(rows.map(({ paramId, input }) => [
      paramId, Math.max(0, Math.trunc(Number(input.value) || 0))
    ]))
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

/**
 * ブーケを払うだけのコマンド（ダイス追加(n) / リロール）。
 *
 * プールにも出目にも触れず、対価の支払いと残高の記録だけを引き受ける。実際にダイスを
 * 足したり振り直したりするのは卓の運用に任せる（必要ならCore共通の dice.add / dice.change、
 * charge を使う）。プチラッキーと違って「払ったのに効果が出ない」の心配が無いぶん、
 * 順番に気を遣う必要も無い。
 *
 * @returns {boolean} このコマンドとして処理したか（書式が違えばfalse）
 */
function runBouquetSpend(input, { token, dispatch }) {
  const diceAdd = input.match(DICE_ADD_COMMAND_PATTERN);
  const reroll = input.match(REROLL_COMMAND_PATTERN);
  if (!diceAdd && !reroll) return false;

  if (!token) {
    alert('キャラクターを選択してください。');
    return true;
  }

  let label;
  let cost;
  if (diceAdd) {
    const count = Number(diceAdd[1]);
    if (count < 1 || count > DICE_ADD_MAX_COUNT) {
      alert(`ダイス追加の個数は 1〜${DICE_ADD_MAX_COUNT} で指定してください。`);
      return true;
    }
    label = `ダイス追加: ${count}個`;
    cost = count * DICE_ADD_COST_PER_DIE;
  } else {
    label = 'リロール';
    cost = REROLL_COST;
  }

  // 読むのも書くのも基礎値（runPetitLuckyと同じ理由。docs/plugin-guide.mdの7章）。
  const current = Number(token.parameters?.[BOUQUET_PARAM_ID]?.value) || 0;
  if (current - cost < 0) {
    alert(`ブーケが足りません（必要 ${cost} / 現在 ${current}）。`);
    return true;
  }

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
      resultText: `${label}\nブーケ -${cost}（${current} → ${current - cost}）`
    }
  });

  return true;
}

// 個数を書かない charge / charge() の個数。チャットへ {チャージダイス数}+{現在のラウンド} と
// 書いたのと同じ値にする。チャージダイス数はバフ込みの実効値（{}参照と揃えるため）、
// 現在のラウンドはCoreのルーム変数で、ラウンド進行中でなければ0＝シートの値そのままになる。
function readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue) {
  if (!token) return 0;

  const charge = getEffectiveParameterValue
    ? Number(getEffectiveParameterValue(token, CHARGE_PARAM_ID))
    : Number(token.parameters?.[CHARGE_PARAM_ID]?.value);
  const round = Number(roomParameters?.[ROUND_ROOM_PARAM_ID]?.value);

  return (Number.isFinite(charge) ? charge : 0) + (Number.isFinite(round) ? round : 0);
}

// チャージ。振った目はダイスドラフトのプールへ入る。
// 個数の検証・コマ未選択・ダイスを振れない画面の案内は runDiceDraftRoll がまとめて行うので、
// ここは書式の判定と、個数を書かない形の個数を決めることだけをする。
function handleStellaKnightsChatCommand(
  rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue, roomParameters }
) {
  const input = String(rawInput).trim();

  if (runPetitLucky(input, { token, dispatch })) return true;
  if (runBouquetSpend(input, { token, dispatch })) return true;

  const match = input.match(CHARGE_COMMAND_PATTERN);
  if (!match) return false;

  runDiceDraftRoll({
    spec: STELLA_KNIGHTS_DRAFT_SPEC,
    token,
    dispatch,
    rollBCDice,
    count: match[1] !== undefined
      ? Number(match[1])
      : readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue),
    knownSkillNames: readStellaKnightsSkills(token?.components).map(skill => skill.name),
    chatCommand: input
  });

  // 書式が合った時点で必ずtrueを返す（falseだとCoreがただのダイスコマンドとして再解釈する）
  return true;
}

// ------------------------------------------------------------------
// キャラクターシートの取り込み
// ------------------------------------------------------------------
// 対象はWebキャラクターシート（character-sheets.appspot.com）の銀剣のステラナイツ用シートが
// 返すJSON。ファイルから読ませる道（盤面の「JSONを読み込む」）と、URLから取る道
// （js/character-sheet-import.js）の両方がこの関数に合流する。
//
// シートにあってこのアプリが持っていない項目（花章・願い・あなたの物語などの設定欄、
// パートナー、歪みの共鳴、勲章）は取り込まない。パラメータ化していないものを隠しパラメータ
// として持たせても、画面のどこにも出ず、書き出したJSONだけが太るため。

// URLから取り込むときの受け付け先（受け付ける形と取得先の組み立ては js/parameters/sheet-source.js）。
const STELLA_KNIGHTS_SHEET_SOURCE = createAppspotSheetSource({
  label: '銀剣のステラナイツ',
  pathSegment: 'stellar'
});

// スキル一覧。シートの列（名前・種別・タイミング・効果）はこのプラグインのスキルと
// 素直に1対1で対応する。
//
// 【「対応する数字」は埋まらない】シート側にその欄が無いため（Noの列は行番号であって
// 出目ではない）、取り込んだスキルは数字が空のまま入る。空のスキルはダイスドラフトで
// 「対応する数字が設定されていません」となりダイスを置けないので、取り込んだ後に
// スキル一覧を開いて1〜6を割り当ててもらう。
//
// シートのスキルが0件なら、normalizeSkillListが既定の6枠（１の目〜６の目）を配る。
// 空のシートを取り込んで枠まで消える、ということにはならない。
function importStellaKnightsSkillsFromSheet(json) {
  const rawList = Array.isArray(json?.skills) ? json.skills : [];

  return normalizeSkillList(STELLA_KNIGHTS_SKILL_SPEC, rawList
    .map(raw => ({
      name: sheetText(raw?.name),
      note: sheetText(raw?.effect),
      fields: { type: sheetText(raw?.type), timing: sheetText(raw?.timing), number: '' }
    }))
    // シートは空の行を1つ持って返してくる。名前の無い行は取り込まない
    .filter(skill => skill.name !== ''));
}

/**
 * Webキャラクターシート（銀剣のステラナイツ）のJSONを取り込む。
 * @param {any} json
 * @returns {{name?:string, valueOverrides:object, labelOverrides:object,
 *            newParameters:object, components:object} | null}
 */
function importStellaKnightsCharacterJson(json) {
  if (!json || typeof json !== 'object') return null;

  // ステラナイツのシートらしさの確認。他システムのシートを黙って空のコマとして
  // 取り込んでしまわないよう、このシステム特有のキーが1つも無ければ断る。
  // baseやpartnerは他システムのシートも持つので数えない。
  const looksLikeSheet = ['status', 'skills', 'skillshead', 'sheath']
    .some(key => json[key] !== undefined);
  if (!looksLikeSheet) return null;

  // 耐久力はCoreのHPへ入れる。防御力とチャージダイス数はこのプラグインのパラメータ。
  const valueOverrides = {};
  assignSheetNumber(valueOverrides, HP_PARAM_ID, json?.status?.hp);
  assignSheetNumber(valueOverrides, DEFENSE_PARAM_ID, json?.status?.defense);
  assignSheetNumber(valueOverrides, CHARGE_PARAM_ID, json?.status?.charge);

  const name = sheetText(json?.base?.name);

  return {
    name: name === '' ? undefined : name,
    valueOverrides,
    labelOverrides: {},
    newParameters: {},
    components: {
      [SKILL_COMPONENT_KEY]: importStellaKnightsSkillsFromSheet(json)
    }
  };
}

export const STELLA_KNIGHTS_PLUGIN = {
  id: 'STELLA_KNIGHTS',
  label: '銀剣のステラナイツ',
  // 出目の在庫はダイスドラフトのプールが持つので、コマ固有のパラメータは
  // 防御力・チャージダイス数・ブーケ（持ち点）の3つ
  buildCharacterParameters: buildStellaKnightsCharacterParameters,
  buildRoomParameters: buildStellaKnightsRoomParameters,
  computeDerivedRoomParameters: computeStellaKnightsDerivedRoomParameters,
  renderCharacterPanel: renderStellaKnightsCharacterPanel,
  importCharacterJson: importStellaKnightsCharacterJson,
  characterSheetSource: STELLA_KNIGHTS_SHEET_SOURCE,
  handleChatCommand: handleStellaKnightsChatCommand,
  looksLikeOwnChatCommand: looksLikeStellaKnightsChatCommand,
  resetComponentsOnPhaseEnd: resetStellaKnightsComponentsOnPhaseEnd,
  diceDraft: STELLA_KNIGHTS_DRAFT_SPEC,
  stamps: [
    {id:`bouquet`, label : `ブーケ`,file:`bouquet.png`}
  ],
  bcdiceSystem:STELLA_KNIGHTS_BCDICE_SYSTEM
};
