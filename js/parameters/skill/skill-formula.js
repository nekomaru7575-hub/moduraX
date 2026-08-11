// js/parameters/skill/skill-formula.js
// スキル（キャラが選んで取得する能力。DX3のエフェクト、シノビガミの忍法等）の各所に書ける
// 「式」を数値・真偽値へ解決する。js/parameters/dx3-formula.jsを一般化したもので、
// DX3固有だった{Lv}の特別扱いを「スキル自身のフィールドを名前で引く」へ置き換えてある。
//
// 式に書ける{名前}は2種類：
//   - スキル自身のフィールド（specがformulaNameを宣言したもの。DX3なら{Lv}）
//   - 使用者のパラメータ（ラベルまたはkeyで一致。実効値＝基礎値＋バフ/デバフを読む）
//
// JSON経由で共有されるコマ/ルームデータに埋め込まれた文字列をそのまま実行してしまう
// コード注入を避けるため、eval/Functionは使わない（数値・+ - * / ・( ) だけのトークナイザ）。
//
// 評価できなかった式を黙って0にすると「修正値を入力したのにバフが付かない」という無反応に
// なるため、analyzeFormulaは値と一緒に「なぜ0になったか」（未解決の名前・構文エラー）を
// 返す。呼び出し側（skill-use.jsの実行系、skill-box.jsの入力欄）がそれを表示する。
//
// このファイルはDOMに触れない（server/index.jsがgame-store.js経由でプラグインをimportする
// ため、Node環境でも読み込める必要がある）。

/**
 * 修正値1項目の保存形を式の文字列へ揃える。
 * 新形式（{formula}）と素の文字列はそのまま、DX3の旧形式（{mode,value}）は自動的に式へ
 * 変換する（coefficient→"値*({Lv}+{EB})"、fixed→"値"）。
 * @param {string|{formula?:string, mode?:string, value?:number}|null|undefined} mod
 * @returns {string}
 */
export function normalizeFormula(mod) {
  if (mod === null || mod === undefined) return '';
  if (typeof mod === 'string') return mod;
  // 最初期のDX3データは修正値を素の数値で持っていた（combo:{checkDice: 2}）。
  // 旧dx3-formula.jsはこれを読めず黙って0にしていたが、意図は明らかなので拾う。
  if (typeof mod === 'number') return Number.isFinite(mod) ? String(mod) : '';
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
// 評価不能（NaN/Infinity）は0を返す（「非数値は0」方針）。
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
 * その欄がこのスキルで意味を持つか（シノビガミの「間合は攻撃忍法だけ」）。
 * availableWhenを宣言していない欄は常に有効。
 *
 * 本来はskill-model.js側の関心だが、式の評価（下のbuildSkillFieldLookup）でも同じ規則が
 * 要るのに、このファイルはskill-model.jsをimportできない（あちらがこちらをimportしていて
 * 循環する）。そこで最下層のここに定義し、skill-model.jsから再公開している。
 * 判定の実体はこの1か所だけ。
 *
 * @param {object} field specのfields[]の1件
 * @param {Record<string, any>} fields そのスキルのフィールド値一式
 */
export function isFieldAvailable(field, fields) {
  if (typeof field?.availableWhen !== 'function') return true;
  return !!field.availableWhen(fields ?? {});
}

// スキル自身のフィールドを式から引くための対応表を作る。
// specのfieldsのうちformulaNameを宣言したものだけが式に書ける（DX3なら level → {Lv}）。
// specもskillも無い呼び出し（パラメータだけを参照する式）では空の表になる。
function buildSkillFieldLookup(spec, skill) {
  const lookup = new Map();
  (spec?.fields || []).forEach(field => {
    if (!field.formulaName) return;
    // そのスキルで意味を持たない欄（シノビガミの「攻撃忍法以外の間合」）は0として扱う。
    // 保存値は残っているので、ここで見ないと消したはずの値が式に効いてしまう。
    if (!isFieldAvailable(field, skill?.fields)) {
      lookup.set(normalizeName(field.formulaName), 0);
      return;
    }
    const raw = skill?.fields?.[field.key];
    const value = Number(raw);
    lookup.set(normalizeName(field.formulaName), Number.isFinite(value) ? value : 0);
  });
  return lookup;
}

/**
 * 式で参照できる名前の一覧（診断メッセージ・入力補助用）。
 * @param {object|null} spec createSkillSpecの戻り値
 * @param {Record<string, {label?:string, key?:string}>} parameters
 * @returns {string[]}
 */
export function listFormulaNames(spec, parameters) {
  const fieldNames = (spec?.fields || [])
    .map(field => field.formulaName)
    .filter(Boolean);
  const labels = Object.values(parameters || {})
    .map(p => p.label)
    .filter(label => typeof label === 'string' && label !== '');
  return [...fieldNames, ...labels];
}

/**
 * 式1本を数値へ解決し、あわせて「なぜその値になったか」を返す。
 * 値だけ欲しい場合はresolveFormulaを使う。
 * @param {string|{formula?:string,mode?:string,value?:number}|null|undefined} rawFormula
 * @param {{
 *   spec?: object|null, skill?: object|null,
 *   token: object, getEffectiveParameterValue: (token:object, paramId:string) => number|undefined
 * }} context
 * @returns {{ value:number, formula:string, unresolvedNames:string[], invalidSyntax:boolean, empty:boolean }}
 *   formula: 正規化前の元の式（メッセージ表示用）。unresolvedNames: 解決できなかった{名前}。
 *   invalidSyntax: 四則演算として読めなかった。empty: 式が空（未設定）。
 */
export function analyzeFormula(rawFormula, { spec = null, skill = null, token, getEffectiveParameterValue }) {
  const formula = normalizeFormula(rawFormula).trim();
  if (formula === '') {
    return { value: 0, formula: '', unresolvedNames: [], invalidSyntax: false, empty: true };
  }

  const fieldLookup = buildSkillFieldLookup(spec, skill);
  const unresolvedNames = [];
  const substituted = normalizeNotation(formula).replace(PLACEHOLDER_PATTERN, (match, rawName) => {
    const name = rawName.trim();

    // スキル自身のフィールド（{Lv}等）を先に見る。パラメータ側に同名のラベルがあっても、
    // スキルに書かれた名前はスキル自身を指すのが自然なため。
    const fieldValue = fieldLookup.get(normalizeName(name));
    if (fieldValue !== undefined) return String(fieldValue);

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
 * 式1本を、使用者にとっての実際の数値へ解決する。
 * @param {string|{mode?:string,value?:number}|null|undefined} rawFormula
 * @param {object} context analyzeFormulaと同じ
 * @returns {number}
 */
export function resolveFormula(rawFormula, context) {
  return analyzeFormula(rawFormula, context).value;
}

// 使用条件（「〇〇が△以下」等）で使える比較子。保存されるのはこのキー側なので、
// 表示ラベルを変えても保存済みデータは壊れない。
export const COMPARATORS = [
  { key: 'lte', label: '≦', test: (a, b) => a <= b },
  { key: 'lt', label: '＜', test: (a, b) => a < b },
  { key: 'eq', label: '＝', test: (a, b) => a === b },
  { key: 'ne', label: '≠', test: (a, b) => a !== b },
  { key: 'gte', label: '≧', test: (a, b) => a >= b },
  { key: 'gt', label: '＞', test: (a, b) => a > b }
];

const COMPARATOR_BY_KEY = new Map(COMPARATORS.map(c => [c.key, c]));

export function comparatorLabel(key) {
  return COMPARATOR_BY_KEY.get(key)?.label ?? '≦';
}

/**
 * 使用条件1件（左辺の式・比較子・右辺の式）を判定する。
 * 左右どちらかの式が評価できなかった場合はsatisfied:falseとせず、理由（problem）を添えて
 * 「判定不能」として返す。呼び出し側（skill-use.js）が、無反応にならないよう扱いを決める。
 * @param {{left:string, comparator:string, right:string}} condition
 * @param {object} context analyzeFormulaと同じ
 * @returns {{ satisfied:boolean, problem:string|null, text:string }}
 *   text: 「HP ≦ 10（実際: 12 ≦ 10）」のような、ログ・警告へそのまま出せる説明。
 */
export function evaluateCondition(condition, context) {
  const comparator = COMPARATOR_BY_KEY.get(condition?.comparator) ?? COMPARATOR_BY_KEY.get('lte');
  const left = analyzeFormula(condition?.left, context);
  const right = analyzeFormula(condition?.right, context);

  const describe = (side) => {
    if (side.unresolvedNames.length > 0) return `「${side.unresolvedNames.join('」「')}」を解決できません`;
    if (side.invalidSyntax) return `「${side.formula}」を式として読めません`;
    return null;
  };
  const problem = describe(left) || describe(right);

  const text = `${left.formula || 0} ${comparator.label} ${right.formula || 0}`
    + `（実際: ${left.value} ${comparator.label} ${right.value}）`;

  return {
    satisfied: comparator.test(left.value, right.value),
    problem,
    text
  };
}
