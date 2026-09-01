---
source: js/parameters/dx3.js
lines: 856
exports: 7
imported_by: 1
api_sha: 429669a4c75b
prose_sha: 429669a4c75b
generated: 2026-09-01
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
| 61 | fn | buildDX3Parameters | `buildDX3Parameters()` |  |
| 65 | const | DX3_BCDICE_SYSTEM | `DX3_BCDICE_SYSTEM` |  |
| 84 | const | DX3_EFFECT_SPEC | `DX3_EFFECT_SPEC` | DX3のエフェクトを、汎用の「スキル」（キャラが選んで取得する能力）として宣言する。 |
| 130 | fn | readDX3Effects | `readDX3Effects(components)` | componentsから正規形のエフェクト一覧を取り出す。 |
| 182 | fn | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | パラメータ・componentsから自動計算される値をまとめて返す。 |
| 837 | const | DX3_PLUGIN | `DX3_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（17）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 61 | buildDX3Parameters | `buildDX3Parameters()` | 3 | ✓ |
| 130 | readDX3Effects | `readDX3Effects(components)` | 3 | ✓ |
| 170 | lookupCorruptionBonus | `lookupCorruptionBonus(table, corruption)` | 8 |  |
| 182 | computeDX3DerivedParameters | `computeDX3DerivedParameters(parameters, components = {})` | 16 | ✓ |
| 201 | isEAEnabled | `isEAEnabled(parameters)` | 3 |  |
| 207 | renderDX3CharacterPanel | `renderDX3CharacterPanel({ container, mode, canEdit = true, parameters, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false })` | **272** |  |
| 505 | toNumber | `toNumber(value)` | 4 |  |
| 517 | importDX3Effects | `importDX3Effects(json)` | 21 |  |
| 545 | importDX3Lois | `importDX3Lois(json)` | 34 |  |
| 582 | importDX3VariableSkillSlots | `importDX3VariableSkillSlots(json)` | 26 |  |
| 629 | importDX3CharacterJson | `importDX3CharacterJson(json)` | 30 |  |
| 675 | looksLikeDX3ChatCommand | `looksLikeDX3ChatCommand(rawInput)` | 3 |  |
| 692 | handleDX3ChatCommand | `handleDX3ChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice })` | 81 |  |
| 781 | resetDX3ComponentsOnPhaseEnd | `resetDX3ComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 791 | renderDX3BuffFields | `renderDX3BuffFields({ container, paramId })` | 33 |  |
| 826 | parseDX3BuffExtra | `parseDX3BuffExtra(paramId, text)` | 5 |  |
| 832 | describeDX3BuffMeta | `describeDX3BuffMeta(buff)` | 4 |  |

## 依存

- import → [[js.html-escape]], [[js.parameters.dx3-ability-box]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-lois-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]], [[js.read-only-form]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
