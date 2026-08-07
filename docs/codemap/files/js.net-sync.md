---
source: js/net-sync.js
lines: 257
exports: 5
imported_by: 2
api_sha: 85ef9265774b
prose_sha: 85ef9265774b
generated: 2026-08-07
tags: [codemap]
---

# js/net-sync.js

<!-- prose:summary -->
ブラウザ側のWebSocketクライアント。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
WebSocket クライアント。接続・再接続・identify（本人確認）・状態の全置換を担う。受け取った状態は [[js.state-import]] で均してから [[js.game-store]] へ入る。入室パスワードが要るときは [[js.room-entry-dialog]] を出す。受信した ACTION が入室メッセージ（ADD_ENTRY_MESSAGE）で入室音の URL を伴っていれば、その URL をそのまま [[js.audio-player]] の playEntrySound へ渡すだけで、鳴らすかどうかの判断や音量管理は持たない。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 45 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 205 | fn | initNetSync | `initNetSync()` |  |
| 225 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 237 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除をサーバーへ要求する。 |
| 246 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数・非export（4）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 51 | askEntryPassword | `askEntryPassword({ error })` | 1 |
| 64 | sendJoin | `sendJoin()` | 10 |
| 79 | flushIdentify | `flushIdentify()` | 5 |
| 85 | connect | `connect()` | 119 |

## 依存

- import → [[js.EventBus]], [[js.audio-player]], [[js.game-store]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
