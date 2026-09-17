---
source: js/store/round-state.js
lines: 510
exports: 26
imported_by: 4
api_sha: ee4eba24fcd5
prose_sha: ee4eba24fcd5
generated: 2026-09-17
tags: [codemap]
---

# js/store/round-state.js

<!-- prose:summary -->
ラウンド進行（Core機能）の状態そのものと、その状態から導ける読み取り。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ラウンド進行の状態の形（createInitialRoundState / normalizeRoundState）と、その状態から
導ける読み取りだけを持つ。手番順の決め方はここに集約されていて、sortByInitiative（行動値の
降順）・turnOrderSourceOf・sortForTurnOrder（プラグインが宣言した turnOrder、またはプロット値順）・
listUnactedParticipants・pickNextActor がその一式。**その段で手番を持ちうるかの絞り込み
（canActInPhase。フェーズの skipWhen 宣言。ステラナイツのシース）は listUnactedParticipants
1か所を通る**ので、手番の決定と画面の手番順リストが食い違わない。

1手番／1フェーズを何回の押下で進めるかの宣言（フェーズの `steps`）もここで解く。
listStepsForPhase が onlyWhen でその手番のコマに当てはまる段だけを返し、startStepForTurn が
フェーズ／手番に入るときの round.step を決める。プロットの枠（listPlotSlots / plotValueOf /
listPlotSlotRows / listTiedPlotSlotKeys）も、読む口をここ一本にしてある。

状態を書き換えるのは [[js.store.handlers.round]]、描くのは [[js.round-panel]]。
<!-- /prose:role -->

## export（26）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | createInitialRoundState | `createInitialRoundState()` | ラウンド進行（Core機能）の初期状態。 |
| 59 | fn | normalizeRoundState | `normalizeRoundState(round)` | 保存済み・同期されてきたround状態に欠けているキーを補う（hydrate専用）。 |
| 99 | fn | buildDerivedContext | `buildDerivedContext(round, tokenId)` | プラグインの自動計算（applyPluginDerivedParameters）へ渡す「コマ自身の外から決まる値」。 |
| 127 | fn | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | ラウンド進行が動いた後に、参加者の自動計算をやり直す。 |
| 153 | fn | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | フェーズに入るときの、プラグイン固有のパラメータ操作を適用する （ドラクルージュのラウンド頭の「喝采点+1・抗う力を2に戻す」）。 |
| 173 | fn | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | ラウンド進行の参加者をイニシアチブの実効値の降順に並べる（開始時・参加者変更時で同じ規則）。 |
| 187 | fn | turnOrderSourceOf | `turnOrderSourceOf(round)` | 今このラウンドで手番順の根拠になっているフェーズ（turnOrderを宣言したperCharacterフェーズ）。 |
| 203 | fn | listPlotSlots | `listPlotSlots(round, tokenId)` | このコマのプロット枠の一覧。 |
| 226 | fn | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | このコマが「結局どのプロットで動くか」。 |
| 234 | fn | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | プロットを増やしていて、まだどれで動くか選ばれていないか。 |
| 242 | fn | plotValueOf | `plotValueOf(round, tokenId)` | 手番順の根拠にするプロットの値。 |
| 261 | fn | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 手番順の並べ替え。 |
| 299 | const | PLOT_SLOT_LABEL_MAX | `PLOT_SLOT_LABEL_MAX` | 増やした枠に付ける名前。 |
| 301 | fn | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` |  |
| 311 | fn | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 枠の表示名。 |
| 327 | fn | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 手番順のコマ並びを、画面とログに出す「プロット枠1つ＝1行」へ展開する。 |
| 356 | fn | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 同値の判定で使う枠のキー。 |
| 368 | fn | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | プロットが同値（同じ値を出した相手がいる）の枠のキー。 |
| 389 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 同値の枠を持つコマのid（重複なし）。 |
| 415 | fn | canActInPhase | `canActInPhase(tokensState, phase, tokenId)` | その段で手番を持ちうるコマか。 |
| 438 | fn | listStepsForPhase | `listStepsForPhase(tokensState, phase, actorId)` | そのフェーズで、その手番のコマに当てはまる段（steps）の一覧。 |
| 459 | fn | listPhaseSteps | `listPhaseSteps(tokensState, round)` | 今いる段の、今の手番のコマに当てはまる段の一覧。 |
| 467 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 483 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 501 | fn | startStepForTurn | `startStepForTurn(tokensState, phase, actorId, useInitiativeProcess)` | フェーズ／手番に入るときの round.step を決める。 |
| 507 | fn | joinTokenNames | `joinTokenNames(tokensState, ids)` | ログ表示用にコマ名を並べる（見つからないidはそのまま出す）。 |

## トップレベル関数（LOCAL TASKS 候補）（26）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | createInitialRoundState | `createInitialRoundState()` | 37 | ✓ |
| 59 | normalizeRoundState | `normalizeRoundState(round)` | 30 | ✓ |
| 99 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 19 | ✓ |
| 127 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 | ✓ |
| 153 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 | ✓ |
| 173 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 | ✓ |
| 187 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 | ✓ |
| 203 | listPlotSlots | `listPlotSlots(round, tokenId)` | 15 | ✓ |
| 226 | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | 6 | ✓ |
| 234 | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | 3 | ✓ |
| 242 | plotValueOf | `plotValueOf(round, tokenId)` | 7 | ✓ |
| 261 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 | ✓ |
| 301 | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` | 4 | ✓ |
| 311 | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 4 | ✓ |
| 327 | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 27 | ✓ |
| 356 | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 3 | ✓ |
| 368 | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | 18 | ✓ |
| 389 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 6 | ✓ |
| 409 | matchesParamCondition | `matchesParamCondition(tokensState, condition, tokenId)` | 5 |  |
| 415 | canActInPhase | `canActInPhase(tokensState, phase, tokenId)` | 6 | ✓ |
| 438 | listStepsForPhase | `listStepsForPhase(tokensState, phase, actorId)` | 15 | ✓ |
| 459 | listPhaseSteps | `listPhaseSteps(tokensState, round)` | 7 | ✓ |
| 467 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 10 | ✓ |
| 483 | pickNextActor | `pickNextActor(tokensState, round)` | 10 | ✓ |
| 501 | startStepForTurn | `startStepForTurn(tokensState, phase, actorId, useInitiativeProcess)` | 4 | ✓ |
| 507 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 | ✓ |

## 依存

- import → [[js.parameters.registry]], [[js.store.params]], [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.characters]], [[js.store.handlers.room]], [[js.store.handlers.round]]

## 注意

<!-- prose:notes -->
**段（steps）は添字ではなく id で進む**（round.step が `'preTurn' | 'act' | <段のid>`）。
当てはまる段の数は onlyWhen で手番のコマ次第で変わるので、添字だと手番中のコマを参加者から
外した瞬間に範囲外を読んで進行が止まる。id なら一覧に無い id は「次の1押しで完了」へ落ちる。
これは手番を participants の添字で持たないのと同じ理由（このファイル冒頭）。

listStepsForPhase はラベルの長さと件数を丸める。round.template は取り込んだ部屋のJSONからも
来るうえ、ラベルは進行ボタンの文字になるため。読む口が1つなのでここだけで足りる。

プロットを読むときは round.plots と round.plotExtras を呼び出し側で足し合わせないこと。
listPlotSlots を通せば、増やした枠が無いコマでも必ず長さ1の配列が返る。

公開前のプロットは並べ替えに使わない（sortForTurnOrder が plotsRevealed を見て従来の並びへ
落とす）。値を伏せていても、並び順から大小が読めてしまうため。

canActInPhase / listStepsForPhase / sortForTurnOrder が読むのは**実効値**（バフ込み）で、
Core はその数値が何を表すかを知らない。意味付けはプラグイン側（[[js.parameters.registry]]）。
<!-- /prose:notes -->
