---
source: js/parameters/dracurouge-bond-box.js
lines: 422
exports: 10
imported_by: 1
api_sha: e4baa4420e60
prose_sha: e4baa4420e60
generated: 2026-08-18
tags: [codemap]
---

# js/parameters/dracurouge-bond-box.js

<!-- prose:summary -->
ドラクルージュの「絆」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 23 | const | BOND_COMPONENT_KEY | `BOND_COMPONENT_KEY` | components に絆一覧を保存するときのキー。 |
| 26 | const | BOND_SLOT_COUNT | `BOND_SLOT_COUNT` | ルージュ／ノワールそれぞれの枠の数。 |
| 39 | const | BOND_ROUGE_OPTIONS | `BOND_ROUGE_OPTIONS` | ------------------------------------------------------------------ ルージュ／ノワールのドロップダウンの中身（仮）。 |
| 40 | const | BOND_NOIR_OPTIONS | `BOND_NOIR_OPTIONS` |  |
| 55 | fn | createEmptyBond | `createEmptyBond()` | 空の絆1件。 |
| 78 | fn | normalizeBond | `normalizeBond(raw)` | 保存済みの絆1件を、欠けたフィールドを補って正規化する。 |
| 87 | fn | normalizeBondList | `normalizeBondList(rawList)` |  |
| 93 | fn | isBondSideFilled | `isBondSideFilled(side)` | その側の枠が5つとも埋まっているか。 |
| 125 | fn | settleFilledBonds | `settleFilledBonds(bonds, { recycleEternal = true } = {})` | 保存時に、5つ埋まった側を清算して「今回新たに加算する数」を数える。 |
| 231 | fn | showBondBox | `showBondBox({ bonds = [], readOnly = false, onSave })` | bonds: Array<object>, readOnly?: boolean 他人のコマを表示だけしている時。 |

## トップレベル関数（LOCAL TASKS 候補）（12）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 43 | createEmptyBondSide | `createEmptyBondSide()` | 7 |  |
| 55 | createEmptyBond | `createEmptyBond()` | 3 | ✓ |
| 62 | normalizeBondSide | `normalizeBondSide(raw)` | 11 |  |
| 78 | normalizeBond | `normalizeBond(raw)` | 8 | ✓ |
| 87 | normalizeBondList | `normalizeBondList(rawList)` | 4 | ✓ |
| 93 | isBondSideFilled | `isBondSideFilled(side)` | 3 | ✓ |
| 104 | settleFilledSide | `settleFilledSide(side)` | 8 |  |
| 125 | settleFilledBonds | `settleFilledBonds(bonds, { recycleEternal = true } = {})` | 24 | ✓ |
| 152 | ensureDialog | `ensureDialog()` | 7 |  |
| 162 | buildSlotSelect | `buildSlotSelect(options, currentValue, title)` | 24 |  |
| 189 | buildHeadRow | `buildHeadRow()` | 31 |  |
| 231 | showBondBox | `showBondBox({ bonds = [], readOnly = false, onSave })` | 191 | ✓ |

## 依存

- import → [[js.read-only-form]]
- imported by → [[js.parameters.dracurouge]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
