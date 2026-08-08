---
source: js/parameters/saikoro-fiction/skill-table-box.js
lines: 304
exports: 1
imported_by: 1
api_sha: 803988a92fe3
prose_sha: 803988a92fe3
generated: 2026-08-08
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table-box.js

<!-- prose:summary -->
サイコロ・フィクション共通の「特技表」ボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
特技表の格子を描画し、習得・ギャップ（分野をまたぐ穴）の切り替えと判定の実行を受け付けるボックス UI。データモデルは [[js.parameters.saikoro-fiction.skill-table]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | fn | showSkillTableBox | `showSkillTableBox({ spec, state, title = '特技表', editable = true, onSave, onCheck })` | spec: object, createSkillTableSpec() の戻り値 state: {acquired:string[], filledGaps:number[]}, normalizeSkillTab… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 14 | ensureDialog | `ensureDialog()` | 7 |  |
| 34 | showSkillTableBox | `showSkillTableBox({ spec, state, title = '特技表', editable = true, onSave, onCheck })` | **270** | ✓ |

## 依存

- import → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table]]
- imported by → [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
