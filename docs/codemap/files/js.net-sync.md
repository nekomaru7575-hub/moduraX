---
source: js/net-sync.js
lines: 409
exports: 9
imported_by: 3
api_sha: 4fc499cfc0b5
prose_sha: 4fc499cfc0b5
generated: 2026-08-30
tags: [codemap]
---

# js/net-sync.js

<!-- prose:summary -->
ブラウザ側のWebSocketクライアント。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
store.dispatchをラップし、ローカル適用に加えてサーバーへACTIONを送信、サーバー・他クライアントからのACTIONをlocalDispatchでローカルへ適用するWebSocketクライアント。このラップ時（initNetSync）にアクションの時刻（payload.time）を1回だけ確定させて乗せるのも役目で、送信者のローカル適用・サーバーの権威適用・他クライアントへの中継適用が全員同じ値を見る（[[js.game-store]]のwithChatEntry/withSystemLogがpayload.timeを尊重する）。入室音・チャット送信音は自分では鳴らさず、ACTIONメッセージのpayloadで届いたURLを[[js.audio-player]]のplayEntrySound/playChatSendSoundへ渡すだけ（requestChatSendSoundは要求を送るのみで、鳴らすURLの決定はサーバー任せ）。入室パスワードの入力UIは持たず[[js.room-entry-dialog]]に委譲し、状態の丸ごと置き換え（replaceState）は[[js.state-import]]のadoptImportedStateを通す。記入中表示（sendTypingStart/sendTypingStop、TYPING_USERS）はACTIONによる部屋の状態同期とは別系統の揮発的なメッセージで、requestChatSendSoundと同じく要求を送るだけ。記入中の参加者一覧はサーバーが権威を持ち、このモジュールは送受信を中継するのみで、[[js.game-store]]の状態には入れない。
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 47 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 280 | fn | initNetSync | `initNetSync()` |  |
| 339 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 352 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 359 | fn | sendStamp | `sendStamp(stampId)` | スタンプを送る。 |
| 366 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除をサーバーへ要求する。 |
| 372 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 377 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 384 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（20）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 53 | askEntryPassword | `askEntryPassword({ error })` | 10 |  |
| 66 | sendJoin | `sendJoin()` | 8 |  |
| 79 | flushIdentify | `flushIdentify()` | 4 |  |
| 84 | connect | `connect()` | 9 |  |
| 94 | handleOpen | `handleOpen()` | 6 |  |
| 103 | handleMessage | `handleMessage(message)` | 90 |  |
| 195 | handleClose | `handleClose({ code })` | 41 |  |
| 239 | generateChatEntryId | `generateChatEntryId()` | 4 |  |
| 255 | withStampedChatEntry | `withStampedChatEntry(action, payload)` | 12 |  |
| 275 | stampPayload | `stampPayload(action, payload)` | 4 |  |
| 280 | initNetSync | `initNetSync()` | 16 | ✓ |
| 303 | initAsHost | `initAsHost()` | 24 |  |
| 339 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 8 | ✓ |
| 352 | requestChatSendSound | `requestChatSendSound()` | 3 | ✓ |
| 359 | sendStamp | `sendStamp(stampId)` | 3 | ✓ |
| 366 | requestRoomDeletion | `requestRoomDeletion()` | 3 | ✓ |
| 372 | sendTypingStart | `sendTypingStart()` | 3 | ✓ |
| 377 | sendTypingStop | `sendTypingStop()` | 3 | ✓ |
| 384 | replaceState | `replaceState(newState)` | 25 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.audio-player]], [[js.game-store]], [[js.local-identity]], [[js.net-host]], [[js.net-transport]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]], [[js.stamp-layer]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
