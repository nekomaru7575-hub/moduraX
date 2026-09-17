// js/parameters/stella-knights-stage.js
// 銀剣のステラナイツの「舞台」：シナリオ側の仕掛けを、ラウンド進行に合わせて自動で流す。
//
// 部屋全体に掛かるものなので、コマのcomponentsではなく部屋の拡張データ
// （room.extensions.STELLA_KNIGHTS.stage。Coreの「拡張ルーム設定」）に持つ。
// 画面はjs/parameters/stella-knights-stage-section.js、ここは状態と進行の規則だけ。
//
// 【舞台の作り】
//   ・セットルーチン／アクションルーチン／EXルーチンの3本立て。EXは無い舞台もある
//   ・1件は「名前」と「効果」を持つ
//
// 【いつ発動するか】
//   ・セット    … ラウンドの最初の「セット」の段で1つ。1ラウンドに1つずつ消費する
//   ・アクション … 種別「ブリンガー」の手番の**前**に「予兆」として予告し、
//                 手番の**終了**で適用する（予告と適用は同じ中身）
//   ・EX       … 移行後、アクションの代わりに発動されるもの
//
// 【ループ】
//   ・セットを撃ち切った後は2通り。指定の範囲（No.from〜No.to）を繰り返すか、以降撃たないか
//   ・アクションとEXは末尾まで行くとNo.1へ戻る
//   ・セット／アクションの1件に「EXへ移行」を付けられる。それが発動した後は、
//     アクションの代わりにEXだけを繰り返す
//
// 【誤爆したとき】
//   GMが「拡張ルーム設定」から、進行を1つ戻す／進める・EX移行を切り替える・
//   任意の1件を今すぐ発動する（進行は動かさない）ができる。reduceのopを参照。
//
// resetOnPhaseEndは持たない。舞台はラウンドをまたいで続く仕掛けなので、ラウンド終了で
// 消してはいけない（「始まりの部屋」との違い）。進行を戻すのはGMの明示操作だけ。
//
// DOM/windowに触れない純粋な関数だけを置く（サーバーからも読まれ、テストから直接読む）。

export const STAGE_KEY = 'stage';
export const STAGE_LABEL = '舞台';

// Mainタブに出すときの表示名。舞台名ではなく固定の2つ（ルールの呼び名そのまま）。
export const OMEN_LOG_NAME = '予兆';
export const STAGE_LOG_NAME = '舞台';

// ブリンガーの手番が始まったときに出す前口上。中身（予兆そのもの）はGMが
// 「予兆を開示」を押すまで出さない。
export const OMEN_DECLARATION = '予兆を発動します';

// セットルーチンを撃つ段。buildRoundPhaseTemplateの宣言と突き合わせるので、
// 定義はここ1か所にして、テンプレート側がこれを読む。
export const STAGE_SET_PHASE_ID = 'set';

// GMが押して進める段（Coreの steps）のid。テンプレート（js/parameters/stella-knights.js）が
// これを読んでラベルを付ける。**このファイルからは stella-knights.js を読めない**
// （循環import）ので、突き合わせる名前はこちら側に置く。
export const STAGE_STEPS = Object.freeze({
  revealSet:   'stageRevealSet',   // セットルーチンを開示
  setDone:     'stageSetDone',     // セットの段を抜ける
  omen:        'stageOmen',        // 予兆を開示
  actionStart: 'stageActionStart', // ブリンガーの行動開始を告げる
  turnEnd:     'stageTurnEnd',     // 手番終了（NPCはこの1段だけ）
  routine:     'stageRoutine',     // アクション／EXルーチンを適用
  actionEnd:   'stageActionEnd'    // アクションの処理が終わった。次の手番へ
});

export const ROUTINE_KINDS = ['set', 'action', 'ex'];
export const ROUTINE_KIND_LABELS = { set: 'セット', action: 'アクション', ex: 'EX' };

// 1つの舞台が持てる数。卓で実際に使う数より十分大きく、取り込んだJSONで大量に
// 持ち込まれても部屋の状態が太らない値（始まりの部屋のMAX_STARTING_ROOM_RULESと同じ考え方）。
export const MAX_ROUTINES_PER_KIND = 20;
export const MAX_STAGE_NAME_LENGTH = 40;
export const MAX_ROUTINE_NAME_LENGTH = 60;
export const MAX_ROUTINE_EFFECT_LENGTH = 400;
const MAX_ROUTINE_ID_LENGTH = 64;

const LOOP_MODES = ['stop', 'repeat'];

function text(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function clampIndex(value, min, max) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function isRoutineKind(kind) {
  return ROUTINE_KINDS.includes(kind);
}

/** 空の舞台 */
export function createStageState() {
  return {
    name: '',
    set: [],
    action: [],
    ex: [],
    loop: { mode: 'stop', from: 1, to: 1 },
    cursor: { set: 0, action: 0, ex: 0, setLooping: false, inEx: false }
  };
}

function normalizeRoutineList(raw, kind) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const routines = [];
  for (const routine of list) {
    if (routines.length >= MAX_ROUTINES_PER_KIND) break;
    const id = routine?.id;
    if (typeof id !== 'string' || id === '' || id.length > MAX_ROUTINE_ID_LENGTH || seen.has(id)) continue;
    seen.add(id);
    const normalized = {
      id,
      name: text(routine.name, MAX_ROUTINE_NAME_LENGTH),
      effect: text(routine.effect, MAX_ROUTINE_EFFECT_LENGTH)
    };
    // EXへ移行できるのはセットとアクションだけ（EXからEXへは移りようがない）
    if (kind !== 'ex') normalized.toEx = routine.toEx === true;
    routines.push(normalized);
  }
  return routines;
}

/**
 * 保存データ・取り込んだJSON（信用しない）を正規形へ整える。
 * 壊れた行・idの無い行・idの重複は落とし、進行の位置は必ず今の件数の中へ丸める
 * （登録を消した後に範囲外を指したままにしないため）。
 */
export function normalizeStage(raw) {
  const set = normalizeRoutineList(raw?.set, 'set');
  const action = normalizeRoutineList(raw?.action, 'action');
  const ex = normalizeRoutineList(raw?.ex, 'ex');

  // ループの範囲はセットの件数の中へ。1件も無ければ1〜1（使われないが形は保つ）
  const loopMax = Math.max(set.length, 1);
  const rawMode = raw?.loop?.mode;
  const mode = LOOP_MODES.includes(rawMode) ? rawMode : 'stop';
  let from = clampIndex(raw?.loop?.from, 1, loopMax);
  let to = clampIndex(raw?.loop?.to, 1, loopMax);
  if (from > to) [from, to] = [to, from];

  return {
    name: text(raw?.name, MAX_STAGE_NAME_LENGTH),
    set,
    action,
    ex,
    loop: { mode, from, to },
    cursor: {
      // セットだけは「件数と同じ値」＝撃ち切ったことを表す位置として許す
      set: clampIndex(raw?.cursor?.set, 0, set.length),
      action: clampIndex(raw?.cursor?.action, 0, Math.max(action.length - 1, 0)),
      ex: clampIndex(raw?.cursor?.ex, 0, Math.max(ex.length - 1, 0)),
      setLooping: raw?.cursor?.setLooping === true,
      inEx: raw?.cursor?.inEx === true
    }
  };
}

// --- 読み出し（画面とログが同じ答えを見るための一本道） -----------------------

/** 次に発動するセットルーチンと、その位置。撃ち切っていれば routine が null */
export function nextSetRoutine(stage) {
  const index = stage.cursor.set;
  return { index, routine: stage.set[index] ?? null };
}

/**
 * 次に発動するアクション／EXルーチンと、それがどちらの列か。
 * 予兆（手番の前の予告）と舞台（手番の終了時の適用）は必ずこれを見るので、2つは食い違わない。
 */
export function nextActionRoutine(stage) {
  const kind = stage.cursor.inEx ? 'ex' : 'action';
  const index = stage.cursor[kind];
  return { kind, index, routine: stage[kind][index] ?? null };
}

/**
 * 何番目のルーチンかの呼び名。ログ・拡張ルーム設定の欄・進行の現在地が
 * **すべてこの関数を通る**ので、卓とGMが同じ言い方で番号を指せる。
 */
export function routineNumberLabel(kind, index) {
  return kind === 'ex' ? `EX（${index + 1}）` : `No.（${index + 1}）`;
}

/** ログ1行ぶんの本文。名前も効果も空の行は流さない（番号だけの発言に意味は無い） */
export function describeRoutine(kind, index, routine) {
  if (!routine) return null;
  const name = routine.name.trim();
  const effect = routine.effect.trim();
  if (name === '' && effect === '') return null;
  return [`${routineNumberLabel(kind, index)}${name}`, effect].filter(Boolean).join('\n');
}

function entryFor(system, kind, index, routine) {
  const resultText = describeRoutine(kind, index, routine);
  return resultText === null ? null : { system, resultText };
}

// --- 進行 -------------------------------------------------------------------

// セットを1つ撃った後の位置。
// 1周目は末尾まで素直に進み、撃ち切ったところでループ設定に入る。
//   repeat … No.from へ戻り、以降は from〜to の中だけを回る
//   stop   … 件数と同じ位置（＝もう撃たない）で止まる
function advancedSetCursor(stage) {
  const { set, loop, cursor } = stage;
  const next = cursor.set + 1;
  const lastIndex = Math.max(set.length - 1, 0);
  const loopStart = Math.min(loop.from - 1, lastIndex);
  const loopEnd = Math.min(loop.to - 1, lastIndex);

  if (cursor.setLooping) {
    return { set: next > loopEnd || next >= set.length ? loopStart : next, setLooping: true };
  }
  if (next < set.length) return { set: next, setLooping: false };
  if (loop.mode === 'repeat') return { set: loopStart, setLooping: true };
  return { set: set.length, setLooping: false };
}

// 発動した1件が「EXへ移行」を持っていたら、以降はEXだけを繰り返す
function withExTransition(cursor, routine) {
  if (routine?.toEx !== true || cursor.inEx) return cursor;
  return { ...cursor, inEx: true, ex: 0 };
}

/**
 * ラウンド進行の節目を受けて舞台を進める（Coreの拡張ルーム設定の applyRoundEvent）。
 *
 * **発動はすべてGMの押下で起きる。** 押していないものは出ない。押す段の並びは
 * テンプレート（js/parameters/stella-knights.js）が STAGE_STEPS で宣言する。
 *
 * @param {object} value 今の舞台（正規形でなくてもよい）
 * @param {{ type: string, phase: object, stepId: string|null,
 *          actor: object|null, isBringer: boolean }} event
 *   isBringer … 手番のコマが種別「ブリンガー」か。種別の判定は js/parameters/stella-knights.js 側で
 *   解いてから渡す（このファイルが stella-knights.js を読むと循環importになるため）。
 *   **見るのは2か所だけ**：Coreが無条件に撃つ turnStart と、全員に出る turnEnd の段。
 *   それ以外の段は onlyWhen でブリンガーにしか出ないので、ここで重ねて見ない
 *   （2か所で同じ判断をすると、片方だけ直したときにズレる）。
 * @returns {{ value: object, entries: object[] }|null} 何もしないならnull
 */
export function applyStageRoundEvent(value, event) {
  const stage = normalizeStage(value);

  // ブリンガーの手番が始まった。これから予兆を出すことだけ告げる（中身は omen の押下で）
  if (event?.type === 'turnStart') {
    return event.isBringer
      ? { value, entries: [{ system: STAGE_LOG_NAME, resultText: OMEN_DECLARATION }] }
      : null;
  }
  if (event?.type !== 'step') return null;

  switch (event.stepId) {
    // セットルーチンを開示する。1ラウンドに1つずつ消費する
    case STAGE_STEPS.revealSet: {
      const { index, routine } = nextSetRoutine(stage);
      if (!routine) return null;
      const cursor = withExTransition({ ...stage.cursor, ...advancedSetCursor(stage) }, routine);
      return {
        value: { ...stage, cursor },
        entries: [entryFor(STAGE_LOG_NAME, 'set', index, routine)].filter(Boolean)
      };
    }

    // 予兆を開示する。予告するだけで進行は動かさない
    case STAGE_STEPS.omen: {
      const { kind, index, routine } = nextActionRoutine(stage);
      const omen = entryFor(OMEN_LOG_NAME, kind, index, routine);
      return omen ? { value, entries: [omen] } : null;
    }

    // ブリンガーの行動開始を告げる
    case STAGE_STEPS.actionStart: {
      const name = event.actor?.name?.trim() || '？';
      return { value, entries: [{ system: STAGE_LOG_NAME, resultText: `「${name}」の行動開始` }] };
    }

    // 手番終了。これからルーチンを適用することを告げる（NPCの手番はここで終わる＝何も出さない）
    case STAGE_STEPS.turnEnd: {
      if (!event.isBringer) return null;
      const { kind } = nextActionRoutine(stage);
      return {
        value,
        entries: [{
          system: STAGE_LOG_NAME,
          resultText: `${ROUTINE_KIND_LABELS[kind]}ルーチンを発動します`
        }]
      };
    }

    // アクション／EXルーチンを適用して1つ進める。予兆と同じ中身になるのは
    // どちらも nextActionRoutine 一本を通るから
    case STAGE_STEPS.routine: {
      const { kind, index, routine } = nextActionRoutine(stage);
      if (!routine) return null;
      const cursor = withExTransition(
        { ...stage.cursor, [kind]: (index + 1) % stage[kind].length },
        routine
      );
      return {
        value: { ...stage, cursor },
        entries: [entryFor(STAGE_LOG_NAME, kind, index, routine)].filter(Boolean)
      };
    }

    // 段を抜けるだけ（セットの段を出る・アクションの処理を終えて次の手番へ）
    default:
      return null;
  }
}

// --- GMの操作（拡張ルーム設定の欄から） ---------------------------------------

function routineLabel(kind, index, routine) {
  const name = routine?.name?.trim();
  return routineNumberLabel(kind, index) + (name ? `「${name}」` : '');
}

// その列の進行の位置を動かせる上限。
// セットだけは「件数と同じ位置」＝撃ち切りを表せるので1つ広い。
function cursorMax(stage, kind) {
  return kind === 'set' ? stage.set.length : Math.max(stage[kind].length - 1, 0);
}

/** 「次はセットNo.2「◯◯」」のような1行。画面とログで同じ言い方をするためここに置く */
export function describeCursor(stage, kind) {
  const index = stage.cursor[kind];
  const routine = stage[kind][index];
  if (!routine) return `${ROUTINE_KIND_LABELS[kind]}: 発動するものはありません`;
  return `${ROUTINE_KIND_LABELS[kind]}: 次は${routineLabel(kind, index, routine)}`;
}

/**
 * 舞台の編集とGMの進行操作。Coreの UPDATE_ROOM_EXTENSION から、今の状態に対して呼ばれる。
 * 値を丸ごと送らないので、2人が同時に触っても片方の変更が消えない。
 *
 * @param {object} value 今の状態
 * @param {string} op
 * @param {object} args
 * @returns {{ value: object, logText?: string, entries?: object[] }|null} 何もしないならnull
 */
export function reduceStage(value, op, args) {
  const stage = normalizeStage(value);
  const kind = args?.kind;

  if (op === 'setName') {
    const name = text(args?.value, MAX_STAGE_NAME_LENGTH);
    if (name === stage.name) return null;
    return { value: { ...stage, name } };
  }

  if (op === 'addRoutine') {
    if (!isRoutineKind(kind)) return null;
    const id = args?.id;
    if (typeof id !== 'string' || id === '' || id.length > MAX_ROUTINE_ID_LENGTH) return null;
    if (stage[kind].some(routine => routine.id === id)) return null; // 同じ操作が二重に届いた
    if (stage[kind].length >= MAX_ROUTINES_PER_KIND) return null;
    const added = { id, name: '', effect: '', ...(kind === 'ex' ? {} : { toEx: false }) };
    return { value: normalizeStage({ ...stage, [kind]: [...stage[kind], added] }) };
  }

  if (op === 'removeRoutine') {
    if (!isRoutineKind(kind)) return null;
    const next = stage[kind].filter(routine => routine.id !== args?.id);
    if (next.length === stage[kind].length) return null;
    // 件数が減るので、進行の位置とループ範囲は normalizeStage が丸め直す
    return { value: normalizeStage({ ...stage, [kind]: next }) };
  }

  if (op === 'moveRoutine') {
    if (!isRoutineKind(kind)) return null;
    const list = stage[kind];
    const index = list.findIndex(routine => routine.id === args?.id);
    const to = index + (args?.direction === 'up' ? -1 : 1);
    if (index < 0 || to < 0 || to >= list.length) return null;
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    return { value: { ...stage, [kind]: next } };
  }

  if (op === 'editRoutine') {
    if (!isRoutineKind(kind)) return null;
    const index = stage[kind].findIndex(routine => routine.id === args?.id);
    if (index < 0) return null;
    const current = stage[kind][index];
    const field = args?.field;
    let patch = null;
    if (field === 'name') patch = { name: text(args?.value, MAX_ROUTINE_NAME_LENGTH) };
    else if (field === 'effect') patch = { effect: text(args?.value, MAX_ROUTINE_EFFECT_LENGTH) };
    else if (field === 'toEx' && kind !== 'ex') patch = { toEx: args?.value === true };
    if (!patch) return null;
    const [key] = Object.keys(patch);
    if (current[key] === patch[key]) return null; // 変化なし
    const next = [...stage[kind]];
    next[index] = { ...current, ...patch };
    return { value: { ...stage, [kind]: next } };
  }

  if (op === 'setLoop') {
    const next = normalizeStage({ ...stage, loop: { mode: args?.mode, from: args?.from, to: args?.to } }).loop;
    if (next.mode === stage.loop.mode && next.from === stage.loop.from && next.to === stage.loop.to) return null;
    return {
      value: { ...stage, loop: next },
      logText: next.mode === 'repeat'
        ? `${STAGE_LABEL}: セットルーチンを撃ち切った後は、No.${next.from}〜No.${next.to}を繰り返します。`
        : `${STAGE_LABEL}: セットルーチンを撃ち切った後は、以降実行しません。`
    };
  }

  // --- 誤爆したときの手当て ---

  if (op === 'stepBack' || op === 'stepForward') {
    if (!isRoutineKind(kind)) return null;
    const max = cursorMax(stage, kind);
    const raw = stage.cursor[kind] + (op === 'stepBack' ? -1 : 1);
    // セットは前後に詰める（撃ち切りの位置から1つ戻すと、最後の1件をもう一度撃つ）。
    // アクションとEXは元から輪なので、端は反対側へ回す。
    const next = kind === 'set'
      ? Math.min(Math.max(raw, 0), max)
      : (max === 0 ? 0 : (raw + max + 1) % (max + 1));
    if (next === stage.cursor[kind]) return null;
    const cursor = { ...stage.cursor, [kind]: next };
    const moved = op === 'stepBack' ? '巻き戻しました' : '進めました';
    return {
      value: { ...stage, cursor },
      logText: `${STAGE_LABEL}: 進行を${moved}。${describeCursor({ ...stage, cursor }, kind)}`
    };
  }

  if (op === 'setCursor') {
    if (!isRoutineKind(kind)) return null;
    const next = clampIndex(args?.index, 0, cursorMax(stage, kind));
    if (next === stage.cursor[kind]) return null;
    const cursor = { ...stage.cursor, [kind]: next };
    return {
      value: { ...stage, cursor },
      logText: `${STAGE_LABEL}: ${describeCursor({ ...stage, cursor }, kind)}`
    };
  }

  if (op === 'setExMode') {
    const on = args?.on === true;
    if (on === stage.cursor.inEx) return null;
    const cursor = { ...stage.cursor, inEx: on, ...(on ? { ex: 0 } : {}) };
    return {
      value: { ...stage, cursor },
      logText: on
        ? `${STAGE_LABEL}: EXルーチンへ移行しました。`
        : `${STAGE_LABEL}: EXルーチンへの移行を取り消しました。`
    };
  }

  // 指定の1件を今すぐ発動する。【進行の位置は動かさない】
  // 巻き戻したうえで「代わりにこれを撃つ」ためのものなので、次に撃つものは戻したままにする。
  if (op === 'fireNow') {
    if (!isRoutineKind(kind)) return null;
    const index = stage[kind].findIndex(item => item.id === args?.id);
    const fired = index < 0 ? null : entryFor(STAGE_LOG_NAME, kind, index, stage[kind][index]);
    if (!fired) return null;
    return { value: stage, entries: [fired] };
  }

  if (op === 'resetProgress') {
    const fresh = createStageState().cursor;
    const same = ROUTINE_KINDS.every(name => fresh[name] === stage.cursor[name])
      && fresh.setLooping === stage.cursor.setLooping && fresh.inEx === stage.cursor.inEx;
    if (same) return null;
    return { value: { ...stage, cursor: fresh }, logText: `${STAGE_LABEL}: 進行を最初へ戻しました。` };
  }

  return null;
}

/** 「⋯」→「拡張ルーム設定」へ出す宣言（renderSection と applyRoundEvent は画面側・記述子側で足す） */
export const STAGE_EXTENSION_MODEL = {
  key: STAGE_KEY,
  label: STAGE_LABEL,
  // シナリオ側の仕掛けなので、PLの画面には節ごと出さない
  // （うっかり見えないまで。js/parameters/registry.js の「宣言の形」の節）
  gmOnly: true,
  normalize: normalizeStage,
  reduce: reduceStage
  // resetOnPhaseEnd は持たない（冒頭のコメント参照）
};
