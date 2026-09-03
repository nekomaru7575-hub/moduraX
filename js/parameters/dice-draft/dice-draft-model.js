// js/parameters/dice-draft/dice-draft-model.js
// ダイスドラフト（振った目を1個ずつ取っておき、スキルへ割り当てて使う仕組み）のデータモデル。
//
// このファイルは DOM も store も触らない。理由は2つある。
//   1. server/index.js → game-store.js → registry.js → プラグイン → ここ、という import 連鎖が
//      あるため、トップレベルで document を触ると本番サーバーが起動しなくなる
//   2. 判定の規則（何が置けるか・いつ発動できるか）を、UIとは切り離して1か所に集めるため
// UI（ドラッグ・ダイスの絵・store操作）は js/dice-draft-panel.js が持つ。
//
// 保存する形（token.components.diceDraft）:
//   { pool: [die], placements: { [スキル名]: [die] } }   die = { id, sides, value }
// 【不変条件】ダイス1個は pool か、いずれか1つのスキルの下か、必ずどちらか一方にだけ存在する。
// ドラッグは配列間の移動でしかなく、この不変条件さえ守れば整合性は保たれる。

// 壊れた（あるいは意図的に膨らませた）保存データで状態が肥大しないよう、読み出し時に切る。
// exportしているのは、プールへ足すコマンド（dice-draft-pool.jsのdice.add）が
// 「入り切らない個数を先に弾く」ために同じ上限を見る必要があるため。
export const POOL_SAFETY_MAX = 60;
const PLACEMENT_SAFETY_MAX = 20;

/** 空のドラフト。componentsを持たない古いコマの既定値。 */
export function createEmptyDraft() {
  return { pool: [], placements: {} };
}

let dieSeq = 0;

/**
 * ダイス1個を作る。idは再描画とドラッグの対応付けに使う
 * （配列のindexで指すと、移動のたびに指し先がズレる）。
 */
export function createDie(sides, value) {
  dieSeq += 1;
  return {
    id: `d${Date.now().toString(36)}-${dieSeq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sides: Number.isInteger(sides) && sides > 0 ? sides : 6,
    value: Number.isInteger(value) ? value : 0
  };
}

function normalizeDie(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Number.isInteger(raw.value)) return null;
  const sides = Number.isInteger(raw.sides) && raw.sides > 0 ? raw.sides : 6;
  const id = typeof raw.id === 'string' && raw.id !== '' ? raw.id : createDie(sides, raw.value).id;
  return { id, sides, value: raw.value };
}

/**
 * 保存済みのドラフトを正規化する。読み出しは必ずここを通すこと。
 *
 * knownSkillNames を渡すと、そこに無い名前の下にいるダイスを**プールへ戻す**。
 * スキルを消した・改名したときにダイスが行き場を失って消えてしまうのを防ぐため
 * （黙って捨てるより、拾い直せる場所へ返すほうが事故が小さい）。
 *
 * @param {any} raw
 * @param {string[]|null} [knownSkillNames] 省略・nullなら置き場の検査をしない
 */
export function normalizeDraft(raw, knownSkillNames = null) {
  const known = Array.isArray(knownSkillNames) ? new Set(knownSkillNames) : null;
  const seenIds = new Set();

  // 同じidが2か所に現れる壊れたデータでも不変条件を保つ（先に見つけたほうを採る）
  const takeDice = (list, max) => {
    if (!Array.isArray(list)) return [];
    const result = [];
    for (const item of list) {
      if (result.length >= max) break;
      const die = normalizeDie(item);
      if (!die || seenIds.has(die.id)) continue;
      seenIds.add(die.id);
      result.push(die);
    }
    return result;
  };

  const pool = takeDice(raw?.pool, POOL_SAFETY_MAX);
  const placements = {};
  const orphans = [];

  const rawPlacements = (raw?.placements && typeof raw.placements === 'object') ? raw.placements : {};
  Object.entries(rawPlacements).forEach(([skillName, list]) => {
    if (typeof skillName !== 'string' || skillName === '') return;
    const dice = takeDice(list, PLACEMENT_SAFETY_MAX);
    if (dice.length === 0) return;
    if (known && !known.has(skillName)) {
      orphans.push(...dice);
      return;
    }
    placements[skillName] = dice;
  });

  return { pool: [...pool, ...orphans].slice(0, POOL_SAFETY_MAX), placements };
}

/** そのドラフトが持っているダイスの総数（プール＋配置済み）。 */
export function countDice(draft) {
  const placed = Object.values(draft?.placements ?? {})
    .reduce((sum, dice) => sum + (Array.isArray(dice) ? dice.length : 0), 0);
  return (draft?.pool?.length ?? 0) + placed;
}

/** そのスキルに乗っているダイス。無ければ空配列。 */
export function placedDice(draft, skillName) {
  return draft?.placements?.[skillName] ?? [];
}

// ------------------------------------------------------------------
// 宣言（プラグインが書くもの）
// ------------------------------------------------------------------

const REQUIREMENT_KINDS = new Set(['match', 'sum']);

/**
 * ダイスドラフトの宣言。
 *
 * @param {{
 *   id: string,                必須。宣言の識別子
 *   label: string,             必須。パネルの見出しとチャットログの発言種別に使う
 *   diceSides?: number,        振るダイスの面数（既定6）
 *   bcdiceSystem: string,      振るときのBCDiceシステムID（room.bcdiceSystemとは別軸）
 *   skillSpec?: object|null,   割り当て先の一覧（createSkillSpec の戻り値）。
 *                              nullなら「まだスキル一覧が無いシステム」＝プールだけを扱う
 *   requirement?: {
 *     kind: 'match'|'sum',
 *     valueField?: string,     kind:'match' … この欄と同じ目だけ置ける。使用回数＝置いた個数
 *     anyValue?: string,       kind:'match' … valueFieldがこの値なら、どの目でも置ける
 *                              （ステラナイツの「0/7」）。目を選ばなくなるだけで数え方は
 *                              一致型のまま＝1個で1回。宣言しなければ従来どおり一致のみ
 *     targetField?: string,    kind:'sum'   … 合計がこの欄の値以上で発動。使用回数＝1
 *     modifierParamId?: string kind:'sum'   … このパラメータの実効値を目標値へ足す
 *                              （ドラクルージュの「目標値修正(TB)」）。読むのは呼び出し側で、
 *                              このファイルはstoreを触らない（readTargetModifier）
 *     modifierLabel?: string   その修正の呼び名。状態の1行に出す（既定は「修正」）
 *     floor?: number           修正を足した後の目標値の下限。段階が潰れて重なった分は1つにまとめる
 *   },
 *   skillTabs?: Array<{ id: string, label: string, field?: string, value?: string }>
 *                              スキル一覧の絞り込み（ドラクルージュの幕：戦／常／終）。
 *                              2つ以上宣言するとパネルに切り替えの帯が出る。
 *                              fieldとvalueを書くとその欄が一致するものだけ、
 *                              書かなければ全部（「終」のような「すべて」の枠）。
 *                              **絞るのは見た目だけ**で、置いたダイスも発動の規則も変わらない。
 *   expiresCheckPhaseOnUse?: boolean
 *                              発動したら「判定終了」を発出するか（＝そのコマの
 *                              「判定終了で消滅」バフを剥がす）。1回きりの修正を
 *                              表現するためのもので、発出するのは runDiceDraftUse。
 *   legacyCountParameters?: { paramId: string, value: number }[]
 *     ドラフト導入前に「目ごとの個数」をパラメータで持っていたシステムのための移行元。
 *     宣言しておくと、値が残っているときだけパネルに「プールへ移す」ボタンが出る
 *     （ステラナイツの face1..face6 がこれ）。編集できるパラメータであること。
 * }} definition
 */
export function createDiceDraftSpec(definition) {
  const {
    id, label, diceSides = 6, bcdiceSystem,
    skillSpec = null, requirement = null, legacyCountParameters = [],
    skillTabs = [], expiresCheckPhaseOnUse = false
  } = definition;

  if (!id) throw new Error('[dice-draft] idが必要です');
  if (!label) throw new Error(`[dice-draft] ${id}: labelが必要です`);
  if (!bcdiceSystem) throw new Error(`[dice-draft] ${id}: bcdiceSystemが必要です`);
  if (requirement && !REQUIREMENT_KINDS.has(requirement.kind)) {
    throw new Error(`[dice-draft] ${id}: requirement.kindが不明です: ${requirement.kind}`);
  }
  skillTabs.forEach(tab => {
    if (!tab?.id || !tab?.label) throw new Error(`[dice-draft] ${id}: skillTabsにはidとlabelが必要です`);
  });

  return Object.freeze({
    id, label, bcdiceSystem, skillSpec, expiresCheckPhaseOnUse,
    diceSides: Number.isInteger(diceSides) && diceSides > 0 ? diceSides : 6,
    requirement: requirement ? Object.freeze({ ...requirement }) : null,
    skillTabs: Object.freeze(skillTabs.map(tab => Object.freeze({ ...tab }))),
    legacyCountParameters: Object.freeze(legacyCountParameters.map(entry => Object.freeze({ ...entry })))
  });
}

// ------------------------------------------------------------------
// 判定（規則を足すときはこの2つだけを触る）
// ------------------------------------------------------------------

// kind:'match' の「どの目でも置ける」印（ステラナイツの「0/7」）が入っている欄か。
// 数字に見えて数字ではない値を印にするので、readNumberFieldへ通す前にここで拾う。
// anyValueを宣言していないシステムでは常にfalse＝従来どおり一致だけを見る。
function acceptsAnyDie(requirement, skill) {
  const anyValue = requirement?.anyValue;
  if (anyValue === undefined || anyValue === null || anyValue === '') return false;
  return String(skill?.fields?.[requirement.valueField] ?? '') === String(anyValue);
}

// スキルの欄から数値を1つ読む。未設定・数字でないものはnull（＝「決まっていない」）。
function readNumberField(skill, fieldKey) {
  const raw = skill?.fields?.[fieldKey];
  if (raw === '' || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

// 目標値（kind:'sum'）の書き方は2通りある。
//   "7"      … その値ちょうど。従来からの書き方
//   "3～12"  … 最小値の倍数から選ぶ（ドラクルージュの《軽やかに剣舞う》は3・6・9・12）。
//              どれを狙うかは使う人が決めるので、選択肢を返して画面とコマンドに選ばせる。
// 区切り記号は書く人によって揺れるので、見かける形は全部受ける。
const TARGET_RANGE_PATTERN = /^(\d+)\s*[~～〜ー－–—-]\s*(\d+)$/;

/**
 * 一覧の絞り込み（skillTabs）を1つ選んで、そこに出すスキルだけを返す。
 *
 * 【見た目だけの操作であること】ここで外れたスキルも、乗っているダイスはそのまま残り、
 * 発動の規則も変わらない。**この結果を readDraft の knownSkillNames へ渡さないこと**：
 * 渡すと、絞り込みで隠れているスキルの下のダイスが「行き場を失った」と見なされて
 * プールへ戻される（normalizeDraft）。
 *
 * @param {object[]} skills 正規化済みのスキル一覧
 * @param {{id:string, label:string, field?:string, value?:string}|null} tab
 * @returns {object[]} tabがnull、または絞り込みの指定が無ければ元の一覧のまま
 */
export function filterSkillsByTab(skills, tab) {
  if (!tab?.field || tab.value === undefined || tab.value === null) return skills;
  return skills.filter(skill => String(skill?.fields?.[tab.field] ?? '') === String(tab.value));
}

/**
 * 目標値へ足す修正の実効値（ドラクルージュの「目標値修正(TB)」）。
 *
 * このファイルはstoreを触らないので、読み方（getEffectiveParameterValue）は引数で受け取る。
 * パネルからも発動からも同じ値が出るよう、読み出しは必ずここを通すこと。
 *
 * @param {object} spec createDiceDraftSpec()の戻り値
 * @param {object|null} token
 * @param {Function} getEffectiveParameterValue
 * @returns {number} 宣言が無い・読めない場合は0
 */
export function readTargetModifier(spec, token, getEffectiveParameterValue) {
  const paramId = spec?.requirement?.modifierParamId;
  if (!paramId || !token || typeof getEffectiveParameterValue !== 'function') return 0;

  const value = Number(getEffectiveParameterValue(token, paramId));
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

/**
 * 目標値の欄を読み、選べる目標値の一覧にする。読めなければnull。
 * @returns {{ options: number[] }|null} optionsは昇順。単一の目標値なら1件
 */
function parseSumTarget(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const text = String(raw).trim();

  const range = text.match(TARGET_RANGE_PATTERN);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (!(min > 0) || max < min) return null;

    const options = [];
    for (let value = min; value <= max; value += min) options.push(value);
    return { options };
  }

  const value = Number(text);
  return Number.isFinite(value) ? { options: [value] } : null;
}

/**
 * 目標値の段階すべてに修正を足し、下限で切る。
 *
 * 段階のある目標値（3～12 → 3・6・9・12）では、**最終的な段階のそれぞれに**足す。
 * 修正-1なら 2・5・8・11 になり、刻み（3）は変わらない。
 * 下限で複数の段階が同じ値へ潰れたときは、重なった分を1つにまとめる
 * （選択肢に同じ数字が並んでも選びようがないため）。
 */
function applyTargetModifier(options, modifier, floor) {
  const hasFloor = Number.isFinite(floor);
  const moved = options.map(value => {
    const next = value + modifier;
    return hasFloor ? Math.max(floor, next) : next;
  });

  return [...new Set(moved)]; // 元が昇順なので、まとめた後も昇順のまま
}

/**
 * その目をそのスキルへ置いてよいか。
 * @returns {{ ok: boolean, reason: string }} reasonは置けないときの1行説明
 */
export function acceptsDie(spec, skill, die) {
  const requirement = spec?.requirement;
  if (!requirement) return { ok: false, reason: 'このシステムにはダイスの割り当て規則がありません' };
  if (!die) return { ok: false, reason: '' };

  if (requirement.kind === 'match') {
    if (acceptsAnyDie(requirement, skill)) return { ok: true, reason: '' };

    const wanted = readNumberField(skill, requirement.valueField);
    if (wanted === null) return { ok: false, reason: '対応する数字が設定されていません' };
    if (die.value !== wanted) return { ok: false, reason: `${wanted}の目だけを置けます` };
    return { ok: true, reason: '' };
  }

  // kind: 'sum' … 目は選ばない。目標値が未設定でも置くこと自体は許し、発動側で止める
  return { ok: true, reason: '' };
}

/**
 * 今そのスキルに乗っているダイスで発動できるか。
 *
 * @param {object} spec
 * @param {object} skill
 * @param {object[]} dice
 * @param {{ targetValue?: number|null, targetModifier?: number }} [options]
 *   targetValue    … 幅のある目標値（"3～12"）でどれを狙うか。選択肢に無い値は無視して
 *                    「今の合計で届く一番大きい目標値」を採る（画面もコマンドも同じ規則）。
 *   targetModifier … 目標値へ足す修正（readTargetModifierの戻り値）。
 * @returns {{
 *   ready: boolean,
 *   uses: number,               乗っているダイスを全部使うと何回ぶんになるか
 *   perUseDice: number,         1回ぶんが何個のダイスを食うか
 *   supportsPartialUse: boolean 「1回だけ使う」に意味があるか。
 *                               画面がkindで分岐しなくて済むよう、ここで答えを出す
 *   targetOptions: number[],    選べる目標値。2件以上なら画面に選択欄を出す
 *   targetValue: number|null,   今回狙う目標値（判定値）
 *   description: string         パネルとチャットログの両方に出す1行
 * }}
 */
export function evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {}) {
  const requirement = spec?.requirement;
  const count = dice.length;
  const no = (description) => ({
    ready: false, uses: 0, perUseDice: 0, supportsPartialUse: false,
    targetOptions: [], targetValue: null, description
  });

  if (!requirement) return no('ダイスの割り当て規則がありません');

  if (requirement.kind === 'match') {
    // 「どの目でも置ける」印が入っているスキルは目を問わない。数え方は一致型のまま
    // ＝1個で1回なので、これ以降の分岐は目の呼び名が変わるだけ。
    const anyDie = acceptsAnyDie(requirement, skill);
    const wanted = anyDie ? null : readNumberField(skill, requirement.valueField);
    if (!anyDie && wanted === null) return no('対応する数字が設定されていません');

    const faceLabel = anyDie ? 'どの目でも' : `${wanted}の目`;
    if (count === 0) {
      const needText = anyDie ? 'どの目でもいいのでダイスが必要です' : `${wanted}の目が必要です`;
      return { ...no(needText), supportsPartialUse: true };
    }

    // 1個で1回。何個乗せてもよく、乗せた数だけ使える。
    // targetOptions/targetValue は一致型には無い概念だが、**戻り値の形は必ず揃える**。
    // 画面は kind で分岐せずに result.targetOptions.length を読む（js/dice-draft-panel.js）ので、
    // 欠けていると描画の途中で落ち、スキルの列がまるごと出なくなる。
    return {
      ready: true, uses: count, perUseDice: 1, supportsPartialUse: true,
      targetOptions: [], targetValue: null,
      description: `${faceLabel} ×${count} → ${count}回使用`
    };
  }

  // kind: 'sum' … 合計が目標値に届けば1回。「1回だけ」と「全部」に違いが無いので
  // supportsPartialUse は false（画面のボタンも1つになる）。
  //
  // 【使用回数は必ず1回】幅のある目標値では効果が「判定値/3回」のように増えることがあるが、
  // それは1回の行いの効果であって使用回数ではない。ここでusesを増やすと、runDiceDraftUseが
  // その回数だけ使用を記録し、「ラウンド1回」の上限に自分でぶつかる。
  const target = parseSumTarget(skill?.fields?.[requirement.targetField]);
  if (target === null) return no('目標値が設定されていません');

  const options = applyTargetModifier(target.options, targetModifier, requirement.floor);
  const total = dice.reduce((sum, die) => sum + die.value, 0);

  // 狙う目標値。指定が無ければ「今の合計で届く一番大きいもの」、1つも届かないなら最小値
  // （どれだけ足りないかを出すため）。
  const affordable = options.filter(value => value <= total);
  const chosen = options.includes(targetValue)
    ? targetValue
    : (affordable.length > 0 ? affordable[affordable.length - 1] : options[0]);

  const label = options.length > 1
    ? `${options[0]}～${options[options.length - 1]}`
    : String(options[0]);

  // 修正が乗っているときは、目標値が動いた理由が状態の1行だけで分かるようにする
  // （行いに書いてある目標値と違う数字が出る唯一の理由がこれなので、黙って変えない）。
  const modifierNote = targetModifier === 0
    ? ''
    : `${requirement.modifierLabel ?? '修正'} ${targetModifier > 0 ? '+' : ''}${targetModifier}`;
  const trailing = modifierNote ? `（${modifierNote}）` : '';

  if (total < chosen) {
    return {
      ...no(`合計 ${total} / 目標 ${chosen}（あと ${chosen - total}）${trailing}`),
      targetOptions: options, targetValue: chosen
    };
  }

  return {
    ready: true, uses: 1, perUseDice: count, supportsPartialUse: false,
    targetOptions: options, targetValue: chosen,
    description: options.length > 1
      ? `合計 ${total} / 判定値 ${chosen}（目標 ${label}${modifierNote ? `・${modifierNote}` : ''}）`
      : `合計 ${total} / 目標 ${chosen}${trailing}`
  };
}

// ------------------------------------------------------------------
// 状態を動かす（すべて新しいオブジェクトを返す。変化が無ければ同じ参照）
// ------------------------------------------------------------------

/** プールへダイスを足す。上限を超える分は捨てる（超えた個数を overflow で返す）。 */
export function addDiceToPool(draft, dice) {
  if (!Array.isArray(dice) || dice.length === 0) return { draft, added: 0, overflow: 0 };

  const base = draft ?? createEmptyDraft();
  const room = Math.max(0, POOL_SAFETY_MAX - base.pool.length);
  const accepted = dice.slice(0, room);
  if (accepted.length === 0) return { draft: base, added: 0, overflow: dice.length };

  return {
    draft: { pool: [...base.pool, ...accepted], placements: { ...base.placements } },
    added: accepted.length,
    overflow: dice.length - accepted.length
  };
}

/**
 * プールにある目 from のダイスを count 個だけ to へ変える。
 *
 * 【触るのはプールだけ】スキルの下に乗っているダイスは対象にしない。kind:'match' の
 * システムでは「乗っているダイスの目＝スキルの対応する数字」が不変条件なので、乗ったまま
 * 目を書き換えると置き場と矛盾する。変えたければ一度プールへ戻してもらう。
 *
 * 【全部そろわなければ何もしない】count 個に足りないときは1個も変えずに元のdraftを返す。
 * 部分的に変えると、対価を払う合成コマンド（ステラナイツのプチラッキー）が
 * 「半分だけ効いたのに満額払った」という壊れ方をする。
 *
 * 先頭から取るのは consumePlacement と同じ理由＝利用者が並べた順を尊重するため。
 * idは変えない（同じダイスの目が変わっただけ。パネルの再描画とドラッグの対応付けが飛ばない）。
 *
 * @returns {{ draft: object, changed: number, available: number }}
 *   available は変更前にプールにあった目 from の個数（呼び出し側が理由の説明に使う）
 */
export function changePoolDice(draft, from, to, count = 1) {
  const base = draft ?? createEmptyDraft();
  const available = base.pool.reduce((sum, die) => sum + (die.value === from ? 1 : 0), 0);
  if (!Number.isInteger(count) || count < 1 || available < count) {
    return { draft: base, changed: 0, available };
  }

  let remaining = count;
  const pool = base.pool.map(die => {
    if (remaining === 0 || die.value !== from) return die;
    remaining -= 1;
    return { ...die, value: to };
  });

  // 目が変わらない指定（from === to）は状態を動かさない。呼び出し側が参照比較で
  // 「変化なし」を判定できるよう、元のdraftをそのまま返す
  if (from === to) return { draft: base, changed: count, available };

  return { draft: { pool, placements: { ...base.placements } }, changed: count, available };
}

// 指定のダイスを今どこにあっても取り出す。見つからなければ null。
function extractDie(draft, dieId) {
  const poolIndex = draft.pool.findIndex(die => die.id === dieId);
  if (poolIndex !== -1) {
    const die = draft.pool[poolIndex];
    const pool = [...draft.pool];
    pool.splice(poolIndex, 1);
    return { die, from: null, next: { pool, placements: { ...draft.placements } } };
  }

  for (const [skillName, dice] of Object.entries(draft.placements)) {
    const index = dice.findIndex(die => die.id === dieId);
    if (index === -1) continue;

    const die = dice[index];
    const rest = [...dice];
    rest.splice(index, 1);
    const placements = { ...draft.placements };
    if (rest.length === 0) delete placements[skillName];
    else placements[skillName] = rest;
    return { die, from: skillName, next: { pool: [...draft.pool], placements } };
  }

  return null;
}

/**
 * ダイスを1個動かす。toSkillName に null を渡すとプールへ戻す。
 * 置けない組み合わせ・動かす必要が無い場合は**元のdraftをそのまま返す**
 * （呼び出し側が参照比較で「変化なし」を判定できるようにするため）。
 */
export function moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {}) {
  const base = draft ?? createEmptyDraft();
  const found = extractDie(base, dieId);
  if (!found) return base;
  if (found.from === (toSkillName ?? null)) return base;

  const { die, next } = found;

  if (toSkillName === null || toSkillName === undefined) {
    return { pool: [...next.pool, die], placements: next.placements };
  }

  if (spec && !acceptsDie(spec, skill, die).ok) return base;

  const current = next.placements[toSkillName] ?? [];
  if (current.length >= PLACEMENT_SAFETY_MAX) return base;

  return {
    pool: next.pool,
    placements: { ...next.placements, [toSkillName]: [...current, die] }
  };
}

/**
 * 発動時。そのスキルに乗っているダイスを先頭から count 個だけ捨てる（プールへは戻さない）。
 * count を省くと全部。先頭から取るのは、利用者が並べた順を尊重するため
 * （「大きい目から使う」等の最適化を勝手にやると、意図した組み合わせが崩れる）。
 */
export function consumePlacement(draft, skillName, count = Infinity) {
  const base = draft ?? createEmptyDraft();
  const dice = base.placements[skillName];
  if (!dice || count <= 0) return base;

  const placements = { ...base.placements };
  const rest = dice.slice(count);
  if (rest.length === 0) delete placements[skillName];
  else placements[skillName] = rest;

  return { pool: [...base.pool], placements };
}

/** プールも配置も全部捨てる。 */
export function clearDraft() {
  return createEmptyDraft();
}
