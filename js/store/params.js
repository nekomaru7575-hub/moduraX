// js/store/params.js
// パラメータマップ（コマの parameters / room.parameters）を差し替えるための道具立て。
//
// 「手入力で書き換えてよいか（editable）」「消してよいか（locked）」の番はここだけが持つ。
// case 側はこの関数を通し、null が返ってきたら何もしない、という書き方に揃える。

import { normalizeAudience, withMapEntry, withoutMapEntry } from './patch.js';

// 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。
// パラメータが存在しないtokenId/paramIdの組み合わせではundefinedを返す（＝呼び出し側は無視すればよい）。
// baseとなるparameters[paramId].value自体は書き換えない。SET_PARAMETERや「+パラメータ(n)」
// コマンドのような直接編集は常に基礎値を対象にする（実効値を対象にすると編集の度にバフ分が
// 基礎値へ混入し、加算が二重になってしまうため）。
export function getEffectiveParameterValue(token, paramId) {
  const param = token?.parameters?.[paramId];
  if (!param) return undefined;

  // 文字列値のカスタム変数にはバフ加算の意味がない（"abc" + 0 が文字列連結になり
  // 値が壊れる）ため、数値でない場合は基礎値をそのまま返す。
  if (typeof param.value !== 'number') return param.value;

  const buffTotal = (token.buffs || [])
    .filter(b => b.paramId === paramId)
    .reduce((sum, b) => sum + b.delta, 0);

  return param.value + buffTotal;
}

// パラメータマップ（コマのparameters / room.parameters）の1件を差し替える。
// 存在しないparamIdならnull（＝呼び出し側は何もしない）。
export function withParamFields(params, paramId, fields) {
  const param = params[paramId];
  if (!param) return null;
  return withMapEntry(params, paramId, Object.freeze({ ...param, ...fields }));
}

// 上記の「手入力による直接編集」版。editable:falseのパラメータは弾く。
// labelは警告文の主語（'このパラメータ' / 'このルーム変数'）。
export function withEditableParamFields(params, paramId, fields, label) {
  if (params[paramId]?.editable === false) {
    console.warn(`[Guard] ${label}は直接編集できません:`, paramId);
    return null;
  }
  return withParamFields(params, paramId, fields);
}

// パラメータ1件を削除する。locked（削除不可）は弾く。
export function withoutParam(params, paramId, label) {
  const param = params[paramId];
  if (!param) return null;
  if (param.locked) {
    console.warn(`[Guard] ${label}は削除できません:`, paramId);
    return null;
  }
  return withoutMapEntry(params, paramId);
}

// ユーザー定義パラメータ（source:'user'）1件の定義を作る。コマのパラメータとルーム変数で共通。
// visibleは「一覧に表示するか」の指定があるコマのパラメータ側だけが持つ（ルーム変数は常に表示）。
export function buildUserParam({ key, label, value, visible, audience }) {
  const param = { key, label, value, source: 'user', locked: false, editable: true };
  if (visible !== undefined) param.visible = visible;
  // 公開先（null＝全員に見せる）。ルーム変数は常に全員のものなので指定があるときだけ持たせる。
  if (audience !== undefined) param.audience = normalizeAudience(audience);
  return Object.freeze(param);
}

// ユーザー定義パラメータを1件追加する。同じキーが既にあればnull（＝追加しない）。
export function withNewUserParam(params, def) {
  const paramId = `user:${def.key}`;
  if (params[paramId]) return null;
  return withMapEntry(params, paramId, buildUserParam(def));
}
