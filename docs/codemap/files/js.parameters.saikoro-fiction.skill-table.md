---
source: js/parameters/saikoro-fiction/skill-table.js
lines: 327
exports: 16
imported_by: 3
api_sha: feb6d173b223
prose_sha: feb6d173b223
generated: 2026-08-07
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

## トップレベル関数・非export（0）

なし。

## 依存

- import → なし
- imported by → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
