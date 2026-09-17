---
source: js/store/round-state.js
lines: 449
exports: 24
imported_by: 4
api_sha: a1b653117445
prose_sha: a1b653117445
generated: 2026-09-17
tags: [codemap]
---

# js/store/round-state.js

<!-- prose:summary -->
ラウンド進行（Core機能）の状態そのものと、その状態から導ける読み取り。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ラウンド進行の状態の形（createInitialRoundState / normalizeRoundState）と、その状態から導ける読み取りだけを持つ。手番順の決め方はここに集約されていて、sortByInitiative（行動値の降順）・turnOrderSourceOf・sortForTurnOrder（プラグインが宣言した turnOrder、またはプロット値順）・listUnactedParticipants・pickNextActor がその一式。**その段で手番を持ちうるかの絞り込み（canActInPhase。フェーズの skipWhen 宣言。ステラナイツのシース）は listUnactedParticipants 1か所を通る**ので、手番の決定と画面の手番順リストが食い違わない。

プロットの枠（listPlotSlots / plotValueOf / listPlotSlotRows / listTiedPlotSlotKeys）も、読む口をここ一本にしてある。状態を書き換えるのは [[js.store.handlers.round]]、描くのは [[js.round-panel]]。
<!-- /prose:role -->

## export（24）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | createInitialRoundState | `createInitialRoundState()` | ラウンド進行（Core機能）の初期状態。 |
| 59 | fn | normalizeRoundState | `normalizeRoundState(round)` | 保存済み・同期されてきたround状態に欠けているキーを補う（hydrate専用）。 |
| 96 | fn | buildDerivedContext | `buildDerivedContext(round, tokenId)` | プラグインの自動計算（applyPluginDerivedParameters）へ渡す「コマ自身の外から決まる値」。 |
| 124 | fn | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | ラウンド進行が動いた後に、参加者の自動計算をやり直す。 |
| 150 | fn | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | フェーズに入るときの、プラグイン固有のパラメータ操作を適用する （ドラクルージュのラウンド頭の「喝采点+1・抗う力を2に戻す」）。 |
| 170 | fn | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | ラウンド進行の参加者をイニシアチブの実効値の降順に並べる（開始時・参加者変更時で同じ規則）。 |
| 184 | fn | turnOrderSourceOf | `turnOrderSourceOf(round)` | 今このラウンドで手番順の根拠になっているフェーズ（turnOrderを宣言したperCharacterフェーズ）。 |
| 200 | fn | listPlotSlots | `listPlotSlots(round, tokenId)` | このコマのプロット枠の一覧。 |
| 223 | fn | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | このコマが「結局どのプロットで動くか」。 |
| 231 | fn | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | プロットを増やしていて、まだどれで動くか選ばれていないか。 |
| 239 | fn | plotValueOf | `plotValueOf(round, tokenId)` | 手番順の根拠にするプロットの値。 |
| 258 | fn | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 手番順の並べ替え。 |
| 296 | const | PLOT_SLOT_LABEL_MAX | `PLOT_SLOT_LABEL_MAX` | 増やした枠に付ける名前。 |
| 298 | fn | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` |  |
| 308 | fn | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 枠の表示名。 |
| 324 | fn | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 手番順のコマ並びを、画面とログに出す「プロット枠1つ＝1行」へ展開する。 |
| 353 | fn | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 同値の判定で使う枠のキー。 |
| 365 | fn | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | プロットが同値（同じ値を出した相手がいる）の枠のキー。 |
| 386 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 同値の枠を持つコマのid（重複なし）。 |
| 404 | fn | canActInPhase | `canActInPhase(tokensState, phase, tokenId)` | その段で手番を持ちうるコマか。 |
| 412 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 428 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 441 | fn | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | フェーズに入るときのサブステップを決める。 |
| 446 | fn | joinTokenNames | `joinTokenNames(tokensState, ids)` | ログ表示用にコマ名を並べる（見つからないidはそのまま出す）。 |

## トップレベル関数（LOCAL TASKS 候補）（23）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | createInitialRoundState | `createInitialRoundState()` | 37 | ✓ |
| 59 | normalizeRoundState | `normalizeRoundState(round)` | 27 | ✓ |
| 96 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 19 | ✓ |
| 124 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 | ✓ |
| 150 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 | ✓ |
| 170 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 | ✓ |
| 184 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 | ✓ |
| 200 | listPlotSlots | `listPlotSlots(round, tokenId)` | 15 | ✓ |
| 223 | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | 6 | ✓ |
| 231 | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | 3 | ✓ |
| 239 | plotValueOf | `plotValueOf(round, tokenId)` | 7 | ✓ |
| 258 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 | ✓ |
| 298 | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` | 4 | ✓ |
| 308 | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 4 | ✓ |
| 324 | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 27 | ✓ |
| 353 | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 3 | ✓ |
| 365 | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | 18 | ✓ |
| 386 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 6 | ✓ |
| 404 | canActInPhase | `canActInPhase(tokensState, phase, tokenId)` | 7 | ✓ |
| 412 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 10 | ✓ |
| 428 | pickNextActor | `pickNextActor(tokensState, round)` | 10 | ✓ |
| 441 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 | ✓ |
| 446 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 | ✓ |

## 依存

- import → [[js.parameters.registry]], [[js.store.params]], [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.characters]], [[js.store.handlers.room]], [[js.store.handlers.round]]

## 注意

<!-- prose:notes -->
プロットを読むときは `round.plots` と `round.plotExtras` を呼び出し側で足し合わせないこと。listPlotSlots を通せば、増やした枠が無いコマでも必ず長さ1の配列が返る。足し合わせを自分で書くと、画面・ログ・並べ替えのどれかが片方を見落として食い違う。

公開前のプロットは並べ替えに使わない（sortForTurnOrder が plotsRevealed を見て従来の並びへ落とす）。値を伏せていても、並び順から大小が読めてしまうため。

canActInPhase / sortForTurnOrder が読むのは**実効値**（バフ込み）で、Core はその数値が何を表すかを知らない。意味付けはプラグインの computeDerivedParameters 側（[[js.parameters.registry]]）。
<!-- /prose:notes -->
