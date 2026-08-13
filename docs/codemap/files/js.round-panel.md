---
source: js/round-panel.js
lines: 433
exports: 2
imported_by: 1
api_sha: 607d81b1a1a8
prose_sha: 607d81b1a1a8
generated: 2026-08-13
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
| 238 | fn | startRoundProgression | `startRoundProgression()` | ルームメニュー（⋮）の「ラウンド進行を開始」から呼ばれる。 |
| 248 | fn | initRoundPanel | `initRoundPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（14）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | getTokenName | `getTokenName(state, tokenId)` | 3 |  |
| 34 | currentPhase | `currentPhase(round)` | 3 |  |
| 39 | isPreTurnStep | `isPreTurnStep(round)` | 3 |  |
| 44 | isPlotPhase | `isPlotPhase(round)` | 3 |  |
| 49 | usesPlotTurnOrder | `usesPlotTurnOrder(round)` | 3 |  |
| 55 | listTurnOrderRows | `listTurnOrderRows(state, round)` | 11 |  |
| 69 | buildTurnRow | `buildTurnRow(state, round, tokenId, canOperate, tiedIds = [])` | 58 |  |
| 128 | listBoardTokens | `listBoardTokens(state)` | 5 |  |
| 136 | listMyPlotTokenIds | `listMyPlotTokenIds(state, round)` | 3 |  |
| 146 | buildPlotInputRow | `buildPlotInputRow(state, round, tokenId)` | 50 |  |
| 198 | describePlotStatus | `describePlotStatus(state, round)` | 13 |  |
| 213 | renderPlotSection | `renderPlotSection(plotEl, state, round)` | 21 |  |
| 238 | startRoundProgression | `startRoundProgression()` | 9 | ✓ |
| 248 | initRoundPanel | `initRoundPanel()` | 185 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.context-menu]], [[js.game-store]], [[js.local-identity]], [[js.room-authority]], [[js.round-setup-dialog]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
