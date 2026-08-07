---
source: js/parameters/dx3-effect-box.js
lines: 369
exports: 3
imported_by: 2
api_sha: 2da1671b62e5
prose_sha: 2da1671b62e5
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/dx3-effect-box.js

<!-- prose:summary -->
DX3の「エフェクト」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3 のエフェクト一覧の表示・編集ボックス。コンボ時修正の入力欄（`COMBO_MOD_FIELDS`）と侵蝕上昇の分類（`LIMIT_CATEGORIES`）をここが定義し、コンボ側がそれを読む。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | const | LIMIT_CATEGORIES | `LIMIT_CATEGORIES` |  |
| 33 | const | COMBO_MOD_FIELDS | `COMBO_MOD_FIELDS` | エフェクトを「コンボとして使用した場合」の修正値。 |
| 54 | fn | showEffectBox | `showEffectBox({ effects = [], parameters = {}, readOnly = false, onSave })` | effects: Array<{ name:string, level:number, encroach:string, note:string, limits: Record<'scenario'\|'scene'\|… |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 10 | ensureDialog | `ensureDialog()` | 7 |  |
| 25 | defaultLimit | `defaultLimit()` | 3 |  |
| 54 | showEffectBox | `showEffectBox({ effects = [], parameters = {}, readOnly = false, onSave })` | **315** | ✓ |

## 依存

- import → [[js.parameters.dx3-formula]], [[js.read-only-form]]
- imported by → [[js.parameters.dx3-combo-box]], [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
