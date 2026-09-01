---
source: js/parameters/saikoro-fiction/skill-table.js
lines: 564
exports: 32
imported_by: 3
api_sha: d5333af35911
prose_sha: d5333af35911
generated: 2026-09-01
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table.js

<!-- prose:summary -->
サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系の特技表そのもののデータモデル。格子の座標、習得状態、ギャップを踏まえた距離計算（列間・セル間・最も近い習得特技の探索）を持つ純粋モジュールで、システム固有の特技名は含まない。「失われうる枠」（spec.slots。シノビガミの生命力、インセインの恐怖心）と、マス1つを潰す「使えない印」（spec.cellDisable / state.disabledCells。シノビガミの変調「マヒ」）もここが持つ。どちらも効くのは findNearestAcquired の側だけで、印の付いた特技は代用元の候補から外れる＝習得していないものとして距離を測る（目標にはできる）。左右を繋ぐか（cyclic）と上下を繋ぐか（verticalCyclic）はどちらもキャラクターごとの設定で、spec の値はその初期値でしかない。互いに独立で、両方入れれば表はトーラスになる（左右はギャップを跨ぐぶんの加算があり、上下は行の差だけ）。判定コマンドに渡す値まわりでは、`spec.check.options`（既定値と丸めの上下限）と `spec.check.modifiers`（判定ボックスに並べる修正値の入力欄。値の置き場はコマのパラメータ）の宣言を読む口だけを持ち、どの修正がどこへ効くかは解釈しない。
<!-- /prose:role -->

## export（32）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 83 | fn | createSkillTableSpec | `createSkillTableSpec(definition)` | id: string, columns: {key:string, label:string}[], rows: number[], 出目のラベル（例: [2,3,...,12]） cells: string[][]… |
| 146 | fn | hasColumnSlots | `hasColumnSlots(spec)` |  |
| 150 | fn | hasExtraSlots | `hasExtraSlots(spec)` |  |
| 154 | fn | extraSlotMax | `extraSlotMax(spec)` |  |
| 158 | fn | isColumnLost | `isColumnLost(state, columnKey)` |  |
| 162 | fn | isExtraSlotLost | `isExtraSlotLost(state, index)` |  |
| 171 | fn | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | その列の特技が使えなくなっているか。 |
| 178 | fn | countRemainingSlots | `countRemainingSlots(spec, state)` | 残っている枠の数。 |
| 185 | fn | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 列の枠の喪失をトグルした新しいstateを返す |
| 193 | fn | toggleExtraSlot | `toggleExtraSlot(state, index)` | 追加枠の喪失をトグルした新しいstateを返す |
| 205 | fn | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 追加枠の個数を変えた新しいstateを返す。 |
| 227 | fn | checkModifiers | `checkModifiers(spec)` | 判定ボックスに並べる修正値の入力欄の宣言。 |
| 235 | fn | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 修正を足した後の値を、整数化してmin/maxへ丸める。 |
| 251 | fn | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 列index・行indexからセルIDを組み立てる |
| 260 | fn | getCell | `getCell(spec, cellId)` | セルIDを解決する。 |
| 280 | fn | findCellIdByName | `findCellIdByName(spec, rawText)` | 特技名（"隠形術"）または「分野:出目」（"忍術:7" / "ninjutsu:7"）からセルIDを引く。 |
| 303 | fn | createEmptySkillTableState | `createEmptySkillTableState(spec)` | --------------------------------------------------------------------------- 状態（キャラクターの components.skillTable… |
| 317 | fn | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 保存済みデータを安全な形に正規化する。 |
| 365 | fn | isAcquired | `isAcquired(state, cellId)` |  |
| 369 | fn | isGapFilled | `isGapFilled(state, gapIndex)` |  |
| 374 | fn | toggleAcquired | `toggleAcquired(state, cellId)` | 取得状態をトグルした新しいstateを返す（元のstateは変更しない） |
| 394 | fn | hasCellDisable | `hasCellDisable(spec)` | --------------------------------------------------------------------------- マス1つの「使えない」印（シノビガミの変調「マヒ」） 効くのは代… |
| 398 | fn | isCellDisabled | `isCellDisabled(state, cellId)` |  |
| 403 | fn | toggleCellDisabled | `toggleCellDisabled(state, cellId)` | 「使えない」印をトグルした新しいstateを返す。 |
| 415 | fn | toggleCyclic | `toggleCyclic(state)` | 左右を繋ぐかをトグルした新しいstateを返す。 |
| 423 | fn | toggleVerticalCyclic | `toggleVerticalCyclic(state)` | 上下を繋ぐかをトグルした新しいstateを返す。 |
| 428 | fn | toggleGap | `toggleGap(state, gapIndex)` | ギャップの塗りつぶしをトグルした新しいstateを返す |
| 445 | fn | columnDistance | `columnDistance(spec, state, colA, colB)` | 列Aから列Bまでの横方向の距離。 |
| 483 | fn | rowDistance | `rowDistance(spec, state, rowA, rowB)` | 行Aから行Bまでの縦方向の距離。 |
| 493 | fn | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | セル間の距離。 |
| 512 | fn | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 目標のセルに一番近い「取得済み」のセルを探す。 |
| 546 | fn | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 目標の特技に対する判定内容を解決する。 |

## トップレベル関数（LOCAL TASKS 候補）（32）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 83 | createSkillTableSpec | `createSkillTableSpec(definition)` | 55 | ✓ |
| 146 | hasColumnSlots | `hasColumnSlots(spec)` | 3 | ✓ |
| 150 | hasExtraSlots | `hasExtraSlots(spec)` | 3 | ✓ |
| 154 | extraSlotMax | `extraSlotMax(spec)` | 3 | ✓ |
| 158 | isColumnLost | `isColumnLost(state, columnKey)` | 3 | ✓ |
| 162 | isExtraSlotLost | `isExtraSlotLost(state, index)` | 3 | ✓ |
| 171 | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | 5 | ✓ |
| 178 | countRemainingSlots | `countRemainingSlots(spec, state)` | 5 | ✓ |
| 185 | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 6 | ✓ |
| 193 | toggleExtraSlot | `toggleExtraSlot(state, index)` | 6 | ✓ |
| 205 | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 8 | ✓ |
| 227 | checkModifiers | `checkModifiers(spec)` | 3 | ✓ |
| 235 | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 14 | ✓ |
| 251 | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 3 | ✓ |
| 260 | getCell | `getCell(spec, cellId)` | 15 | ✓ |
| 280 | findCellIdByName | `findCellIdByName(spec, rawText)` | 18 | ✓ |
| 303 | createEmptySkillTableState | `createEmptySkillTableState(spec)` | 6 | ✓ |
| 317 | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 47 | ✓ |
| 365 | isAcquired | `isAcquired(state, cellId)` | 3 | ✓ |
| 369 | isGapFilled | `isGapFilled(state, gapIndex)` | 3 | ✓ |
| 374 | toggleAcquired | `toggleAcquired(state, cellId)` | 11 | ✓ |
| 394 | hasCellDisable | `hasCellDisable(spec)` | 3 | ✓ |
| 398 | isCellDisabled | `isCellDisabled(state, cellId)` | 3 | ✓ |
| 403 | toggleCellDisabled | `toggleCellDisabled(state, cellId)` | 6 | ✓ |
| 415 | toggleCyclic | `toggleCyclic(state)` | 3 | ✓ |
| 423 | toggleVerticalCyclic | `toggleVerticalCyclic(state)` | 3 | ✓ |
| 428 | toggleGap | `toggleGap(state, gapIndex)` | 6 | ✓ |
| 445 | columnDistance | `columnDistance(spec, state, colA, colB)` | 32 | ✓ |
| 483 | rowDistance | `rowDistance(spec, state, rowA, rowB)` | 5 | ✓ |
| 493 | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | 7 | ✓ |
| 512 | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 21 | ✓ |
| 546 | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 18 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
枠を失った分野の特技は「代用元にならない」だけで、判定の目標にはできる（resolveSkillCheck）。ここを塞ぐと、その分野の特技が一切振れなくなる。「使えない印」（マヒ）も同じで、塞ぐのは代用元の側だけ。

`state.disabledCells` は `state.acquired` の部分集合という不変条件を持つ。normalizeSkillTableState が取得していないセルIDの印を捨て、toggleAcquired が取得を外すときに印も一緒に落とす。ここを緩めると、表に出ない印が距離計算にだけ効く（＝目標値が理由もなく上がる）状態を作れてしまう。

`spec.check.options` は入力欄ではない。既定値と、修正を足した後に丸める上下限で、normalizeCheckOptions がその関門になっている。卓がいじるのは `spec.check.modifiers` の側で、そちらの値はコマのパラメータに入っている。
<!-- /prose:notes -->
