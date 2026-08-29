---
source: js/parameters/dice-draft/dice-draft-roll.js
lines: 131
exports: 3
imported_by: 5
api_sha: 8c5959783c1f
prose_sha: 8c5959783c1f
generated: 2026-08-29
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-roll.js

<!-- prose:summary -->
「ダイスを振ってドラフトのプールへ入れる」共通処理。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 17 | const | DICE_DRAFT_COMPONENT_KEY | `DICE_DRAFT_COMPONENT_KEY` |  |
| 21 | fn | readDraft | `readDraft(components, knownSkillNames = null)` | コマの components から正規形のドラフトを取り出す。 |
| 49 | fn | runDiceDraftRoll | `runDiceDraftRoll({ spec, token, dispatch, rollBCDice, count, buildCommand = null, readRolledDice = null, knownSkillNames = null, chatCommand = '' })` | ダイスを振ってプールへ入れ、演出とチャットログを出す。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | readDraft | `readDraft(components, knownSkillNames = null)` | 3 | ✓ |
| 49 | runDiceDraftRoll | `runDiceDraftRoll({ spec, token, dispatch, rollBCDice, count, buildCommand = null, readRolledDice = null, knownSkillNames = null, chatCommand = '' })` | 82 | ✓ |

## 依存

- import → [[js.dice-notation]], [[js.parameters.dice-draft.dice-draft-model]]
- imported by → [[js.dice-draft-panel]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
