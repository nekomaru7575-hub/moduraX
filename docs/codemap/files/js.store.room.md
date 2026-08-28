---
source: js/store/room.js
lines: 88
exports: 10
imported_by: 6
api_sha: 6432f88cc011
prose_sha: 6432f88cc011
generated: 2026-08-28
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
| 12 | const | ROUND_ROOM_PARAM_ID | `ROUND_ROOM_PARAM_ID` | Core自身のルーム変数「現在のラウンド」（js/parameters/core.js）のID。 |
| 21 | fn | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | Coreのルーム変数を、今のラウンド進行の状態に合わせる。 |
| 43 | fn | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 「部屋全体から決まるルーム変数」を計算し直したroomを返す（Coreの現在のラウンド、 ステラナイツのブーケ合計）。 |
| 54 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 60 | const | DEFAULT_BOARD_COLS | `DEFAULT_BOARD_COLS` | 新しい部屋の盤面サイズ（マス数）。 |
| 61 | const | DEFAULT_BOARD_ROWS | `DEFAULT_BOARD_ROWS` |  |
| 64 | const | BOARD_GRID_SIZE | `BOARD_GRID_SIZE` | マス1つのピクセル数。 |
| 68 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 75 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 85 | fn | snapsToGrid | `snapsToGrid(state)` | 盤面のオブジェクト（コマ・パネル・カード・デッキ）を、離した位置からマス目へ吸着させるか （ルーム単位・全員共通）。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | 9 | ✓ |
| 43 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 10 | ✓ |
| 68 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 75 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 85 | snapsToGrid | `snapsToGrid(state)` | 3 | ✓ |

## 依存

- import → [[js.parameters.core]], [[js.parameters.registry]]
- imported by → [[js.game-store]], [[js.store.handlers.characters]], [[js.store.handlers.chat]], [[js.store.handlers.participants]], [[js.store.handlers.room]], [[js.store.handlers.round]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
