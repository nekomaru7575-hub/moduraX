---
source: js/parameters/dx3-lois-box.js
lines: 411
exports: 10
imported_by: 1
api_sha: 2421ee490206
prose_sha: 2421ee490206
generated: 2026-09-01
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
| 20 | const | LOIS_COMPONENT_KEY | `LOIS_COMPONENT_KEY` | components にロイス一覧を保存するときのキー。 |
| 23 | const | LOIS_MAX | `LOIS_MAX` | ロイスは最大7個まで持てる（キャラクターシート側のスロット数とも一致）。 |
| 27 | const | LOIS_RELATIONS | `LOIS_RELATIONS` | ロイスの種類。 |
| 52 | const | LOIS_POSITIVE_EMOTIONS | `LOIS_POSITIVE_EMOTIONS` | ------------------------------------------------------------------ 感情表。 |
| 58 | const | LOIS_NEGATIVE_EMOTIONS | `LOIS_NEGATIVE_EMOTIONS` |  |
| 68 | fn | createEmptyLois | `createEmptyLois()` | 空のロイス1件。 |
| 83 | fn | normalizeLois | `normalizeLois(raw)` | 保存済み・読み込み済みのロイス1件を、欠けたフィールドを補って正規化する。 |
| 105 | fn | normalizeLoisList | `normalizeLoisList(rawList)` |  |
| 116 | fn | countActiveLois | `countActiveLois(lois)` | パラメータ「ロイス」の値。 |
| 166 | fn | showLoisBox | `showLoisBox({ lois = [], readOnly = false, onSave })` | lois: Array<object>, readOnly?: boolean 他人のコマを表示だけしている時。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 68 | createEmptyLois | `createEmptyLois()` | 10 | ✓ |
| 83 | normalizeLois | `normalizeLois(raw)` | 21 | ✓ |
| 105 | normalizeLoisList | `normalizeLoisList(rawList)` | 4 | ✓ |
| 116 | countActiveLois | `countActiveLois(lois)` | 7 | ✓ |
| 125 | countTitus | `countTitus(lois)` | 4 |  |
| 134 | buildEmotionSelect | `buildEmotionSelect(options, currentValue)` | 23 |  |
| 166 | showLoisBox | `showLoisBox({ lois = [], readOnly = false, onSave })` | **245** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.read-only-form]]
- imported by → [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
