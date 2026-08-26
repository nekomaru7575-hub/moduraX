---
source: js/round-panel.js
lines: 630
exports: 2
imported_by: 1
api_sha: 607d81b1a1a8
prose_sha: 607d81b1a1a8
generated: 2026-08-26
tags: [codemap]
---

# js/round-panel.js

<!-- prose:summary -->
ラウンド進行の状態バー。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ラウンド進行の状態バー。現在のラウンド・フェーズ・手番を表示し、進行操作を受ける。進行してよいかの判定は [[js.room-authority]]、参加者の選択は [[js.round-setup-dialog]]、フェーズの階層とバフの失効は [[js.game-store]] に委ねる。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 428 | fn | startRoundProgression | `startRoundProgression()` | ルームメニュー（⋮）の「ラウンド進行を開始」から呼ばれる。 |
| 438 | fn | initRoundPanel | `initRoundPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 35 | getTokenName | `getTokenName(state, tokenId)` | 3 |  |
| 39 | currentPhase | `currentPhase(round)` | 3 |  |
| 44 | isPreTurnStep | `isPreTurnStep(round)` | 3 |  |
| 49 | isPlotPhase | `isPlotPhase(round)` | 3 |  |
| 54 | usesPlotTurnOrder | `usesPlotTurnOrder(round)` | 3 |  |
| 70 | listTurnOrderRows | `listTurnOrderRows(state, round)` | 22 |  |
| 99 | buildTurnRow | `buildTurnRow(state, round, turnRow, canOperate, tiedKeys = [])` | 81 |  |
| 181 | listBoardTokens | `listBoardTokens(state)` | 5 |  |
| 189 | listMyPlotTokenIds | `listMyPlotTokenIds(state, round)` | 4 |  |
| 204 | buildPlotSlotRow | `buildPlotSlotRow(state, round, tokenId, slot, slotIndex)` | 85 |  |
| 291 | buildPlotInputRows | `buildPlotInputRows(state, round, tokenId)` | 21 |  |
| 316 | buildPlotChoiceRow | `buildPlotChoiceRow(state, round, tokenId)` | 38 |  |
| 357 | describePlotStatus | `describePlotStatus(state, round)` | 24 |  |
| 387 | renderPlotSection | `renderPlotSection(plotEl, state, round)` | 37 |  |
| 428 | startRoundProgression | `startRoundProgression()` | 9 | ✓ |
| 438 | initRoundPanel | `initRoundPanel()` | 192 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.context-menu]], [[js.game-store]], [[js.icons]], [[js.local-identity]], [[js.room-authority]], [[js.round-setup-dialog]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
