---
source: js/store/room.js
lines: 156
exports: 10
imported_by: 7
api_sha: 6432f88cc011
prose_sha: 6432f88cc011
generated: 2026-09-10
tags: [codemap]
---

# js/store/room.js

<!-- prose:summary -->
部屋そのものの既定値と、部屋の設定を読むための小さな述語。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | const | ROUND_ROOM_PARAM_ID | `ROUND_ROOM_PARAM_ID` | Core自身のルーム変数「現在のラウンド」（js/parameters/core.js）のID。 |
| 24 | fn | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | Coreのルーム変数を、今のラウンド進行の状態に合わせる。 |
| 108 | fn | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 「部屋全体から決まるルーム変数」を計算し直したroomを返す（Coreの現在のラウンド、 集計するスタンプの合計、ステラナイツのブーケ合計）。 |
| 122 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 128 | const | DEFAULT_BOARD_COLS | `DEFAULT_BOARD_COLS` | 新しい部屋の盤面サイズ（マス数）。 |
| 129 | const | DEFAULT_BOARD_ROWS | `DEFAULT_BOARD_ROWS` |  |
| 132 | const | BOARD_GRID_SIZE | `BOARD_GRID_SIZE` | マス1つのピクセル数。 |
| 136 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 143 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 153 | fn | snapsToGrid | `snapsToGrid(state)` | 盤面のオブジェクト（コマ・パネル・カード・デッキ）を、離した位置からマス目へ吸着させるか （ルーム単位・全員共通）。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | 9 | ✓ |
| 52 | withRoomStampTotals | `withRoomStampTotals(parameters, stamps, stampCounts)` | 39 |  |
| 108 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 13 | ✓ |
| 136 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 143 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 153 | snapsToGrid | `snapsToGrid(state)` | 3 | ✓ |

## 依存

- import → [[js.parameters.core]], [[js.parameters.registry]], [[js.store.stamps]]
- imported by → [[js.game-store]], [[js.net-host]], [[js.store.handlers.characters]], [[js.store.handlers.chat]], [[js.store.handlers.participants]], [[js.store.handlers.room]], [[js.store.handlers.round]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
