---
source: js/parameters/saikoro-fiction/skill-table.js
lines: 465
exports: 27
imported_by: 3
api_sha: c2d132d73ec1
prose_sha: c2d132d73ec1
generated: 2026-08-13
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table.js

<!-- prose:summary -->
サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系の特技表そのもののデータモデル。格子の座標、習得状態、ギャップを踏まえた距離計算（列間・セル間・最も近い習得特技の探索）を持つ純粋モジュールで、システム固有の特技名は含まない。「失われうる枠」（spec.slots。シノビガミの生命力、インセインの恐怖心）もここが持つ。左右を繋ぐか（cyclic）はキャラクターごとの設定で、spec の値はその初期値でしかない。
<!-- /prose:role -->

## export（27）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 61 | fn | createSkillTableSpec | `createSkillTableSpec(definition)` | id: string, columns: {key:string, label:string}[], rows: number[], 出目のラベル（例: [2,3,...,12]） cells: string[][]… |
| 122 | fn | hasColumnSlots | `hasColumnSlots(spec)` |  |
| 126 | fn | hasExtraSlots | `hasExtraSlots(spec)` |  |
| 130 | fn | extraSlotMax | `extraSlotMax(spec)` |  |
| 134 | fn | isColumnLost | `isColumnLost(state, columnKey)` |  |
| 138 | fn | isExtraSlotLost | `isExtraSlotLost(state, index)` |  |
| 147 | fn | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | その列の特技が使えなくなっているか。 |
| 154 | fn | countRemainingSlots | `countRemainingSlots(spec, state)` | 残っている枠の数。 |
| 161 | fn | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 列の枠の喪失をトグルした新しいstateを返す |
| 169 | fn | toggleExtraSlot | `toggleExtraSlot(state, index)` | 追加枠の喪失をトグルした新しいstateを返す |
| 181 | fn | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 追加枠の個数を変えた新しいstateを返す。 |
| 195 | fn | createCheckOptions | `createCheckOptions(spec)` | 各オプションの既定値を集めたオブジェクト |
| 205 | fn | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 入力欄が空・非数値・範囲外でもコマンドが壊れないように、整数化してmin/maxへ丸める。 |
| 221 | fn | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 列index・行indexからセルIDを組み立てる |
| 230 | fn | getCell | `getCell(spec, cellId)` | セルIDを解決する。 |
| 250 | fn | findCellIdByName | `findCellIdByName(spec, rawText)` | 特技名（"隠形術"）または「分野:出目」（"忍術:7" / "ninjutsu:7"）からセルIDを引く。 |
| 273 | fn | createEmptySkillTableState | `createEmptySkillTableState(spec)` | --------------------------------------------------------------------------- 状態（キャラクターの components.skillTable… |
| 287 | fn | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 保存済みデータを安全な形に正規化する。 |
| 316 | fn | isAcquired | `isAcquired(state, cellId)` |  |
| 320 | fn | isGapFilled | `isGapFilled(state, gapIndex)` |  |
| 325 | fn | toggleAcquired | `toggleAcquired(state, cellId)` | 取得状態をトグルした新しいstateを返す（元のstateは変更しない） |
| 337 | fn | toggleCyclic | `toggleCyclic(state)` | 左右を繋ぐかをトグルした新しいstateを返す。 |
| 342 | fn | toggleGap | `toggleGap(state, gapIndex)` | ギャップの塗りつぶしをトグルした新しいstateを返す |
| 359 | fn | columnDistance | `columnDistance(spec, state, colA, colB)` | 列Aから列Bまでの横方向の距離。 |
| 396 | fn | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | セル間の距離。 |
| 414 | fn | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 目標のセルに一番近い「取得済み」のセルを探す。 |
| 447 | fn | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 目標の特技に対する判定内容を解決する。 |

## トップレベル関数（LOCAL TASKS 候補）（27）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 61 | createSkillTableSpec | `createSkillTableSpec(definition)` | 53 | ✓ |
| 122 | hasColumnSlots | `hasColumnSlots(spec)` | 3 | ✓ |
| 126 | hasExtraSlots | `hasExtraSlots(spec)` | 3 | ✓ |
| 130 | extraSlotMax | `extraSlotMax(spec)` | 3 | ✓ |
| 134 | isColumnLost | `isColumnLost(state, columnKey)` | 3 | ✓ |
| 138 | isExtraSlotLost | `isExtraSlotLost(state, index)` | 3 | ✓ |
| 147 | isColumnDisabled | `isColumnDisabled(spec, state, columnIndex)` | 5 | ✓ |
| 154 | countRemainingSlots | `countRemainingSlots(spec, state)` | 5 | ✓ |
| 161 | toggleColumnSlot | `toggleColumnSlot(state, columnKey)` | 6 | ✓ |
| 169 | toggleExtraSlot | `toggleExtraSlot(state, index)` | 6 | ✓ |
| 181 | setExtraSlotCount | `setExtraSlotCount(spec, state, rawCount)` | 8 | ✓ |
| 195 | createCheckOptions | `createCheckOptions(spec)` | 5 | ✓ |
| 205 | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 14 | ✓ |
| 221 | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 3 | ✓ |
| 230 | getCell | `getCell(spec, cellId)` | 15 | ✓ |
| 250 | findCellIdByName | `findCellIdByName(spec, rawText)` | 18 | ✓ |
| 273 | createEmptySkillTableState | `createEmptySkillTableState(spec)` | 6 | ✓ |
| 287 | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 28 | ✓ |
| 316 | isAcquired | `isAcquired(state, cellId)` | 3 | ✓ |
| 320 | isGapFilled | `isGapFilled(state, gapIndex)` | 3 | ✓ |
| 325 | toggleAcquired | `toggleAcquired(state, cellId)` | 6 | ✓ |
| 337 | toggleCyclic | `toggleCyclic(state)` | 3 | ✓ |
| 342 | toggleGap | `toggleGap(state, gapIndex)` | 6 | ✓ |
| 359 | columnDistance | `columnDistance(spec, state, colA, colB)` | 32 | ✓ |
| 396 | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | 7 | ✓ |
| 414 | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 20 | ✓ |
| 447 | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 18 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
枠を失った分野の特技は「代用元にならない」だけで、判定の目標にはできる（resolveSkillCheck）。ここを塞ぐと、その分野の特技が一切振れなくなる。
<!-- /prose:notes -->
