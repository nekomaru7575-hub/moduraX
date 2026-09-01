---
source: js/parameters/dice-draft/dice-draft-use.js
lines: 142
exports: 1
imported_by: 2
api_sha: 7cb2872b952b
prose_sha: 7cb2872b952b
generated: 2026-09-01
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-use.js

<!-- prose:summary -->
ダイスドラフトの「発動」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 35 | fn | runDiceDraftUse | `runDiceDraftUse({ spec, skillName, mode = 'all', targetValue = null, token, dispatch, getToken, getEffectiveParameterValue, generateBuffId, chatCommand = '', notify = (message) => alert(message) })` | 乗っているダイスでスキルを発動する。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 35 | runDiceDraftUse | `runDiceDraftUse({ spec, skillName, mode = 'all', targetValue = null, token, dispatch, getToken, getEffectiveParameterValue, generateBuffId, chatCommand = '', notify = (message) => alert(message) })` | 107 | ✓ |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.dice-draft-panel]], [[js.parameters.dracurouge]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
