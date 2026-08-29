---
source: js/parameters/gcrest-unit-box.js
lines: 203
exports: 1
imported_by: 1
api_sha: 86a23337bb92
prose_sha: 86a23337bb92
generated: 2026-08-29
tags: [codemap]
---

# js/parameters/gcrest-unit-box.js

<!-- prose:summary -->
グランクレストの「部隊」（マスコンバット）を編集するボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマ1体につき1つ持つ部隊（MC・ポジション・部隊名・士気・修正値）を編集する。1件だけのレコードに項目ごとの修正値がぶら下がる形は共通のスキル枠組みでは書けないので、ここに専用のUIを持つ。値を集めて onSave へ渡すだけで、修正値をバフにする・士気の表示を切り替えるといった判断は [[js.parameters.gcrest]] が持つ。士気は components ではなくパラメータ（GCREST:morale）が唯一の真実。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 75 | fn | showGcrestUnitBox | `showGcrestUnitBox({ unit, modGroups = [], morale, readOnly = false, onSave })` | unit: {mc:boolean, position:'FW'\|'CT', name:string, mods:Record<string, number>}, 正規化済みの部隊データ（gcrest.jsのnorm… |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | createElement | `createElement(tag, className, text)` | 6 |  |
| 29 | buildToggle | `buildToggle(options, value, title)` | 25 |  |
| 55 | buildNumberInput | `buildNumberInput(value)` | 8 |  |
| 75 | showGcrestUnitBox | `showGcrestUnitBox({ unit, modGroups = [], morale, readOnly = false, onSave })` | 128 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.read-only-form]]
- imported by → [[js.parameters.gcrest]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
