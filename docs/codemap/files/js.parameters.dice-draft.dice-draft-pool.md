---
source: js/parameters/dice-draft/dice-draft-pool.js
lines: 226
exports: 4
imported_by: 3
api_sha: 0925a9a8d8fa
prose_sha: 0925a9a8d8fa
generated: 2026-09-01
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-pool.js

<!-- prose:summary -->
ダイスドラフトのプールを、振らずに直接動かす操作。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 93 | fn | runDiceChange | `runDiceChange({ spec, token, dispatch, from, to, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | プールにある目 from のダイスを count 個だけ to へ変える。 |
| 139 | fn | runDiceAdd | `runDiceAdd({ spec, token, dispatch, value, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 目 value のダイスを count 個プールへ足す。 |
| 184 | fn | looksLikeDiceDraftPoolCommand | `looksLikeDiceDraftPoolCommand(rawInput)` | 「これは dice.* の書式だ」の判定。 |
| 196 | fn | handleDiceDraftPoolCommand | `handleDiceDraftPoolCommand(rawInput, { spec, token, dispatch, knownSkillNames = null })` | dice.change / dice.add を実行する。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 39 | faceLabel | `faceLabel(value)` | 3 |  |
| 43 | validFace | `validFace(value)` | 3 |  |
| 48 | rejectReason | `rejectReason(spec, token, faces, count)` | 10 |  |
| 59 | logToChat | `logToChat(dispatch, spec, token, chatCommand, lines)` | 13 |  |
| 93 | runDiceChange | `runDiceChange({ spec, token, dispatch, from, to, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 36 | ✓ |
| 139 | runDiceAdd | `runDiceAdd({ spec, token, dispatch, value, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 40 | ✓ |
| 184 | looksLikeDiceDraftPoolCommand | `looksLikeDiceDraftPoolCommand(rawInput)` | 4 | ✓ |
| 196 | handleDiceDraftPoolCommand | `handleDiceDraftPoolCommand(rawInput, { spec, token, dispatch, knownSkillNames = null })` | 30 | ✓ |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]]
- imported by → [[js.main]], [[js.parameters.registry]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
