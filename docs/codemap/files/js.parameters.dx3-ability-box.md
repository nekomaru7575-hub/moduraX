---
source: js/parameters/dx3-ability-box.js
lines: 400
exports: 1
imported_by: 1
api_sha: fa249eead9c6
prose_sha: fa249eead9c6
generated: 2026-08-11
tags: [codemap]
---

# js/parameters/dx3-ability-box.js

<!-- prose:summary -->
DX3の能力値・技能値をまとめて表示する「ボックス」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3 の能力値・技能値を一覧表示し、判定コマンドをコピーできるボックス UI。値そのものはキャラクターのパラメータとして [[js.parameters.dx3]] 側が保持する。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 109 | fn | showAbilitySkillBox | `showAbilitySkillBox({ parameters, token = null, getEffectiveParameterValue, editable = false, onSave })` | token?: object, getEffectiveParameterValue?: (token:object, paramId:string) => number\|undefined, editable?: … |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 25 | collectSkillParamEntries | `collectSkillParamEntries(parameters)` | 14 |  |
| 41 | collectAbilityParamEntries | `collectAbilityParamEntries(parameters)` | 5 |  |
| 52 | readEffectiveOrBaseValue | `readEffectiveOrBaseValue(paramId, { parameters, token, getEffectiveParameterValue })` | 7 |  |
| 67 | canSendToChat | `canSendToChat()` | 3 |  |
| 71 | sendDX3CheckCommand | `sendDX3CheckCommand(command)` | 11 |  |
| 88 | buildDX3CheckCommand | `buildDX3CheckCommand({ abilityValue, dbValue, adbValue, criticalValue, skillValue, anbValue, skillLabel })` | 3 |  |
| 94 | ensureDialog | `ensureDialog()` | 7 |  |
| 109 | showAbilitySkillBox | `showAbilitySkillBox({ parameters, token = null, getEffectiveParameterValue, editable = false, onSave })` | **291** | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
