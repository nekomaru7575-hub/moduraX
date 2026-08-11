---
source: js/parameters/skill/skill-use.js
lines: 211
exports: 4
imported_by: 3
api_sha: ff0a6905208a
prose_sha: ff0a6905208a
generated: 2026-08-11
tags: [codemap]
---

# js/parameters/skill/skill-use.js

<!-- prose:summary -->
スキルの「使用」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | fn | buildUseFailureMessage | `buildUseFailureMessage(spec, blocked)` | 使用できないスキルがあったときにユーザーへ出す文面。 |
| 39 | fn | sumSkillCosts | `sumSkillCosts(spec, skills)` | 使用時に払うコスト（specのfields[].onUseで宣言された欄）を、パラメータごとに合計する。 |
| 68 | fn | applySkillCosts | `applySkillCosts({ costs, token, tokenId, dispatch })` | コストをパラメータの基礎値へ加算する。 |
| 135 | fn | runSkillUse | `runSkillUse({ spec, targetSkills, allSkills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, logTitle, logDetail = '', logSystem, chatCommand, expirePhaseFallback = null, tag = null, applyCosts = true, buffNameFallback = '' })` | スキルを使用する。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 27 | buildUseFailureMessage | `buildUseFailureMessage(spec, blocked)` | 6 | ✓ |
| 39 | sumSkillCosts | `sumSkillCosts(spec, skills)` | 22 | ✓ |
| 68 | applySkillCosts | `applySkillCosts({ costs, token, tokenId, dispatch })` | 10 | ✓ |
| 82 | groupBuffs | `groupBuffs(spec, skills, context, expirePhaseFallback)` | 29 |  |
| 135 | runSkillUse | `runSkillUse({ spec, targetSkills, allSkills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, logTitle, logDetail = '', logSystem, chatCommand, expirePhaseFallback = null, tag = null, applyCosts = true, buffNameFallback = '' })` | 76 | ✓ |

## 依存

- import → [[js.parameters.skill.skill-model]]
- imported by → [[js.parameters.dx3-combo-box]], [[js.parameters.dx3]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
