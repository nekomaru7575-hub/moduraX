---
source: js/parameters/saikoro-fiction/skill-table.js
lines: 532
exports: 30
imported_by: 3
api_sha: 37954c9a768f
prose_sha: 37954c9a768f
generated: 2026-08-21
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table.js

<!-- prose:summary -->
サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系の特技表そのもののデータモデル。格子の座標、習得状態、ギャップを踏まえた距離計算（列間・セル間・最も近い習得特技の探索）を持つ純粋モジュールで、システム固有の特技名は含まない。「失われうる枠」（spec.slots。シノビガミの生命力、インセインの恐怖心）と、マス1つを潰す「使えない印」（spec.cellDisable / state.disabledCells。シノビガミの変調「マヒ」）もここが持つ。どちらも効くのは findNearestAcquired の側だけで、印の付いた特技は代用元の候補から外れる＝習得していないものとして距離を測る（目標にはできる）。左右を繋ぐか（cyclic）はキャラクターごとの設定で、spec の値はその初期値でしかない。判定コマンドに渡す値まわりでは、`spec.check.options`（既定値と丸めの上下限）と `spec.check.modifiers`（判定ボックスに並べる修正値の入力欄。値の置き場はコマのパラメータ）の宣言を読む口だけを持ち、どの修正がどこへ効くかは解釈しない。
<!-- /prose:role -->

## export（30）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 77 | fn | createSkillTableSpec | `createSkillTableSpec(definition)` | id: string, columns: {key:string, label:string}[], rows: number[], 出目のラベル（例: [2,3,...,12]） cells: string[][]… |
| 139 | fn | hasColumnSlots | `hasColumnSlots(spec)` |  |
| 143 | fn | hasExtraSlots | `hasExtraSlots(spec)` |  |
| 147 | fn | extraSlotMax | `extraSlotMax(spec)` |  |
| 151 | fn | isColumnLost | `isColumnLost(state, columnKey)` |  |
| 155 | fn | isExtraSlotLost | `isExtraSlotLost(state, index)` |  |
| 164 | fn | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | その列の特技が使えなくなっているか。 |
| 171 | fn | countRemainingSlots | `countRemainingSlots(spec, state)` | 残っている枠の数。 |
| 178 | fn | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 列の枠の喪失をトグルした新しいstateを返す |
| 186 | fn | toggleExtraSlot | `toggleExtraSlot(state, index)` | 追加枠の喪失をトグルした新しいstateを返す |
| 198 | fn | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 追加枠の個数を変えた新しいstateを返す。 |
| 220 | fn | checkModifiers | `checkModifiers(spec)` | 判定ボックスに並べる修正値の入力欄の宣言。 |
| 228 | fn | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 修正を足した後の値を、整数化してmin/maxへ丸める。 |
| 244 | fn | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 列index・行indexからセルIDを組み立てる |
| 253 | fn | getCell | `getCell(spec, cellId)` | セルIDを解決する。 |
| 273 | fn | findCellIdByName | `findCellIdByName(spec, rawText)` | 特技名（"隠形術"）または「分野:出目」（"忍術:7" / "ninjutsu:7"）からセルIDを引く。 |
| 296 | fn | createEmptySkillTableState | `createEmptySkillTableState(spec)` | --------------------------------------------------------------------------- 状態（キャラクターの components.skillTable… |
| 310 | fn | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 保存済みデータを安全な形に正規化する。 |
| 352 | fn | isAcquired | `isAcquired(state, cellId)` |  |
| 356 | fn | isGapFilled | `isGapFilled(state, gapIndex)` |  |
| 361 | fn | toggleAcquired | `toggleAcquired(state, cellId)` | 取得状態をトグルした新しいstateを返す（元のstateは変更しない） |
| 381 | fn | hasCellDisable | `hasCellDisable(spec)` | --------------------------------------------------------------------------- マス1つの「使えない」印（シノビガミの変調「マヒ」） 効くのは代… |
| 385 | fn | isCellDisabled | `isCellDisabled(state, cellId)` |  |
| 390 | fn | toggleCellDisabled | `toggleCellDisabled(state, cellId)` | 「使えない」印をトグルした新しいstateを返す。 |
| 402 | fn | toggleCyclic | `toggleCyclic(state)` | 左右を繋ぐかをトグルした新しいstateを返す。 |
| 407 | fn | toggleGap | `toggleGap(state, gapIndex)` | ギャップの塗りつぶしをトグルした新しいstateを返す |
| 424 | fn | columnDistance | `columnDistance(spec, state, colA, colB)` | 列Aから列Bまでの横方向の距離。 |
| 461 | fn | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | セル間の距離。 |
| 480 | fn | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 目標のセルに一番近い「取得済み」のセルを探す。 |
| 514 | fn | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 目標の特技に対する判定内容を解決する。 |

## トップレベル関数（LOCAL TASKS 候補）（30）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 77 | createSkillTableSpec | `createSkillTableSpec(definition)` | 54 | ✓ |
| 139 | hasColumnSlots | `hasColumnSlots(spec)` | 3 | ✓ |
| 143 | hasExtraSlots | `hasExtraSlots(spec)` | 3 | ✓ |
| 147 | extraSlotMax | `extraSlotMax(spec)` | 3 | ✓ |
| 151 | isColumnLost | `isColumnLost(state, columnKey)` | 3 | ✓ |
| 155 | isExtraSlotLost | `isExtraSlotLost(state, index)` | 3 | ✓ |
| 164 | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | 5 | ✓ |
| 171 | countRemainingSlots | `countRemainingSlots(spec, state)` | 5 | ✓ |
| 178 | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 6 | ✓ |
| 186 | toggleExtraSlot | `toggleExtraSlot(state, index)` | 6 | ✓ |
| 198 | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 8 | ✓ |
| 220 | checkModifiers | `checkModifiers(spec)` | 3 | ✓ |
| 228 | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 14 | ✓ |
| 244 | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 3 | ✓ |
| 253 | getCell | `getCell(spec, cellId)` | 15 | ✓ |
| 273 | findCellIdByName | `findCellIdByName(spec, rawText)` | 18 | ✓ |
| 296 | createEmptySkillTableState | `createEmptySkillTableState(spec)` | 6 | ✓ |
| 310 | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 41 | ✓ |
| 352 | isAcquired | `isAcquired(state, cellId)` | 3 | ✓ |
| 356 | isGapFilled | `isGapFilled(state, gapIndex)` | 3 | ✓ |
| 361 | toggleAcquired | `toggleAcquired(state, cellId)` | 11 | ✓ |
| 381 | hasCellDisable | `hasCellDisable(spec)` | 3 | ✓ |
| 385 | isCellDisabled | `isCellDisabled(state, cellId)` | 3 | ✓ |
| 390 | toggleCellDisabled | `toggleCellDisabled(state, cellId)` | 6 | ✓ |
| 402 | toggleCyclic | `toggleCyclic(state)` | 3 | ✓ |
| 407 | toggleGap | `toggleGap(state, gapIndex)` | 6 | ✓ |
| 424 | columnDistance | `columnDistance(spec, state, colA, colB)` | 32 | ✓ |
| 461 | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | 7 | ✓ |
| 480 | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 21 | ✓ |
| 514 | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 18 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
枠を失った分野の特技は「代用元にならない」だけで、判定の目標にはできる（resolveSkillCheck）。ここを塞ぐと、その分野の特技が一切振れなくなる。「使えない印」（マヒ）も同じで、塞ぐのは代用元の側だけ。

`state.disabledCells` は `state.acquired` の部分集合という不変条件を持つ。normalizeSkillTableState が取得していないセルIDの印を捨て、toggleAcquired が取得を外すときに印も一緒に落とす。ここを緩めると、表に出ない印が距離計算にだけ効く（＝目標値が理由もなく上がる）状態を作れてしまう。

`spec.check.options` は入力欄ではない。既定値と、修正を足した後に丸める上下限で、normalizeCheckOptions がその関門になっている。卓がいじるのは `spec.check.modifiers` の側で、そちらの値はコマのパラメータに入っている。
<!-- /prose:notes -->
