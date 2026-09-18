---
source: js/parameters/dice-draft/dice-draft-pool.js
lines: 364
exports: 6
imported_by: 4
api_sha: 42915e18369e
prose_sha: 42915e18369e
generated: 2026-09-18
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-pool.js

<!-- prose:summary -->
ダイスドラフトのプールを、振らずに直接動かす操作。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
プール（＝Coreのダイスドラフトパネル）そのものを、振らずに動かすコマンド 3つ（dice.change / dice.add / dice.erase）の書式と実行。特定のシステムの能力ではないので、diceDraft を宣言しているプラグインには [[js.parameters.registry]] が自動で生やす（プラグイン側に書くことは無い）。書式の解釈と中身は切り離してあり、runDiceChange / runDiceAdd / runDiceErase、それと id を指して消す runDiceDiscard を部品として公開する——対価や条件を足した合成コマンド（[[js.parameters.stella-knights]] のプチラッキー）と、パネルのゴミ箱（[[js.check-view.dice-draft-view]]）がこれを通るので、消し方もログの文言も1か所で済む。状態を動かす計算そのものは [[js.parameters.dice-draft.dice-draft-model]] にあり、ここが持つのは書式・断りの文言・チャットログ。dispatch などの依存は全部引数で受け取る（store を import すると循環する）。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 121 | fn | runDiceChange | `runDiceChange({ spec, token, dispatch, from, to, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | プールにある目 from のダイスを count 個だけ to へ変える。 |
| 167 | fn | runDiceAdd | `runDiceAdd({ spec, token, dispatch, value, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 目 value のダイスを count 個プールへ足す。 |
| 228 | fn | runDiceDiscard | `runDiceDiscard({ spec, token, dispatch, dieIds, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 指定のダイスを廃棄する（id指定）。 |
| 278 | fn | runDiceErase | `runDiceErase({ spec, token, dispatch, value, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | プールにある目 value のダイスを count 個廃棄する。 |
| 308 | fn | looksLikeDiceDraftPoolCommand | `looksLikeDiceDraftPoolCommand(rawInput)` | 「これは dice.* の書式だ」の判定。 |
| 322 | fn | handleDiceDraftPoolCommand | `handleDiceDraftPoolCommand(rawInput, { spec, token, dispatch, knownSkillNames = null })` | dice.change / dice.add / dice.erase を実行する。 |

## トップレベル関数（LOCAL TASKS 候補）（12）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | faceLabel | `faceLabel(value)` | 3 |  |
| 53 | collectDice | `collectDice(draft, dieIds)` | 6 |  |
| 61 | describeDice | `describeDice(dice)` | 7 |  |
| 69 | validFace | `validFace(value)` | 3 |  |
| 74 | rejectReason | `rejectReason(spec, token, faces, count)` | 12 |  |
| 87 | logToChat | `logToChat(dispatch, spec, token, chatCommand, lines)` | 13 |  |
| 121 | runDiceChange | `runDiceChange({ spec, token, dispatch, from, to, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 36 | ✓ |
| 167 | runDiceAdd | `runDiceAdd({ spec, token, dispatch, value, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 40 | ✓ |
| 228 | runDiceDiscard | `runDiceDiscard({ spec, token, dispatch, dieIds, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 37 | ✓ |
| 278 | runDiceErase | `runDiceErase({ spec, token, dispatch, value, count = 1, knownSkillNames = null, chatCommand = '', silent = false, notify = (message) => alert(message) })` | 25 | ✓ |
| 308 | looksLikeDiceDraftPoolCommand | `looksLikeDiceDraftPoolCommand(rawInput)` | 6 | ✓ |
| 322 | handleDiceDraftPoolCommand | `handleDiceDraftPoolCommand(rawInput, { spec, token, dispatch, knownSkillNames = null })` | 42 | ✓ |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]]
- imported by → [[js.check-view.dice-draft-view]], [[js.main]], [[js.parameters.registry]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
