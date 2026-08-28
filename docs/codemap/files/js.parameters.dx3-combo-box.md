---
source: js/parameters/dx3-combo-box.js
lines: 550
exports: 7
imported_by: 1
api_sha: 2cc1eebb9175
prose_sha: 2cc1eebb9175
generated: 2026-08-28
tags: [codemap]
---

# js/parameters/dx3-combo-box.js

<!-- prose:summary -->
DX3の「コンボ」一覧・編集を行うボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3 のコンボ（複数エフェクトの組み合わせ）の一覧・編集と、発動・判定・ダメージの実行。エフェクトの定義・一覧 UI・使用処理・「コンボ時修正」の式の解決は、すべて汎用のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]] / [[js.parameters.skill.skill-formula]]）にある。ここに残るのはコンボ固有の組み立てと、クリティカル値の下限の扱い。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 42 | fn | lowestBuffCriticalFloor | `lowestBuffCriticalFloor(token)` | 今このコマに効いている「クリティカル値の下限」。 |
| 110 | fn | buildComboChatLines | `buildComboChatLines(comboName)` | チャットパレット貼り付け用の3コマンド（発動/判定/ダメージ）を生成する。 |
| 120 | fn | findComboByName | `findComboByName(combos, name)` | コンボ一覧から名前（完全一致）でコンボを探す。 |
| 138 | fn | runComboActivate | `runComboActivate({ spec, combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects, chatCommand })` | コンボ発動。 |
| 165 | fn | runComboCheck | `async runComboCheck({ combo, effects = [], tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, chatCommand })` | getEffectiveParameterValue:Function, generateBuffId:Function, rollBCDice:Function}} options |
| 228 | fn | runComboDamage | `async runComboDamage({ spec, combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, chatCommand })` | getToken:Function, getEffectiveParameterValue:Function, rollBCDice:Function}} options |
| 272 | fn | showComboBox | `showComboBox({ combos = [], effects = [], parameters = {}, readOnly = false, onSave })` | combos: Array<{id:string,name:string,timing:string\|null,effectNames:string[],abilityParamId:string\|null,skil… |

## トップレベル関数（LOCAL TASKS 候補）（12）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 42 | lowestBuffCriticalFloor | `lowestBuffCriticalFloor(token)` | 8 | ✓ |
| 59 | isDX3AbilityParam | `isDX3AbilityParam(paramId)` | 3 |  |
| 63 | isDX3SkillParam | `isDX3SkillParam(paramId)` | 6 |  |
| 74 | sortTimings | `sortTimings(timings)` | 10 |  |
| 87 | parseFinalNumber | `parseFinalNumber(resultText)` | 7 |  |
| 98 | logToMain | `logToMain(dispatch, resultText, token, system = 'コンボ', chatCommand)` | 9 |  |
| 110 | buildComboChatLines | `buildComboChatLines(comboName)` | 7 | ✓ |
| 120 | findComboByName | `findComboByName(combos, name)` | 3 | ✓ |
| 138 | runComboActivate | `runComboActivate({ spec, combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveEffects, chatCommand })` | 22 | ✓ |
| 165 | runComboCheck | `async runComboCheck({ combo, effects = [], tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, chatCommand })` | 58 | ✓ |
| 228 | runComboDamage | `async runComboDamage({ spec, combo, effects, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, chatCommand })` | 32 | ✓ |
| 272 | showComboBox | `showComboBox({ combos = [], effects = [], parameters = {}, readOnly = false, onSave })` | **278** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.parameters.skill.skill-use]], [[js.read-only-form]]
- imported by → [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
