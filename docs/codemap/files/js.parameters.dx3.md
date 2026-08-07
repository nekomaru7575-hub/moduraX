---
source: js/parameters/dx3.js
lines: 694
exports: 4
imported_by: 1
api_sha: 9f3b1952c544
prose_sha: 9f3b1952c544
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/dx3.js

<!-- prose:summary -->
DX3（ダブルクロス3rd）のプラグイン記述子。パラメータ定義と各ボックスの束ね役。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
侵蝕率・能力値・技能値・各種修正レジスタといった DX3 固有のパラメータを定義し、能力/エフェクト/コンボ/ロイスの各ボックスをプラグイン記述子として束ねる。判定ダイス修正（AdB）などのレジスタは手入力させない代わりに、チャットのバフコマンドが key 名で直接指せるようになっている。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 11 | const | DX3_PARAMETERS | `DX3_PARAMETERS` |  |
| 48 | fn | buildDX3Parameters | `buildDX3Parameters()` |  |
| 55 | fn | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | パラメータ・componentsから自動計算される値をまとめて返す。 |
| 676 | const | DX3_PLUGIN | `DX3_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（14）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | buildDX3Parameters | `buildDX3Parameters()` | 3 | ✓ |
| 55 | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | 19 | ✓ |
| 77 | renderDX3CharacterPanel | `renderDX3CharacterPanel({ container, mode, canEdit = true, parameters, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false })` | **238** |  |
| 341 | toNumber | `toNumber(value)` | 4 |  |
| 352 | importDX3Effects | `importDX3Effects(json)` | 26 |  |
| 385 | importDX3Lois | `importDX3Lois(json)` | 34 |  |
| 422 | importDX3VariableSkillSlots | `importDX3VariableSkillSlots(json)` | 26 |  |
| 469 | importDX3CharacterJson | `importDX3CharacterJson(json)` | 30 |  |
| 513 | looksLikeDX3ChatCommand | `looksLikeDX3ChatCommand(rawInput)` | 3 |  |
| 530 | handleDX3ChatCommand | `handleDX3ChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice })` | 68 |  |
| 604 | resetDX3ComponentsOnPhaseEnd | `resetDX3ComponentsOnPhaseEnd(components, phase)` | 16 |  |
| 630 | renderDX3BuffFields | `renderDX3BuffFields({ container, paramId })` | 33 |  |
| 665 | parseDX3BuffExtra | `parseDX3BuffExtra(paramId, text)` | 5 |  |
| 671 | describeDX3BuffMeta | `describeDX3BuffMeta(buff)` | 4 |  |

## 依存

- import → [[js.parameters.dx3-ability-box]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-effect-box]], [[js.parameters.dx3-lois-box]], [[js.parameters.paramFactory]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
