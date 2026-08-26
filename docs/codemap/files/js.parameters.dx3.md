---
source: js/parameters/dx3.js
lines: 768
exports: 7
imported_by: 1
api_sha: 429669a4c75b
prose_sha: 429669a4c75b
generated: 2026-08-26
tags: [codemap]
---

# js/parameters/dx3.js

<!-- prose:summary -->
DX3（ダブルクロス3rd）のプラグイン記述子。パラメータ定義と各ボックスの束ね役。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
侵蝕率・能力値・技能値・各種修正レジスタといった DX3 固有のパラメータを定義し、能力/コンボ/ロイスの各ボックスをプラグイン記述子として束ねる。エフェクトは汎用の「スキル」枠組み（[[js.parameters.skill.skill-model]]）へ `DX3_EFFECT_SPEC` として宣言するだけで、一覧 UI も使用処理も共通側にある。判定ダイス修正（AdB）などのレジスタは手入力させない代わりに、チャットのバフコマンドが key 名で直接指せるようになっている。

`DX3_BCDICE_SYSTEM` を記述子に載せているので、このプラグインを選んだ部屋はダイスボットもDX3に切り替わる（部屋の作成時・ルーム設定の両方。[[js.parameters.registry]]経由）。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | const | DX3_PARAMETERS | `DX3_PARAMETERS` |  |
| 53 | fn | buildDX3Parameters | `buildDX3Parameters()` |  |
| 57 | const | DX3_BCDICE_SYSTEM | `DX3_BCDICE_SYSTEM` |  |
| 76 | const | DX3_EFFECT_SPEC | `DX3_EFFECT_SPEC` | DX3のエフェクトを、汎用の「スキル」（キャラが選んで取得する能力）として宣言する。 |
| 122 | fn | readDX3Effects | `readDX3Effects(components)` | componentsから正規形のエフェクト一覧を取り出す。 |
| 129 | fn | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | パラメータ・componentsから自動計算される値をまとめて返す。 |
| 749 | const | DX3_PLUGIN | `DX3_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（15）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 53 | buildDX3Parameters | `buildDX3Parameters()` | 3 | ✓ |
| 122 | readDX3Effects | `readDX3Effects(components)` | 3 | ✓ |
| 129 | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | 19 | ✓ |
| 151 | renderDX3CharacterPanel | `renderDX3CharacterPanel({ container, mode, canEdit = true, parameters, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false })` | **240** |  |
| 417 | toNumber | `toNumber(value)` | 4 |  |
| 429 | importDX3Effects | `importDX3Effects(json)` | 21 |  |
| 457 | importDX3Lois | `importDX3Lois(json)` | 34 |  |
| 494 | importDX3VariableSkillSlots | `importDX3VariableSkillSlots(json)` | 26 |  |
| 541 | importDX3CharacterJson | `importDX3CharacterJson(json)` | 30 |  |
| 587 | looksLikeDX3ChatCommand | `looksLikeDX3ChatCommand(rawInput)` | 3 |  |
| 604 | handleDX3ChatCommand | `handleDX3ChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice })` | 81 |  |
| 693 | resetDX3ComponentsOnPhaseEnd | `resetDX3ComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 703 | renderDX3BuffFields | `renderDX3BuffFields({ container, paramId })` | 33 |  |
| 738 | parseDX3BuffExtra | `parseDX3BuffExtra(paramId, text)` | 5 |  |
| 744 | describeDX3BuffMeta | `describeDX3BuffMeta(buff)` | 4 |  |

## 依存

- import → [[js.html-escape]], [[js.parameters.dx3-ability-box]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-lois-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
