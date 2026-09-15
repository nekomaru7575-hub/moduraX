// js/dice-roll-recompute.js
// BCDiceで振った後に出目だけを差し替えたとき、結果の文字列をこちらで組み立て直す。
//
// BCDiceは「この目で計算して」とは頼めない（振るところから向こうが持っている）。出目を変える
// 能力（銀剣のステラナイツの「始まりの部屋」）を実装するには、生の出目（rands）を受け取って、
// 合計・成功数・比較の結果をこちらで数え直すしかない。ここはその汎用部分で、どのシステムの
// 能力かは知らない。
//
// 組み立てる文字列はBCDiceの見た目に揃える（"(2D6+3>=10) ＞ 8[3,5]+3 ＞ 11 ＞ 成功"）。
// 最後の「＞」の後ろに最終値を置く形を崩さないこと：js/main.jsのparseFinalDiceNumberが
// そこだけを読んで、パラメータ変更やオリジナル表の出目にしている。
//
// 解釈できる書式だけを扱い、それ以外は null を返す（呼び出し側が「反映できなかった」と伝える）。
// 黙って近い書式として数えると、卓が間違った結果を信じてしまうため。
//
// DOM/windowに触れない純粋な関数だけを置く（テストから直接読む）。

// js/main.jsのsplitRepeatPrefixと同じ形。繰り返しの前置き（x3 / rep3 / repeat3）
const REPEAT_PREFIX_PATTERN = /^(s?)(?:repeat|rep|x)(\d+)[ 　]+(?=\S)/i;
const COMPARE_PATTERN = /^(.*?)(>=|<=|<>|>|<|=)(-?\d+)$/;

/**
 * 繰り返し・シークレットの前置きを剥がす。
 * @returns {{ repeat: number, body: string }}
 */
export function splitRollPrefix(command) {
  let text = String(command ?? '').trim();
  let repeat = 1;
  const repeatMatch = text.match(REPEAT_PREFIX_PATTERN);
  if (repeatMatch) {
    repeat = Number(repeatMatch[2]);
    text = text.slice(repeatMatch[0].length).trim();
  }
  // シークレットダイスの S。BCDiceは結果の(コマンド)からSを外して返すので、こちらも外す。
  // 「S」で始まる本物のコマンド（SKなど）を削らないよう、残りが数字か(かDで始まるときだけ。
  if (/^s(?=[\d(d])/i.test(text)) text = text.slice(1);
  return { repeat, body: text };
}

// --- 四則演算（ダイス項を含められる） ---
// トークン: 数値 / ダイス項 nDm / 演算子 + - * / / 括弧
function tokenize(expr) {
  const tokens = [];
  const pattern = /\s*(?:(\d*)D(\d+)|(\d+)|([+\-*/()]))/iy;
  let index = 0;
  while (index < expr.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(expr);
    if (!match || match[0] === '') return null;
    index = pattern.lastIndex;
    if (match[2] !== undefined) {
      const count = match[1] === '' ? 1 : Number(match[1]);
      tokens.push({ type: 'dice', count, sides: Number(match[2]) });
    } else if (match[3] !== undefined) {
      tokens.push({ type: 'number', value: Number(match[3]), text: match[3] });
    } else {
      tokens.push({ type: 'op', value: match[4] });
    }
  }
  return tokens;
}

// 整数の割り算はRubyと同じ切り捨て（負へ丸める）。0で割るのは解釈しない。
function divide(a, b) {
  if (b === 0) return null;
  return Math.floor(a / b);
}

/**
 * トークン列を評価する。ダイス項は出現順に dice から個数分ずつ取る。
 * @returns {{ value: number, rendered: string }|null}
 */
function evaluateTokens(tokens, dice) {
  let pos = 0;
  let diceIndex = 0;
  let failed = false;

  const peek = () => tokens[pos];
  const fail = () => { failed = true; return { value: 0, rendered: '' }; };

  function primary() {
    const token = peek();
    if (!token) return fail();
    if (token.type === 'op' && token.value === '(') {
      pos += 1;
      const inner = additive();
      if (peek()?.type !== 'op' || peek().value !== ')') return fail();
      pos += 1;
      return { value: inner.value, rendered: `(${inner.rendered})` };
    }
    if (token.type === 'op' && token.value === '-') {
      pos += 1;
      const operand = primary();
      return { value: -operand.value, rendered: `-${operand.rendered}` };
    }
    if (token.type === 'number') {
      pos += 1;
      return { value: token.value, rendered: token.text };
    }
    if (token.type === 'dice') {
      pos += 1;
      const rolled = dice.slice(diceIndex, diceIndex + token.count);
      diceIndex += token.count;
      if (rolled.length !== token.count || rolled.some(die => die.sides !== token.sides)) return fail();
      const values = rolled.map(die => die.value);
      const sum = values.reduce((total, value) => total + value, 0);
      return { value: sum, rendered: `${sum}[${values.join(',')}]` };
    }
    return fail();
  }

  function multiplicative() {
    let left = primary();
    while (!failed && peek()?.type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = peek().value;
      pos += 1;
      const right = primary();
      const value = op === '*' ? left.value * right.value : divide(left.value, right.value);
      if (value === null) return fail();
      left = { value, rendered: `${left.rendered}${op}${right.rendered}` };
    }
    return left;
  }

  function additive() {
    let left = multiplicative();
    while (!failed && peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = peek().value;
      pos += 1;
      const right = multiplicative();
      left = {
        value: op === '+' ? left.value + right.value : left.value - right.value,
        rendered: `${left.rendered}${op}${right.rendered}`
      };
    }
    return left;
  }

  const result = additive();
  if (failed || pos !== tokens.length || diceIndex !== dice.length) return null;
  return result;
}

/**
 * ダイスを含まない整数の式（SKの個数「(5+3)/2」など）を評価する。解釈できなければnull。
 */
export function evaluateArithmetic(expr) {
  const tokens = tokenize(String(expr));
  if (!tokens || tokens.some(token => token.type === 'dice')) return null;
  return evaluateTokens(tokens, [])?.value ?? null;
}

function compare(value, op, target) {
  switch (op) {
    case '>=': return value >= target;
    case '<=': return value <= target;
    case '>': return value > target;
    case '<': return value < target;
    case '=': return value === target;
    case '<>': return value !== target;
    default: return false;
  }
}

function countDiceIn(tokens) {
  return tokens.filter(token => token.type === 'dice').reduce((total, token) => total + token.count, 0);
}

/**
 * 加算ロール（2D6+3>=10 など）を解釈する。
 * @returns {{ diceCount: number, render: (dice: object[]) => string|null }|null}
 */
function parseSumRoll(body) {
  const compareMatch = body.match(COMPARE_PATTERN);
  const expr = compareMatch ? compareMatch[1] : body;
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0 || !tokens.some(token => token.type === 'dice')) return null;

  // 表示用のコマンド。BCDiceは個数を省いた「D6」を「1D6」と書き直して返す
  const echoExpr = tokens.map(token => {
    if (token.type === 'dice') return `${token.count}D${token.sides}`;
    return token.type === 'number' ? token.text : token.value;
  }).join('');
  const echo = compareMatch ? `${echoExpr}${compareMatch[2]}${compareMatch[3]}` : echoExpr;
  // 1D6 だけのときは内訳を出さない（BCDiceの "(1D6) ＞ 5"）
  const isSingleDie = tokens.length === 1 && tokens[0].count === 1;

  return {
    diceCount: countDiceIn(tokens),
    render(dice) {
      const evaluated = evaluateTokens(tokens, dice);
      if (!evaluated) return null;
      const parts = [`(${echo})`];
      if (!isSingleDie) parts.push(evaluated.rendered);
      parts.push(String(evaluated.value));
      if (compareMatch) {
        parts.push(compare(evaluated.value, compareMatch[2], Number(compareMatch[3])) ? '成功' : '失敗');
      }
      return parts.join(' ＞ ');
    }
  };
}

/**
 * バラ振り（3B6 / 3B6+2B6>=4 など）を解釈する。BCDiceは組ごとに昇順へ並べて出す。
 */
function parseBarabaraRoll(body) {
  const compareMatch = body.match(COMPARE_PATTERN);
  const expr = compareMatch ? compareMatch[1] : body;
  if (!/^\d+B\d+(?:\+\d+B\d+)*$/i.test(expr)) return null;

  const groups = expr.split('+').map(term => {
    const [count, sides] = term.split(/B/i).map(Number);
    return { count, sides };
  });
  const echoExpr = groups.map(group => `${group.count}B${group.sides}`).join('+');
  const echo = compareMatch ? `${echoExpr}${compareMatch[2]}${compareMatch[3]}` : echoExpr;

  return {
    diceCount: groups.reduce((total, group) => total + group.count, 0),
    render(dice) {
      let index = 0;
      const shown = [];
      for (const group of groups) {
        const rolled = dice.slice(index, index + group.count);
        index += group.count;
        if (rolled.length !== group.count || rolled.some(die => die.sides !== group.sides)) return null;
        shown.push(...rolled.map(die => die.value).sort((a, b) => a - b));
      }
      const parts = [`(${echo})`, shown.join(',')];
      if (compareMatch) {
        const target = Number(compareMatch[3]);
        parts.push(`成功数${shown.filter(value => compare(value, compareMatch[2], target)).length}`);
      }
      return parts.join(' ＞ ');
    }
  };
}

/**
 * 出目を差し替えたロールの結果文字列を組み立て直す。
 *
 * @param {string} command BCDiceへ送った文字列そのまま（繰り返し・シークレットの前置きを含んでよい）
 * @param {{sides:number, value:number}[]} dice 差し替え後の出目（BCDiceのrandsと同じ並び）
 * @param {{ parsers?: Array<(body: string) => ({diceCount:number, render:(dice:object[])=>string|null}|null)> }} [options]
 *   システム固有の書式（ステラナイツのSKなど）を先に試させる口
 * @returns {string|null} 解釈できなければnull
 */
export function recomputeRollText(command, dice, { parsers = [] } = {}) {
  const { repeat, body } = splitRollPrefix(command);
  if (!body || !Number.isInteger(repeat) || repeat < 1) return null;

  const parsed = [...parsers, parseBarabaraRoll, parseSumRoll]
    .map(parse => parse(body))
    .find(Boolean);
  if (!parsed || parsed.diceCount * repeat !== dice.length) return null;

  const texts = [];
  try {
    for (let i = 0; i < repeat; i += 1) {
      const text = parsed.render(dice.slice(i * parsed.diceCount, (i + 1) * parsed.diceCount));
      if (text === null) return null;
      texts.push(text);
    }
  } catch (error) {
    // 括弧を何万重にも入れ子にした式などで再帰が深くなりすぎた。解釈できない書式と同じ扱いにして、
    // ロールそのものを失敗させない
    if (error instanceof RangeError) return null;
    throw error;
  }
  // 繰り返しはBCDiceと同じく「#1」「#2」の見出しを付けて空行で区切る
  return repeat === 1 ? texts[0] : texts.map((text, i) => `#${i + 1}\n${text}`).join('\n\n');
}
