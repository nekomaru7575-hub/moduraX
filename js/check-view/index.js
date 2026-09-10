// js/check-view/index.js
// 拡張判定UIのビューの表。判定UIを1つ足す作業は、
//
//   1. js/check-view/ にビューを1本書く（下の契約を満たすオブジェクトを返す関数）
//   2. この表に1行足す
//   3. プラグインの記述子に宣言を1つ足す（js/parameters/registry.js の CHECK_VIEWS）
//
// の3つだけで終わる。器（js/check-panel.js）はビューの中身を一切解釈しない。
//
// 【ビューの契約】
//   id        … 'diceDraft' のような短い名前（この表のキーと揃える）
//   title     … (spec) => string。パネルの見出しに出す名前
//   renderKey … (ctx) => object。**参照比較**で描き直しの要否を決める材料。
//                器は tokenId / pluginId / コマ名 / 操作できるか を常に見るので、
//                ビューはそれ以外（自分が読む components やパラメータ）だけを返せばよい
//   render    … (ctx) => void。ctx.container の中身を組む。**器は container を消さない**
//                ので、組み直すのか作り置きを使い回すのかはビューが決める
//
// 【ctx の中身】
//   container, spec, token, canEdit
//   getToken()                      … 常に最新のコマ（描画中に状態が動くため）
//   dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice
//   requestRender()                 … ビュー内の見た目だけの状態を変えた後に呼ぶ
//   setBusy(boolean)                … ドラッグ中など、器に描き直させたくない間 true

import { createDiceDraftView } from './dice-draft-view.js';
import { createSkillTableView } from './skill-table-view.js';

/** ビューID → ビューを1つ作る関数。パネルは今の部屋のぶんだけを作って持つ。 */
export const CHECK_VIEW_FACTORIES = {
  diceDraft: createDiceDraftView,
  skillTable: createSkillTableView
};
