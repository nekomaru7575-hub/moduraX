---
source: js/parameters/dx3.js
lines: 765
exports: 6
imported_by: 1
api_sha: cde67c70e41e
prose_sha: cde67c70e41e
generated: 2026-08-18
tags: [codemap]
---

# js/parameters/dx3.js

<!-- prose:summary -->
DX3（ダブルクロス3rd）のプラグイン記述子。パラメータ定義と各ボックスの束ね役。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
侵蝕率・能力値・技能値・各種修正レジスタといった DX3 固有のパラメータを定義し、能力/コンボ/ロイスの各ボックスをプラグイン記述子として束ねる。エフェクトは汎用の「スキル」枠組み（[[js.parameters.skill.skill-model]]）へ DX3_EFFECT_SPEC として宣言するだけで、一覧 UI も使用処理も共通側にある。判定ダイス修正（AdB）などのレジスタは手入力させない代わりに、チャットのバフコマンドが key 名で直接指せるようになっている。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | const | DX3_PARAMETERS | `DX3_PARAMETERS` |  |
| 53 | fn | buildDX3Parameters | `buildDX3Parameters()` |  |
| 74 | const | DX3_EFFECT_SPEC | `DX3_EFFECT_SPEC` | DX3のエフェクトを、汎用の「スキル」（キャラが選んで取得する能力）として宣言する。 |
| 120 | fn | readDX3Effects | `readDX3Effects(components)` | componentsから正規形のエフェクト一覧を取り出す。 |
| 127 | fn | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | パラメータ・componentsから自動計算される値をまとめて返す。 |
| 747 | const | DX3_PLUGIN | `DX3_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（15）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 53 | buildDX3Parameters | `buildDX3Parameters()` | 3 | ✓ |
| 120 | readDX3Effects | `readDX3Effects(components)` | 3 | ✓ |
| 127 | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | 19 | ✓ |
| 149 | renderDX3CharacterPanel | `renderDX3CharacterPanel({ container, mode, canEdit = true, parameters, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false })` | **240** |  |
| 415 | toNumber | `toNumber(value)` | 4 |  |
| 427 | importDX3Effects | `importDX3Effects(json)` | 21 |  |
| 455 | importDX3Lois | `importDX3Lois(json)` | 34 |  |
| 492 | importDX3VariableSkillSlots | `importDX3VariableSkillSlots(json)` | 26 |  |
| 539 | importDX3CharacterJson | `importDX3CharacterJson(json)` | 30 |  |
| 585 | looksLikeDX3ChatCommand | `looksLikeDX3ChatCommand(rawInput)` | 3 |  |
| 602 | handleDX3ChatCommand | `handleDX3ChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice })` | 81 |  |
| 691 | resetDX3ComponentsOnPhaseEnd | `resetDX3ComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 701 | renderDX3BuffFields | `renderDX3BuffFields({ container, paramId })` | 33 |  |
| 736 | parseDX3BuffExtra | `parseDX3BuffExtra(paramId, text)` | 5 |  |
| 742 | describeDX3BuffMeta | `describeDX3BuffMeta(buff)` | 4 |  |

## 依存

- import → [[js.html-escape]], [[js.parameters.dx3-ability-box]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-lois-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
