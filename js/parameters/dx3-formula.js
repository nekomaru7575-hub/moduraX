// js/parameters/dx3-formula.js
// エフェクトの「コンボ時修正」欄（文字列）を数値へ解決する。
// {Lv}はこのエフェクト自身のレベルへ、{パラメータ名}は使用者の実効値（基礎値+バフ/デバフ）へ
// 置換したうえで、四則演算のみの安全な式として評価する。JSON経由で共有されるコマ/ルームデータに
// 埋め込まれた文字列をそのまま実行してしまうコード注入を避けるため、eval/Functionは使わない。
//
// 評価できなかった式を黙って0にすると「修正値を入力したのにバフが付かない」という無反応に
// なるため、analyzeComboModFormulaは値と一緒に「なぜ0になったか」（未解決の名前・構文エラー）を
// 返す。呼び出し側（dx3-combo-box.jsの実行系、dx3-effect-box.jsの入力欄）がそれを表示する。

/**
 * コンボ時修正1項目の保存形を式の文字列へ揃える。
 * 新形式（{formula}）はそのまま、旧形式（{mode,value}）は自動的に式へ変換する
 * （coefficient→"値*({Lv}+{EB})"、fixed→"値"）。
 * @param {{formula?:string, mode?:string, value?:number}|null|undefined} mod
 * @returns {string}
 */
export function normalizeComboModFormula(mod) {
  if (!mod) return '';
  if (typeof mod.formula === 'string') return mod.formula;
  if (typeof mod.value === 'number' || mod.mode) {
    const value = mod.value || 0;
    return mod.mode === 'coefficient' ? `${value}*({Lv}+{EB})` : String(value);
  }
  return '';
}

// 日本語入力のまま書かれた式（＋２＊（）｛｝等）を受け付けるための表記ゆれの吸収。
// NFKCで全角の演算子・数字・括弧はASCIIへ寄る（漢字・かな・全角カタカナは変化しないため、
// {攻撃力}のようなパラメータ名には影響しない）。NFKCの対象外だがマイナスとして書かれやすい
// 記号（−／‐／–／—）だけ個別にハイフンへ寄せる。
const MINUS_LIKE_PATTERN = /[−‐–—]/g;

function normalizeNotation(text) {
  return String(text ?? '').normalize('NFKC').replace(MINUS_LIKE_PATTERN, '-');
}

// {Lv} / {攻撃力} のほか、DX3のルールブック・キャラクターシートの表記に合わせて
// ［LV］のような角括弧も同じ参照として受け付ける（NFKCで［］は[]へ寄る）。
const PLACEHOLDER_PATTERN = /[{[]([^{}[\]]*)[}\]]/g;

// 参照名の照合は表記ゆれ（全角/半角・大文字小文字・前後の空白）を無視する。
function normalizeName(name) {
  return normalizeNotation(name).trim().toLowerCase();
}

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

// 評価に成功したかどうかも返す内部版。空文字は「式なし」として成功扱い（値0）にする。
function tryEvaluate(text) {
  const trimmed = normalizeNotation(text).trim();
  if (trimmed === '') return { value: 0, ok: true };

  try {
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) return { value: 0, ok: true };
    const { value, rest } = parseExpression(tokens, 0);
    if (rest !== tokens.length) return { value: 0, ok: false };
    return Number.isFinite(value) ? { value, ok: true } : { value: 0, ok: false };
  } catch {
    return { value: 0, ok: false };
  }
}

// 数値・+ - * / ・丸括弧のみからなる文字列を安全に評価する。空文字・構文エラー・
// 評価不能（NaN/Infinity）は0を返す（既存のparseEncroachNumberと同じ「非数値は0」方針）。
export function evaluateArithmeticExpression(text) {
  return tryEvaluate(text).value;
}

// 名前（ラベルまたはkey）からパラメータを引く。表記ゆれは無視する。
function findParameterEntryByName(parameters, name) {
  const target = normalizeName(name);
  if (!target) return null;
  return Object.entries(parameters || {}).find(
    ([, p]) => normalizeName(p.label) === target || normalizeName(p.key) === target
  ) ?? null;
}

/**
 * 式で参照できる名前の一覧（診断メッセージ・入力補助用）。
 * @param {Record<string, {label?:string, key?:string}>} parameters
 * @returns {string[]}
 */
export function listFormulaNames(parameters) {
  const labels = Object.values(parameters || {})
    .map(p => p.label)
    .filter(label => typeof label === 'string' && label !== '');
  return ['Lv', ...labels];
}

/**
 * コンボ時修正1項目を数値へ解決し、あわせて「なぜその値になったか」を返す。
 * 値だけ欲しい場合はresolveComboModFormulaを使う。
 * @param {string|{formula?:string,mode?:string,value?:number}|null|undefined} rawMod
 * @param {{ effect: {level?:number}, token: object, getEffectiveParameterValue: (token:object, paramId:string) => number|undefined }} context
 * @returns {{ value:number, formula:string, unresolvedNames:string[], invalidSyntax:boolean, empty:boolean }}
 *   formula: 正規化前の元の式（メッセージ表示用）。unresolvedNames: 解決できなかった{名前}。
 *   invalidSyntax: 四則演算として読めなかった。empty: 式が空（未設定）。
 */
export function analyzeComboModFormula(rawMod, { effect, token, getEffectiveParameterValue }) {
  const formula = normalizeComboModFormula(rawMod).trim();
  if (formula === '') {
    return { value: 0, formula: '', unresolvedNames: [], invalidSyntax: false, empty: true };
  }

  const unresolvedNames = [];
  const substituted = normalizeNotation(formula).replace(PLACEHOLDER_PATTERN, (match, rawName) => {
    const name = rawName.trim();
    if (normalizeName(name) === 'lv') return String(effect?.level || 0);

    const entry = findParameterEntryByName(token?.parameters, name);
    if (!entry) {
      unresolvedNames.push(name);
      return match;
    }

    const [paramId] = entry;
    const value = getEffectiveParameterValue(token, paramId);
    return String(value ?? 0);
  });

  const { value, ok } = tryEvaluate(substituted);
  return { value, formula, unresolvedNames, invalidSyntax: !ok, empty: false };
}

/**
 * エフェクトのコンボ時修正1項目（新形式の文字列、または旧形式{mode,value}）を、
 * 使用者にとっての実際の数値へ解決する。
 * @param {string|{mode?:string,value?:number}|null|undefined} rawMod
 * @param {{ effect: {level?:number}, token: object, getEffectiveParameterValue: (token:object, paramId:string) => number|undefined }} context
 * @returns {number}
 */
export function resolveComboModFormula(rawMod, context) {
  return analyzeComboModFormula(rawMod, context).value;
}
