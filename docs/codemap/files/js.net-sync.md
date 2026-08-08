---
source: js/net-sync.js
lines: 287
exports: 6
imported_by: 2
api_sha: 02697d66490c
prose_sha: 02697d66490c
generated: 2026-08-08
tags: [codemap]
---

# js/net-sync.js

<!-- prose:summary -->
ブラウザ側のWebSocketクライアント。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
store.dispatchをラップし、ローカル適用に加えてサーバーへACTIONを送信、サーバー・他クライアントからのACTIONをlocalDispatchでローカルへ適用するWebSocketクライアント。入室音・チャット送信音は自分では鳴らさず、ACTIONメッセージのpayloadで届いたURLを[[js.audio-player]]のplayEntrySound/playChatSendSoundへ渡すだけ（requestChatSendSoundは要求を送るのみで、鳴らすURLの決定はサーバー任せ）。入室パスワードの入力UIは持たず[[js.room-entry-dialog]]に委譲し、状態の丸ごと置き換え（replaceState）は[[js.state-import]]のadoptImportedStateを通す。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 217 | fn | initNetSync | `initNetSync()` |  |
| 237 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 250 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 259 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除をサーバーへ要求する。 |
| 268 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（10）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 46 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 52 | askEntryPassword | `askEntryPassword({ error })` | 10 |  |
| 65 | sendJoin | `sendJoin()` | 10 |  |
| 80 | flushIdentify | `flushIdentify()` | 5 |  |
| 86 | connect | `connect()` | 130 |  |
| 217 | initNetSync | `initNetSync()` | 13 | ✓ |
| 237 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 8 | ✓ |
| 250 | requestChatSendSound | `requestChatSendSound()` | 5 | ✓ |
| 259 | requestRoomDeletion | `requestRoomDeletion()` | 5 | ✓ |
| 268 | replaceState | `replaceState(newState)` | 19 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.audio-player]], [[js.game-store]], [[js.local-identity]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
