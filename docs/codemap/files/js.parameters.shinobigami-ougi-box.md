---
source: js/parameters/shinobigami-ougi-box.js
lines: 461
exports: 9
imported_by: 1
api_sha: 42e8293a87cc
prose_sha: 42e8293a87cc
generated: 2026-08-29
tags: [codemap]
---

# js/parameters/shinobigami-ougi-box.js

<!-- prose:summary -->
シノビガミの「奥義」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シノビガミの奥義（奥義名・種類・効果・指定特技・奥義改造）を編集するボックス。[[js.parameters.dx3-lois-box]]と同じ立場で、システム固有の形を自分で持つ（忍法が乗っている[[js.parameters.skill.skill-model]]の normalizeSkill は決まった形しか返さないため、入れ子の奥義改造と公開先が入らない）。奥義ごとに公開先(audience)を持ち、見えない行は出さない。**見えない行は取り置いて保存時に元の位置へ混ぜ直す**のが肝で、これを外すとGMが他人のコマを編集したときに隠れていた奥義が消える。
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 32 | const | OUGI_COMPONENT_KEY | `OUGI_COMPONENT_KEY` | components に奥義一覧を保存するときのキー。 |
| 36 | const | OUGI_MAX | `OUGI_MAX` | 1体が持てる奥義と、1つの奥義が持てる改造の上限。 |
| 37 | const | CUSTOMIZATION_MAX | `CUSTOMIZATION_MAX` |  |
| 40 | const | CUSTOMIZATION_SIDES | `CUSTOMIZATION_SIDES` | 奥義改造の側。 |
| 47 | fn | customizationSideLabel | `customizationSideLabel(side)` |  |
| 78 | fn | normalizeOugi | `normalizeOugi(raw)` | 保存済みの1件を、欠けた項目を補った正規形へ揃える。 |
| 93 | fn | normalizeOugiList | `normalizeOugiList(rawList)` | components に保存された一覧を正規形の配列にする。 |
| 104 | fn | listVisibleOugi | `listVisibleOugi(rawList, myParticipantId)` | 自分が見てよい奥義だけを返す。 |
| 164 | fn | showOugiBox | `showOugiBox({ ougiList = [], skillChoices = [], participants = {}, myParticipantId = null, readOnly = false, onSave })` | 奥義一覧ボックス。 |

## トップレベル関数（LOCAL TASKS 候補）（11）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | customizationSideLabel | `customizationSideLabel(side)` | 3 | ✓ |
| 52 | nextId | `nextId(prefix)` | 4 |  |
| 57 | toText | `toText(value)` | 3 |  |
| 63 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 68 | normalizeCustomization | `normalizeCustomization(raw)` | 8 |  |
| 78 | normalizeOugi | `normalizeOugi(raw)` | 13 | ✓ |
| 93 | normalizeOugiList | `normalizeOugiList(rawList)` | 4 | ✓ |
| 104 | listVisibleOugi | `listVisibleOugi(rawList, myParticipantId)` | 3 | ✓ |
| 110 | createElement | `createElement(tag, className, text)` | 6 |  |
| 119 | buildSkillSelect | `buildSkillSelect(choices, value)` | 27 |  |
| 164 | showOugiBox | `showOugiBox({ ougiList = [], skillChoices = [], participants = {}, myParticipantId = null, readOnly = false, onSave })` | **297** | ✓ |

## 依存

- import → [[js.audience-picker]], [[js.dialog-host]], [[js.icons]], [[js.read-only-form]], [[js.visibility]]
- imported by → [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
このファイルは公開先(audience)の器を持つだけで、いつ広げるかは決めない。「奥義使用(名前)」を実行すると audience を null（全員）へ固定して二度と伏せられなくする判断は [[js.parameters.shinobigami]] の handleOugiUseCommand 側にある（normalizeOugiList を呼び直して書き戻す）。ここを見て「使っても公開先は変わらない」と早合点しないこと。
<!-- /prose:notes -->
