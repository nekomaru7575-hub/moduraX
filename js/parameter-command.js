// js/parameter-command.js
// [演算子(+/-/=)][パラメータ名](,[演算子][パラメータ名])* ([値]) でパラメータを直接変更する
// コマンドの解釈。例: +侵蝕率(10)　=HP(2D6)　+攻撃力,-防御力(1D6)　=状態(毒)
// DOMにもstoreにも触らない（実際の反映とログは js/main.js の tryHandleParameterCommand）。
//
// 対象は参照キャラクターのパラメータを先に探し、無ければ（キャラ未選択なら）同名のルーム変数を使う。
// {パラメータ名}の参照（js/main.jsのsubstituteCharacterParameters）と同じ解決順。
// カンマ区切りの対象ごとに判定するので、キャラのHPとルーム変数を1行で同時に動かせる。
//
// 名前の頭に「t.」を付けると、参照キャラクターではなくターゲット（js/store/targets.js）の
// パラメータを指す（+t.HP(20)）。ルーム変数へは落とさない。自分とターゲットは1行に混ぜられる
// （+HP,-t.HP(5)）。

const PARAMETER_COMMAND_PATTERN = /^([+\-=].+?)\((.+)\)$/;
const PARAMETER_TARGET_PATTERN = /^([+\-=])(.+)$/;
const DICE_AMOUNT_PATTERN = /^\d+[Dd]\d+$/;
// 半角・全角の数字だけでできた文字列は数値とみなす（ルーム変数ダイアログで「１２」と入れると
// 文字列のまま保存されるため）。
const NUMERIC_TEXT_PATTERN = /^[+-]?[0-9０-９]+(?:\.[0-9０-９]+)?$/;

// ターゲットを指す名前の頭。{t.HP}の参照（js/main.jsのsubstituteCharacterParameters）と同じ書き方。
export const TARGET_PARAMETER_PREFIX = 't.';

/**
 * 「t.HP」ならターゲットを指す名前として「HP」を、そうでなければnullを返す。
 * @param {string} name
 * @returns {string|null}
 */
export function stripTargetPrefix(name) {
  if (!name.startsWith(TARGET_PARAMETER_PREFIX)) return null;
  const rest = name.slice(TARGET_PARAMETER_PREFIX.length).trim();
  return rest === '' ? null : rest;
}

/**
 * 値を数値として読めればNumberを、読めなければnullを返す。全角数字は半角にして読む。
 * @param {unknown} value
 * @returns {number|null}
 */
export function toNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!NUMERIC_TEXT_PATTERN.test(trimmed)) return null;
  return Number(trimmed.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)));
}

/**
 * かっこの中身を、数値・ダイス式・文字列のどれかに分ける。
 * @param {string} raw
 * @returns {{kind:'number', value:number} | {kind:'dice', expr:string} | {kind:'string', value:string}}
 */
export function classifyAmount(raw) {
  if (DICE_AMOUNT_PATTERN.test(raw)) return { kind: 'dice', expr: raw };
  const num = toNumericValue(raw);
  if (num !== null) return { kind: 'number', value: num };
  return { kind: 'string', value: raw };
}

// "+HP,-MP" のようなカンマ区切りの指定を { operator, name } の配列に分解する。
// いずれかのトークンが演算子から始まっていない場合はnullを返す（呼び出し側で書式エラー扱い）。
export function parseParameterTargets(rawTargets) {
  const targets = rawTargets.split(',').map(token => {
    const m = token.match(PARAMETER_TARGET_PATTERN);
    return m ? { operator: m[1], name: m[2].trim() } : null;
  });
  return targets.some(t => !t) ? null : targets;
}

function findParamByName(parameters, name) {
  return Object.entries(parameters || {}).find(([, p]) => p.label === name || p.key === name) || null;
}

/**
 * コマンド文字列を解釈し、対象と値を確定させる。1つでも無効な対象があれば何も変えない
 * （部分適用を防ぐ）ため、検査はここで全部済ませる。
 *
 * かっこの中が文字列のときは、書式が合わない・対象が見つからない場合にnull（＝コマンドではない）を返す。
 * 「+_+(汗)」「=w=(笑)」のような普通の発言までエラーで止めないため。
 *
 * @returns {null
 *   | {error:string}
 *   | {amount: ReturnType<typeof classifyAmount>,
 *      targets: {operator:string, scope:'token'|'target'|'room', tokenId:string|null,
 *                paramId:string, param:object, before:any}[]}}
 *
 * targetはターゲットのコマ（無ければnull）。「t.」付きの名前だけがこちらを探す。
 */
export function resolveParameterCommand({ rawInput, character, target = null, roomParameters }) {
  const match = String(rawInput).match(PARAMETER_COMMAND_PATTERN);
  if (!match) return null;

  const [, rawTargets, rawAmount] = match;
  const amount = classifyAmount(rawAmount);
  const isString = amount.kind === 'string';

  const parsedTargets = parseParameterTargets(rawTargets);
  if (!parsedTargets) {
    return isString ? null : { error: `パラメータ指定の書式が正しくありません: ${rawTargets}` };
  }

  const found = [];
  for (const { operator, name } of parsedTargets) {
    const targetParamName = stripTargetPrefix(name);
    if (targetParamName !== null) {
      if (!target) {
        if (isString) return null;
        return { error: 'ターゲットが指定されていません。\nコマをダブルクリックするか、右クリックメニューの「ターゲットにする」で選んでください。' };
      }
      const targetEntry = findParamByName(target.parameters, targetParamName);
      if (!targetEntry) {
        if (isString) return null;
        return { error: `ターゲット「${target.name}」にパラメータ「${targetParamName}」が見つかりません。` };
      }
      const [paramId, param] = targetEntry;
      found.push({ operator, name, scope: 'target', tokenId: target.id, paramId, param });
      continue;
    }

    const tokenEntry = character ? findParamByName(character.parameters, name) : null;
    const roomEntry = tokenEntry ? null : findParamByName(roomParameters, name);
    const entry = tokenEntry || roomEntry;
    if (!entry) {
      if (isString) return null;
      const hint = character ? '' : '\nキャラクターのパラメータを変えるには、参照キャラクターを選んでください。';
      return { error: `パラメータ「${name}」が見つかりません。${hint}` };
    }
    const [paramId, param] = entry;
    found.push({
      operator, name, scope: tokenEntry ? 'token' : 'room', tokenId: tokenEntry ? character.id : null, paramId, param
    });
  }

  const targets = [];
  for (const { operator, name, scope, tokenId, paramId, param } of found) {
    if (param.editable === false) {
      return { error: `パラメータ「${name}」は変更できません。` };
    }
    const before = param.value;
    if (operator !== '=') {
      if (toNumericValue(before) === null) {
        return { error: `パラメータ「${name}」は数値ではないため、+/-では変更できません。` };
      }
      if (isString) {
        return { error: `+/-の値は数値かダイス式で指定してください: ${rawAmount}` };
      }
    } else if (isString && param.source !== 'user') {
      // 文字列を持てるのは利用者が追加した変数だけ（ルーム変数・キャラの編集ダイアログと同じ線引き）
      return { error: `パラメータ「${name}」は数値のパラメータなので、文字列は代入できません。` };
    }
    targets.push({ operator, scope, tokenId, paramId, param, before });
  }

  return { amount, targets };
}

/**
 * 変更後の値。=は代入、+/-は変更前の値を数値として読んで加減する（全角数字の文字列も半角の数値になる）。
 * @param {string} operator
 * @param {any} before
 * @param {number|string} amount
 */
export function computeNextValue(operator, before, amount) {
  if (operator === '=') return amount;
  const base = toNumericValue(before);
  return operator === '+' ? base + amount : base - amount;
}
