---
source: js/parameters/shinobigami-skills.js
lines: 52
exports: 4
imported_by: 1
api_sha: a4f3d36b020e
prose_sha: a4f3d36b020e
generated: 2026-08-19
tags: [codemap]
---

# js/parameters/shinobigami-skills.js

<!-- prose:summary -->
シノビガミの特技表データ（6分野 × 11行）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シノビガミの表データ（特技表6分野 × 11行と、感情表のプラス6・マイナス6）そのもの。ロジックは持たない定数だけのファイル。共通モジュールはこれらの名前を一切知らず、[[js.parameters.shinobigami]] がここから読んで spec へ渡す。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 12 | const | SHINOBIGAMI_COLUMNS | `SHINOBIGAMI_COLUMNS` | js/parameters/shinobigami-skills.js シノビガミの表データ（特技表と感情表）。 |
| 22 | const | SHINOBIGAMI_ROWS | `SHINOBIGAMI_ROWS` | 2D6の出目。 |
| 25 | const | SHINOBIGAMI_SKILL_CELLS | `SHINOBIGAMI_SKILL_CELLS` | SHINOBIGAMI_SKILL_CELLS[分野index][行index]。 |
| 48 | const | SHINOBIGAMI_EMOTIONS | `SHINOBIGAMI_EMOTIONS` | 感情表。 |

## トップレベル関数（LOCAL TASKS 候補）（0）

なし（`function 名(...) {}` 宣言がトップレベルに無い）。

## 依存

- import → なし
- imported by → [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
特技はセルID（`列キー:出目`）で保存されるので、**特技名を直しても保存済みの取得データは壊れない**。一方 **感情は名前そのものが保存値**なので、感情名を変えると保存済みの人物欄の感情は先頭へ落ちる。安定IDを持たせていないのは、感情名がシステムの用語そのもので、卓が読む文字列と保存値を分ける利点が無いため。

特技名は要検証（ファイル冒頭の⚠️参照）。
<!-- /prose:notes -->
