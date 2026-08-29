---
source: js/store/round-state.js
lines: 434
exports: 23
imported_by: 4
api_sha: 4c4f6aaae07e
prose_sha: 4c4f6aaae07e
generated: 2026-08-29
tags: [codemap]
---

# js/store/round-state.js

<!-- prose:summary -->
ラウンド進行（Core機能）の状態そのものと、その状態から導ける読み取り。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（23）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | createInitialRoundState | `createInitialRoundState()` | ラウンド進行（Core機能）の初期状態。 |
| 59 | fn | normalizeRoundState | `normalizeRoundState(round)` | 保存済み・同期されてきたround状態に欠けているキーを補う（hydrate専用）。 |
| 105 | fn | buildDerivedContext | `buildDerivedContext(round, tokenId)` | プラグインの自動計算（applyPluginDerivedParameters）へ渡す「コマ自身の外から決まる値」。 |
| 133 | fn | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | ラウンド進行が動いた後に、参加者の自動計算をやり直す。 |
| 159 | fn | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | フェーズに入るときの、プラグイン固有のパラメータ操作を適用する （ドラクルージュのラウンド頭の「喝采点+1・抗う力を2に戻す」）。 |
| 179 | fn | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | ラウンド進行の参加者をイニシアチブの実効値の降順に並べる（開始時・参加者変更時で同じ規則）。 |
| 193 | fn | turnOrderSourceOf | `turnOrderSourceOf(round)` | 今このラウンドで手番順の根拠になっているフェーズ（turnOrderを宣言したperCharacterフェーズ）。 |
| 209 | fn | listPlotSlots | `listPlotSlots(round, tokenId)` | このコマのプロット枠の一覧。 |
| 232 | fn | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | このコマが「結局どのプロットで動くか」。 |
| 240 | fn | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | プロットを増やしていて、まだどれで動くか選ばれていないか。 |
| 248 | fn | plotValueOf | `plotValueOf(round, tokenId)` | 手番順の根拠にするプロットの値。 |
| 267 | fn | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 手番順の並べ替え。 |
| 305 | const | PLOT_SLOT_LABEL_MAX | `PLOT_SLOT_LABEL_MAX` | 増やした枠に付ける名前。 |
| 307 | fn | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` |  |
| 317 | fn | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 枠の表示名。 |
| 333 | fn | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 手番順のコマ並びを、画面とログに出す「プロット枠1つ＝1行」へ展開する。 |
| 362 | fn | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 同値の判定で使う枠のキー。 |
| 374 | fn | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | プロットが同値（同じ値を出した相手がいる）の枠のキー。 |
| 395 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 同値の枠を持つコマのid（重複なし）。 |
| 405 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 417 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 426 | fn | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | フェーズに入るときのサブステップを決める。 |
| 431 | fn | joinTokenNames | `joinTokenNames(tokensState, ids)` | ログ表示用にコマ名を並べる（見つからないidはそのまま出す）。 |

## トップレベル関数（LOCAL TASKS 候補）（22）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | createInitialRoundState | `createInitialRoundState()` | 37 | ✓ |
| 59 | normalizeRoundState | `normalizeRoundState(round)` | 36 | ✓ |
| 105 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 19 | ✓ |
| 133 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 | ✓ |
| 159 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 | ✓ |
| 179 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 | ✓ |
| 193 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 | ✓ |
| 209 | listPlotSlots | `listPlotSlots(round, tokenId)` | 15 | ✓ |
| 232 | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | 6 | ✓ |
| 240 | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | 3 | ✓ |
| 248 | plotValueOf | `plotValueOf(round, tokenId)` | 7 | ✓ |
| 267 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 | ✓ |
| 307 | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` | 4 | ✓ |
| 317 | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 4 | ✓ |
| 333 | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 27 | ✓ |
| 362 | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 3 | ✓ |
| 374 | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | 18 | ✓ |
| 395 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 6 | ✓ |
| 405 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 6 | ✓ |
| 417 | pickNextActor | `pickNextActor(tokensState, round)` | 6 | ✓ |
| 426 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 | ✓ |
| 431 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 | ✓ |

## 依存

- import → [[js.parameters.registry]], [[js.store.params]], [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.characters]], [[js.store.handlers.room]], [[js.store.handlers.round]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
