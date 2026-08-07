---
source: js/net-sync.js
lines: 250
exports: 5
imported_by: 2
api_sha: 6007f21ce6c7
prose_sha: 6007f21ce6c7
generated: 2026-08-07
tags: [codemap]
---

# js/net-sync.js

<!-- prose:summary -->
ブラウザ側のWebSocketクライアント。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
WebSocket クライアント。接続・再接続・identify（本人確認）・状態の全置換を担う。受け取った状態は [[js.state-import]] で均してから [[js.game-store]] へ入る。入室パスワードが要るときは [[js.room-entry-dialog]] を出す。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 44 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 199 | fn | initNetSync | `initNetSync()` |  |
| 218 | fn | sendIdentify | `sendIdentify(participantId, authToken)` | この接続での名乗りをサーバーへ伝える。 |
| 230 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除をサーバーへ要求する。 |
| 239 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数・非export（4）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 50 | askEntryPassword | `askEntryPassword({ error })` | 1 |
| 63 | sendJoin | `sendJoin()` | 10 |
| 78 | flushIdentify | `flushIdentify()` | 5 |
| 84 | connect | `connect()` | 114 |

## 依存

- import → [[js.EventBus]], [[js.game-store]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
