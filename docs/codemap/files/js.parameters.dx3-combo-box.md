---
source: js/parameters/dx3-combo-box.js
lines: 780
exports: 8
imported_by: 1
api_sha: 3f18b1bb6479
prose_sha: 3f18b1bb6479
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/dx3-combo-box.js

<!-- prose:summary -->
DX3の「コンボ」一覧・編集を行うボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3 のコンボ（複数エフェクトの組み合わせ）の一覧・編集と、発動・判定・ダメージの実行。エフェクトの「コンボ時修正」を数値へ解決するのは [[js.parameters.dx3-formula]]、エフェクト側の定義は [[js.parameters.dx3-effect-box]]。
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 158 | fn | lowestBuffCriticalFloor | `lowestBuffCriticalFloor(token)` | 今このコマに効いている「クリティカル値の下限」。 |
| 233 | fn | buildComboChatLines | `buildComboChatLines(comboName)` | チャットパレット貼り付け用の3コマンド（発動/判定/ダメージ）を生成する。 |
| 243 | fn | findComboByName | `findComboByName(combos, name)` | コンボ一覧から名前（完全一致）でコンボを探す。 |
| 255 | fn | runComboActivate | `runComboActivate({ combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects, chatCommand })` | getToken:Function, getEffectiveParameterValue:Function, generateBuffId:Function, onSaveEffects:Function}} op… |
| 329 | fn | runEffectUse | `runEffectUse({ effect, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects, chatCommand })` | コンボを介さず、単体のエフェクトを自身へ適用する（チャットコマンド「エフェクト使用(名前)」、 js/parameters/dx3.jsのhandleDX3ChatCommandから呼び出される）。 |
| 383 | fn | runComboCheck | `async runComboCheck({ combo, effects = [], tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, chatCommand })` | getEffectiveParameterValue:Function, generateBuffId:Function, rollBCDice:Function}} options |
| 446 | fn | runComboDamage | `async runComboDamage({ combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, chatCommand })` | getToken:Function, getEffectiveParameterValue:Function, rollBCDice:Function}} options |
| 493 | fn | showComboBox | `showComboBox({ combos = [], effects = [], parameters = {}, readOnly = false, onSave })` | combos: Array<{id:string,name:string,timing:string\|null,effectNames:string[],abilityParamId:string\|null,skil… |

## トップレベル関数（LOCAL TASKS 候補）（24）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | ensureDialog | `ensureDialog()` | 7 |  |
| 43 | comboModAnalysis | `comboModAnalysis(effect, key, token, getEffectiveParameterValue)` | 3 |  |
| 47 | comboModContribution | `comboModContribution(effect, key, token, getEffectiveParameterValue)` | 3 |  |
| 51 | sumComboMod | `sumComboMod(effects, key, token, getEffectiveParameterValue)` | 3 |  |
| 58 | collectComboModProblems | `collectComboModProblems(effects, token, getEffectiveParameterValue)` | 19 |  |
| 79 | collectLimitProblems | `collectLimitProblems(effects, token, getEffectiveParameterValue)` | 20 |  |
| 101 | buildModNoticeText | `buildModNoticeText({ effects, token, getEffectiveParameterValue, appliedBuffCount })` | 16 |  |
| 123 | isEffectAtLimit | `isEffectAtLimit(effect, token, getEffectiveParameterValue)` | 11 |  |
| 135 | buildEffectUseFailureMessage | `buildEffectUseFailureMessage(names)` | 3 |  |
| 143 | lowestCriticalFloor | `lowestCriticalFloor(effects)` | 7 |  |
| 158 | lowestBuffCriticalFloor | `lowestBuffCriticalFloor(token)` | 8 | ✓ |
| 169 | parseEncroachNumber | `parseEncroachNumber(encroach)` | 4 |  |
| 182 | isDX3AbilityParam | `isDX3AbilityParam(paramId)` | 3 |  |
| 186 | isDX3SkillParam | `isDX3SkillParam(paramId)` | 6 |  |
| 197 | sortTimings | `sortTimings(timings)` | 10 |  |
| 210 | parseFinalNumber | `parseFinalNumber(resultText)` | 7 |  |
| 221 | logToMain | `logToMain(dispatch, resultText, token, system = 'コンボ', chatCommand)` | 9 |  |
| 233 | buildComboChatLines | `buildComboChatLines(comboName)` | 7 | ✓ |
| 243 | findComboByName | `findComboByName(combos, name)` | 3 | ✓ |
| 255 | runComboActivate | `runComboActivate({ combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects, chatCommand })` | 62 | ✓ |
| 329 | runEffectUse | `runEffectUse({ effect, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects, chatCommand })` | 49 | ✓ |
| 383 | runComboCheck | `async runComboCheck({ combo, effects = [], tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, chatCommand })` | 58 | ✓ |
| 446 | runComboDamage | `async runComboDamage({ combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, chatCommand })` | 35 | ✓ |
| 493 | showComboBox | `showComboBox({ combos = [], effects = [], parameters = {}, readOnly = false, onSave })` | **287** | ✓ |

## 依存

- import → [[js.parameters.dx3-effect-box]], [[js.parameters.dx3-formula]], [[js.read-only-form]]
- imported by → [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
