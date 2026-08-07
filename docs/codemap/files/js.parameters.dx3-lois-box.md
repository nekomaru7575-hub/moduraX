---
source: js/parameters/dx3-lois-box.js
lines: 420
exports: 10
imported_by: 1
api_sha: 2421ee490206
prose_sha: 2421ee490206
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/dx3-lois-box.js

<!-- prose:summary -->
DX3の「ロイス」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3 のロイス（人間関係）の一覧・編集ボックス。関係と感情の選択肢、上限数、正規化をここが持つ。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | const | LOIS_COMPONENT_KEY | `LOIS_COMPONENT_KEY` | components にロイス一覧を保存するときのキー。 |
| 22 | const | LOIS_MAX | `LOIS_MAX` | ロイスは最大7個まで持てる（キャラクターシート側のスロット数とも一致）。 |
| 26 | const | LOIS_RELATIONS | `LOIS_RELATIONS` | ロイスの種類。 |
| 42 | const | LOIS_POSITIVE_EMOTIONS | `LOIS_POSITIVE_EMOTIONS` | ------------------------------------------------------------------ 感情表（仮）。 |
| 48 | const | LOIS_NEGATIVE_EMOTIONS | `LOIS_NEGATIVE_EMOTIONS` |  |
| 57 | fn | createEmptyLois | `createEmptyLois()` | 空のロイス1件。 |
| 72 | fn | normalizeLois | `normalizeLois(raw)` | 保存済み・読み込み済みのロイス1件を、欠けたフィールドを補って正規化する。 |
| 94 | fn | normalizeLoisList | `normalizeLoisList(rawList)` |  |
| 105 | fn | countActiveLois | `countActiveLois(lois)` | パラメータ「ロイス」の値。 |
| 163 | fn | showLoisBox | `showLoisBox({ lois = [], readOnly = false, onSave })` | lois: Array<object>, readOnly?: boolean 他人のコマを表示だけしている時。 |

## トップレベル関数・非export（3）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 114 | countTitus | `countTitus(lois)` | 4 |
| 121 | ensureDialog | `ensureDialog()` | 7 |
| 131 | buildEmotionSelect | `buildEmotionSelect(options, currentValue)` | 23 |

## 依存

- import → [[js.read-only-form]]
- imported by → [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
