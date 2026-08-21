---
source: js/parameters/saikoro-fiction/skill-table.js
lines: 484
exports: 27
imported_by: 3
api_sha: a13909348f35
prose_sha: a13909348f35
generated: 2026-08-21
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table.js

<!-- prose:summary -->
サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系の特技表そのもののデータモデル。格子の座標、習得状態、ギャップを踏まえた距離計算（列間・セル間・最も近い習得特技の探索）を持つ純粋モジュールで、システム固有の特技名は含まない。「失われうる枠」（spec.slots。シノビガミの生命力、インセインの恐怖心）もここが持つ。左右を繋ぐか（cyclic）はキャラクターごとの設定で、spec の値はその初期値でしかない。判定コマンドに渡す値まわりでは、`spec.check.options`（既定値と丸めの上下限）と `spec.check.modifiers`（判定ボックスに並べる修正値の入力欄。値の置き場はコマのパラメータ）の宣言を読む口だけを持ち、どの修正がどこへ効くかは解釈しない。
<!-- /prose:role -->

## export（27）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 69 | fn | createSkillTableSpec | `createSkillTableSpec(definition)` | id: string, columns: {key:string, label:string}[], rows: number[], 出目のラベル（例: [2,3,...,12]） cells: string[][]… |
| 130 | fn | hasColumnSlots | `hasColumnSlots(spec)` |  |
| 134 | fn | hasExtraSlots | `hasExtraSlots(spec)` |  |
| 138 | fn | extraSlotMax | `extraSlotMax(spec)` |  |
| 142 | fn | isColumnLost | `isColumnLost(state, columnKey)` |  |
| 146 | fn | isExtraSlotLost | `isExtraSlotLost(state, index)` |  |
| 155 | fn | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | その列の特技が使えなくなっているか。 |
| 162 | fn | countRemainingSlots | `countRemainingSlots(spec, state)` | 残っている枠の数。 |
| 169 | fn | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 列の枠の喪失をトグルした新しいstateを返す |
| 177 | fn | toggleExtraSlot | `toggleExtraSlot(state, index)` | 追加枠の喪失をトグルした新しいstateを返す |
| 189 | fn | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 追加枠の個数を変えた新しいstateを返す。 |
| 211 | fn | checkModifiers | `checkModifiers(spec)` | 判定ボックスに並べる修正値の入力欄の宣言。 |
| 219 | fn | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 修正を足した後の値を、整数化してmin/maxへ丸める。 |
| 235 | fn | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 列index・行indexからセルIDを組み立てる |
| 244 | fn | getCell | `getCell(spec, cellId)` | セルIDを解決する。 |
| 264 | fn | findCellIdByName | `findCellIdByName(spec, rawText)` | 特技名（"隠形術"）または「分野:出目」（"忍術:7" / "ninjutsu:7"）からセルIDを引く。 |
| 287 | fn | createEmptySkillTableState | `createEmptySkillTableState(spec)` | --------------------------------------------------------------------------- 状態（キャラクターの components.skillTable… |
| 301 | fn | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 保存済みデータを安全な形に正規化する。 |
| 335 | fn | isAcquired | `isAcquired(state, cellId)` |  |
| 339 | fn | isGapFilled | `isGapFilled(state, gapIndex)` |  |
| 344 | fn | toggleAcquired | `toggleAcquired(state, cellId)` | 取得状態をトグルした新しいstateを返す（元のstateは変更しない） |
| 356 | fn | toggleCyclic | `toggleCyclic(state)` | 左右を繋ぐかをトグルした新しいstateを返す。 |
| 361 | fn | toggleGap | `toggleGap(state, gapIndex)` | ギャップの塗りつぶしをトグルした新しいstateを返す |
| 378 | fn | columnDistance | `columnDistance(spec, state, colA, colB)` | 列Aから列Bまでの横方向の距離。 |
| 415 | fn | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | セル間の距離。 |
| 433 | fn | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 目標のセルに一番近い「取得済み」のセルを探す。 |
| 466 | fn | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 目標の特技に対する判定内容を解決する。 |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 69 | createSkillTableSpec | `createSkillTableSpec(definition)` | 53 | ✓ |
| 130 | hasColumnSlots | `hasColumnSlots(spec)` | 3 | ✓ |
| 134 | hasExtraSlots | `hasExtraSlots(spec)` | 3 | ✓ |
| 138 | extraSlotMax | `extraSlotMax(spec)` | 3 | ✓ |
| 142 | isColumnLost | `isColumnLost(state, columnKey)` | 3 | ✓ |
| 146 | isExtraSlotLost | `isExtraSlotLost(state, index)` | 3 | ✓ |
| 155 | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | 5 | ✓ |
| 162 | countRemainingSlots | `countRemainingSlots(spec, state)` | 5 | ✓ |
| 169 | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 6 | ✓ |
| 177 | toggleExtraSlot | `toggleExtraSlot(state, index)` | 6 | ✓ |
| 189 | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 8 | ✓ |
| 211 | checkModifiers | `checkModifiers(spec)` | 3 | ✓ |
| 219 | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 14 | ✓ |
| 235 | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 3 | ✓ |
| 244 | getCell | `getCell(spec, cellId)` | 15 | ✓ |
| 264 | findCellIdByName | `findCellIdByName(spec, rawText)` | 18 | ✓ |
| 287 | createEmptySkillTableState | `createEmptySkillTableState(spec)` | 6 | ✓ |
| 301 | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 33 | ✓ |
| 335 | isAcquired | `isAcquired(state, cellId)` | 3 | ✓ |
| 339 | isGapFilled | `isGapFilled(state, gapIndex)` | 3 | ✓ |
| 344 | toggleAcquired | `toggleAcquired(state, cellId)` | 6 | ✓ |
| 356 | toggleCyclic | `toggleCyclic(state)` | 3 | ✓ |
| 361 | toggleGap | `toggleGap(state, gapIndex)` | 6 | ✓ |
| 378 | columnDistance | `columnDistance(spec, state, colA, colB)` | 32 | ✓ |
| 415 | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | 7 | ✓ |
| 433 | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 20 | ✓ |
| 466 | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 18 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
枠を失った分野の特技は「代用元にならない」だけで、判定の目標にはできる（resolveSkillCheck）。ここを塞ぐと、その分野の特技が一切振れなくなる。

`spec.check.options` は入力欄ではない。既定値と、修正を足した後に丸める上下限で、normalizeCheckOptions がその関門になっている。卓がいじるのは `spec.check.modifiers` の側で、そちらの値はコマのパラメータに入っている。
<!-- /prose:notes -->
