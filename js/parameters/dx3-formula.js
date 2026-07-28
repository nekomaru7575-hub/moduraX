// js/parameters/dx3-formula.js
// エフェクトの「コンボ時修正」欄（文字列）を数値へ解決する。
// {Lv}はこのエフェクト自身のレベルへ、{パラメータ名}は使用者の実効値（基礎値+バフ/デバフ）へ
// 置換したうえで、四則演算のみの安全な式として評価する。JSON経由で共有されるコマ/ルームデータに
// 埋め込まれた文字列をそのまま実行してしまうコード注入を避けるため、eval/Functionは使わない。

import { normalizeComboModFormula } from './dx3-effect-box.js';

// 数値・+ - * / ・丸括弧のみのトークン列に分解する。それ以外の文字（未解決の{...}等）が
// 残っていた場合は例外を投げ、呼び出し側で「評価失敗→0」として扱う。
function tokenize(text) {
  const pattern = /\s*([0-9]+(?:\.[0-9]+)?|[()+\-*/])/y;
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(text);
    if (!match) throw new Error(`unexpected token at ${index}`);
    tokens.push(match[1]);
    index = pattern.lastIndex;
  }
  return tokens;
}

// expr := term (('+'|'-') term)*
function parseExpression(tokens, pos) {
  let { value, rest } = parseTerm(tokens, pos);
  while (tokens[rest] === '+' || tokens[rest] === '-') {
    const op = tokens[rest];
    const next = parseTerm(tokens, rest + 1);
    value = op === '+' ? value + next.value : value - next.value;
    rest = next.rest;
  }
  return { value, rest };
}

// term := factor (('*'|'/') factor)*
function parseTerm(tokens, pos) {
  let { value, rest } = parseFactor(tokens, pos);
  while (tokens[rest] === '*' || tokens[rest] === '/') {
    const op = tokens[rest];
    const next = parseFactor(tokens, rest + 1);
    value = op === '*' ? value * next.value : value / next.value;
    rest = next.rest;
  }
  return { value, rest };
}

// factor := ['+'|'-'] factor | '(' expr ')' | number
function parseFactor(tokens, pos) {
  if (tokens[pos] === '-') {
    const next = parseFactor(tokens, pos + 1);
    return { value: -next.value, rest: next.rest };
  }
  if (tokens[pos] === '+') {
    return parseFactor(tokens, pos + 1);
  }
  if (tokens[pos] === '(') {
    const inner = parseExpression(tokens, pos + 1);
    if (tokens[inner.rest] !== ')') throw new Error('expected )');
    return { value: inner.value, rest: inner.rest + 1 };
  }
  const n = Number(tokens[pos]);
  if (!Number.isFinite(n)) throw new Error('expected number');
  return { value: n, rest: pos + 1 };
}

// 数値・+ - * / ・丸括弧のみからなる文字列を安全に評価する。空文字・構文エラー・
// 評価不能（NaN/Infinity）は0を返す（既存のparseEncroachNumberと同じ「非数値は0」方針）。
export function evaluateArithmeticExpression(text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '') return 0;

  try {
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) return 0;
    const { value, rest } = parseExpression(tokens, 0);
    if (rest !== tokens.length) return 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * エフェクトのコンボ時修正1項目（新形式の文字列、または旧形式{mode,value}）を、
 * 使用者にとっての実際の数値へ解決する。
 * @param {string|{mode?:string,value?:number}|null|undefined} rawMod
 * @param {{ effect: {level?:number}, token: object, getEffectiveParameterValue: (token:object, paramId:string) => number|undefined }} context
 * @returns {number}
 */
export function resolveComboModFormula(rawMod, { effect, token, getEffectiveParameterValue }) {
  const formula = normalizeComboModFormula(rawMod);
  if (!formula.trim()) return 0;

  const substituted = formula.replace(/\{([^{}]+)\}/g, (match, rawName) => {
    const name = rawName.trim();
    if (name === 'Lv') return String(effect?.level || 0);

    const entry = Object.entries(token?.parameters || {}).find(
      ([, p]) => p.label === name || p.key === name
    );
    if (!entry) return match;

    const [paramId] = entry;
    const value = getEffectiveParameterValue(token, paramId);
    return String(value ?? 0);
  });

  return evaluateArithmeticExpression(substituted);
}
