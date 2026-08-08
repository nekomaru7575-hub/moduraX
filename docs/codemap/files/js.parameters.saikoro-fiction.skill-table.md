---
source: js/parameters/saikoro-fiction/skill-table.js
lines: 327
exports: 16
imported_by: 3
api_sha: feb6d173b223
prose_sha: feb6d173b223
generated: 2026-08-08
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table.js

<!-- prose:summary -->
サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系の特技表そのもののデータモデル。格子の座標、習得状態、ギャップを踏まえた距離計算（列間・セル間・最も近い習得特技の探索）を持つ純粋モジュールで、システム固有の特技名は含まない。
<!-- /prose:role -->

## export（16）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 44 | fn | createSkillTableSpec | `createSkillTableSpec(definition)` | id: string, columns: {key:string, label:string}[], rows: number[], 出目のラベル（例: [2,3,...,12]） cells: string[][]… |
| 102 | fn | createCheckOptions | `createCheckOptions(spec)` | 各オプションの既定値を集めたオブジェクト |
| 112 | fn | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 入力欄が空・非数値・範囲外でもコマンドが壊れないように、整数化してmin/maxへ丸める。 |
| 128 | fn | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 列index・行indexからセルIDを組み立てる |
| 137 | fn | getCell | `getCell(spec, cellId)` | セルIDを解決する。 |
| 157 | fn | findCellIdByName | `findCellIdByName(spec, rawText)` | 特技名（"隠形術"）または「分野:出目」（"忍術:7" / "ninjutsu:7"）からセルIDを引く。 |
| 180 | fn | createEmptySkillTableState | `createEmptySkillTableState()` | --------------------------------------------------------------------------- 状態（キャラクターの components.skillTable… |
| 189 | fn | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 保存済みデータを安全な形に正規化する。 |
| 201 | fn | isAcquired | `isAcquired(state, cellId)` |  |
| 205 | fn | isGapFilled | `isGapFilled(state, gapIndex)` |  |
| 210 | fn | toggleAcquired | `toggleAcquired(state, cellId)` | 取得状態をトグルした新しいstateを返す（元のstateは変更しない） |
| 218 | fn | toggleGap | `toggleGap(state, gapIndex)` | ギャップの塗りつぶしをトグルした新しいstateを返す |
| 234 | fn | columnDistance | `columnDistance(spec, filledGaps, colA, colB)` | 列Aから列Bまでの横方向の距離。 |
| 271 | fn | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | セル間の距離。 |
| 284 | fn | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 目標のセルに一番近い「取得済み」のセルを探す。 |
| 309 | fn | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 目標の特技に対する判定内容を解決する。 |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 44 | createSkillTableSpec | `createSkillTableSpec(definition)` | 52 | ✓ |
| 102 | createCheckOptions | `createCheckOptions(spec)` | 5 | ✓ |
| 112 | normalizeCheckOptions | `normalizeCheckOptions(spec, raw)` | 14 | ✓ |
| 128 | makeCellId | `makeCellId(spec, columnIndex, rowIndex)` | 3 | ✓ |
| 137 | getCell | `getCell(spec, cellId)` | 15 | ✓ |
| 157 | findCellIdByName | `findCellIdByName(spec, rawText)` | 18 | ✓ |
| 180 | createEmptySkillTableState | `createEmptySkillTableState()` | 3 | ✓ |
| 189 | normalizeSkillTableState | `normalizeSkillTableState(spec, raw)` | 11 | ✓ |
| 201 | isAcquired | `isAcquired(state, cellId)` | 3 | ✓ |
| 205 | isGapFilled | `isGapFilled(state, gapIndex)` | 3 | ✓ |
| 210 | toggleAcquired | `toggleAcquired(state, cellId)` | 6 | ✓ |
| 218 | toggleGap | `toggleGap(state, gapIndex)` | 6 | ✓ |
| 234 | columnDistance | `columnDistance(spec, filledGaps, colA, colB)` | 32 | ✓ |
| 271 | cellDistance | `cellDistance(spec, state, cellIdA, cellIdB)` | 7 | ✓ |
| 284 | findNearestAcquired | `findNearestAcquired(spec, state, targetCellId)` | 17 | ✓ |
| 309 | resolveSkillCheck | `resolveSkillCheck(spec, state, targetCellId)` | 18 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
