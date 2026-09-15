// js/parameters/stella-knights-starting-room.js
// 銀剣のステラナイツのスキル「始まりの部屋」：発動するとラウンド終了まで、振ったd6の目aをbとして扱う。
//
// 部屋全体に掛かる効果なので、コマのcomponentsではなく部屋の拡張データ
// （room.extensions.STELLA_KNIGHTS.startingRoom。Coreの「拡張ルーム設定」）に持つ。
// 画面はjs/parameters/stella-knights-starting-room-section.js、ここは状態とダイスの計算だけ。
//
// 【規則】
//   ・複数発動でき、効果は重なる
//   ・発動した順に1つずつ当てる。変えた後の目も、後の発動で続けて変わる
//     （1→6, 6→1 なら 1 は 1→6→1 で1に戻る。1→5, 5→3 なら 1 は3になる）
// 規則そのものはBCDiceのSKの「,k>l」（宣言順に連鎖）と同じだが、SK以外の振り方（D6・B6・
// charge）にも効かせるため、生の出目を受け取ってこちらで変え、結果を数え直す
// （Core汎用の部分はjs/dice-roll-recompute.js）。
//
// DOM/windowに触れない純粋な関数だけを置く（テストから直接読む）。

import { evaluateArithmetic, recomputeRollText } from '../dice-roll-recompute.js';

export const STARTING_ROOM_KEY = 'startingRoom';
export const STARTING_ROOM_LABEL = '始まりの部屋';
// 1つの部屋で同時に持てる数。卓で実際に重ねる数（せいぜい数個）より十分大きく、
// 取り込んだJSONで大量に持ち込まれても部屋の状態が太らない値
export const MAX_STARTING_ROOM_RULES = 20;
const MAX_RULE_ID_LENGTH = 64;
const FACE_SIDES = 6;

function isFace(value) {
  return Number.isInteger(value) && value >= 1 && value <= FACE_SIDES;
}

/** 空の状態 */
export function createStartingRoomState() {
  return { rules: [] };
}

/**
 * 保存データ・取り込んだJSON（信用しない）を正規形へ整える。
 * 目が1〜6の整数でない行・idの無い行・idの重複・同じ目への変換は落とす。
 */
export function normalizeStartingRoom(raw) {
  const list = Array.isArray(raw?.rules) ? raw.rules : [];
  const seen = new Set();
  const rules = [];
  for (const rule of list) {
    if (rules.length >= MAX_STARTING_ROOM_RULES) break;
    const id = rule?.id;
    if (typeof id !== 'string' || id === '' || id.length > MAX_RULE_ID_LENGTH || seen.has(id)) continue;
    if (!isFace(rule.from) || !isFace(rule.to) || rule.from === rule.to) continue;
    seen.add(id);
    rules.push({ id, from: rule.from, to: rule.to });
  }
  return { rules };
}

/**
 * 発動と解除。Coreの UPDATE_ROOM_EXTENSION から、今の状態に対して呼ばれる
 * （値を丸ごと送らないので、2人が同時に発動しても片方が消えない）。
 *
 * @param {object} value 今の状態（正規形）
 * @param {'add'|'remove'} op
 * @param {object} args add: { id, from, to } / remove: { id }
 * @returns {{ value: object, logText: string }|null} 何もしないならnull
 */
export function reduceStartingRoom(value, op, args) {
  const current = normalizeStartingRoom(value);

  if (op === 'add') {
    const from = Number(args?.from);
    const to = Number(args?.to);
    const id = args?.id;
    if (!isFace(from) || !isFace(to) || from === to) return null;
    if (typeof id !== 'string' || id === '' || id.length > MAX_RULE_ID_LENGTH) return null;
    if (current.rules.some(rule => rule.id === id)) return null;
    if (current.rules.length >= MAX_STARTING_ROOM_RULES) return null;
    return {
      value: { rules: [...current.rules, { id, from, to }] },
      logText: `${STARTING_ROOM_LABEL}を発動しました：${from}の目 → ${to}の目（ラウンド終了まで）`
    };
  }

  if (op === 'remove') {
    const target = current.rules.find(rule => rule.id === args?.id);
    if (!target) return null;
    return {
      value: { rules: current.rules.filter(rule => rule !== target) },
      logText: `${STARTING_ROOM_LABEL}を解除しました：${target.from}の目 → ${target.to}の目`
    };
  }

  return null;
}

/** ラウンドが終わったら全部消す。変わらなければ同じ参照を返す */
export function resetStartingRoomOnPhaseEnd(value, phase) {
  if (phase !== 'round') return { value, logText: '' };
  const current = normalizeStartingRoom(value);
  if (current.rules.length === 0) return { value, logText: '' };
  return {
    value: createStartingRoomState(),
    logText: `ラウンド終了により、${STARTING_ROOM_LABEL}の効果（${formatRules(current.rules)}）が終了しました。`
  };
}

/** 1個の目に、発動した順に規則を当てた最終の目 */
export function applyStartingRoomRules(value, rules) {
  return (rules || []).reduce((current, rule) => (current === rule.from ? rule.to : current), value);
}

/**
 * 目の対応表（1〜6それぞれの最終の目）。規則を発動順に当てた結果を先に引いておく。
 * 元の目に戻る目（1→6, 6→1 の1）も表には載るので、変わったかどうかは値で比べること。
 * @returns {Map<number, number>}
 */
export function buildFaceMap(rules) {
  const map = new Map();
  for (let face = 1; face <= FACE_SIDES; face += 1) map.set(face, applyStartingRoomRules(face, rules));
  return map;
}

/** 規則を発動した順に「1→5, 5→3」の形にする */
function formatRules(rules) {
  return rules.map(rule => `${rule.from}→${rule.to}`).join(', ');
}

// --- アタック判定 nSK[d][,k>l,...] ---
// BCDiceのStellarKnightsと同じ形（個数は (5+3)/2 のような式も書ける）。
// コマンド自身の「,k>l」は、始まりの部屋を当てた後に BCDice と同じく書いた順に連鎖させて当てる
// （そちらはコマンドを打った人がその場で宣言した変換で、始まりの部屋の規則ではないため）。
const SK_PATTERN = /^([()+/\d]+)SK(\d)?((?:,\d>\d)+)?$/i;

function parseStellaKnightsAttack(body) {
  const match = body.match(SK_PATTERN);
  if (!match) return null;
  const count = evaluateArithmetic(match[1]);
  if (!Number.isInteger(count) || count < 0) return null;

  const defense = match[2] === undefined ? null : Number(match[2]);
  const changes = match[3]
    ? match[3].slice(1).split(',').map(pair => pair.split('>').map(Number))
    : [];
  const echo = `${count}SK${match[2] ?? ''}${match[3] ?? ''}`;

  return {
    diceCount: count,
    render(dice) {
      if (dice.some(die => die.sides !== FACE_SIDES)) return null;
      const values = dice.map(die => die.value);
      const parts = [`(${echo})`, [...values].sort((a, b) => a - b).join(',')];
      let finalValues = values;
      if (changes.length > 0) {
        finalValues = changes.reduce(
          (current, [from, to]) => current.map(value => (value === from ? to : value)),
          values
        );
        parts.push(`[${[...finalValues].sort((a, b) => a - b).join(',')}]`);
      }
      if (defense !== null) {
        parts.push(`成功数: ${finalValues.filter(value => value >= defense).length}`);
      }
      return parts.join(' ＞ ');
    }
  };
}

/**
 * BCDiceの結果に始まりの部屋を当てる（Coreの transformRollResult から呼ばれる）。
 *
 * ・d6の目だけを変える（2D6+1D10 の d10 はそのまま）
 * ・目が1つも変わらなければ、同じ参照を返す
 * ・書式を解釈して数え直せたら、出目と結果文字列を差し替え、何をどう変えたかを1行添える
 * ・数え直せない書式なら、BCDiceの結果をそのまま残し、反映できなかったことを添える
 *   （出目も差し替えない。文字列と3Dダイス・プールの目が食い違わないように）
 *
 * @param {{ command: string, result: object, rules: object[] }} args
 * @returns {object} result と同じ形
 */
export function transformStellaKnightsRoll({ command, result, rules }) {
  if (!result?.success || !Array.isArray(result.diceValues) || !rules?.length) return result;

  const faceMap = buildFaceMap(rules);
  const original = result.diceValues;
  let changed = false;
  const mapped = original.map(die => {
    // 巡って元の目に戻ったもの（1→6, 6→1 の1）は変わっていない扱い
    if (die?.sides !== FACE_SIDES || !faceMap.has(die.value) || faceMap.get(die.value) === die.value) return die;
    changed = true;
    return { ...die, value: faceMap.get(die.value) };
  });
  if (!changed) return result;

  const d6Values = (dice) => dice.filter(die => die?.sides === FACE_SIDES).map(die => die.value).join(',');
  const recomputed = recomputeRollText(command, mapped, { parsers: [parseStellaKnightsAttack] });

  // 添える1行は結果の前に置く。後ろに置くと、最後の「＞」の後ろを最終値として読む処理
  // （js/main.jsのparseFinalDiceNumber）が、この行の数字を拾ってしまう
  if (recomputed === null) {
    return {
      ...result,
      resultText: `⚠ ${STARTING_ROOM_LABEL}（${formatRules(rules)}）を反映できない書式です`
        + `（変換後の出目: ${d6Values(mapped)}）\n${result.resultText}`
    };
  }
  return {
    ...result,
    diceValues: mapped,
    resultText: `［${STARTING_ROOM_LABEL} ${formatRules(rules)}］出目 ${d6Values(original)} → ${d6Values(mapped)}\n${recomputed}`
  };
}

// Coreの「拡張ルーム設定」へ渡す宣言（画面の描画は記述子側で足す）
export const STARTING_ROOM_EXTENSION_MODEL = {
  key: STARTING_ROOM_KEY,
  label: STARTING_ROOM_LABEL,
  normalize: normalizeStartingRoom,
  reduce: reduceStartingRoom,
  resetOnPhaseEnd: resetStartingRoomOnPhaseEnd
};
