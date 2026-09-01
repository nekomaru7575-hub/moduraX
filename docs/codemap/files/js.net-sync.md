---
source: js/net-sync.js
lines: 636
exports: 9
imported_by: 3
api_sha: 4fc499cfc0b5
prose_sha: 4fc499cfc0b5
generated: 2026-09-01
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
| 66 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 322 | fn | initNetSync | `initNetSync()` |  |
| 533 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 556 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 567 | fn | sendStamp | `sendStamp(stampId)` | スタンプを送る。 |
| 581 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除を要求する。 |
| 591 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 600 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 611 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（25）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 66 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 76 | askEntryPassword | `askEntryPassword({ error, submit })` | 10 |  |
| 89 | sendJoin | `sendJoin(submit)` | 8 |  |
| 99 | submitJoinOverTransport | `submitJoinOverTransport(password)` | 3 |  |
| 107 | flushIdentify | `flushIdentify()` | 4 |  |
| 112 | connect | `connect()` | 9 |  |
| 122 | handleOpen | `handleOpen()` | 6 |  |
| 131 | handleMessage | `handleMessage(message)` | 92 |  |
| 225 | handleClose | `handleClose({ code })` | 53 |  |
| 281 | generateChatEntryId | `generateChatEntryId()` | 4 |  |
| 297 | withStampedChatEntry | `withStampedChatEntry(action, payload)` | 12 |  |
| 317 | stampPayload | `stampPayload(action, payload)` | 4 |  |
| 322 | initNetSync | `initNetSync()` | 16 | ✓ |
| 346 | startP2pSession | `async startP2pSession()` | 70 |  |
| 423 | initAsHost | `initAsHost(session, seedState)` | 33 |  |
| 458 | initAsP2pGuest | `initAsP2pGuest(session)` | 21 |  |
| 484 | handleP2pClose | `handleP2pClose({ code })` | 29 |  |
| 516 | handleP2pFailure | `handleP2pFailure(reason)` | 5 |  |
| 533 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 11 | ✓ |
| 556 | requestChatSendSound | `requestChatSendSound()` | 7 | ✓ |
| 567 | sendStamp | `sendStamp(stampId)` | 7 | ✓ |
| 581 | requestRoomDeletion | `requestRoomDeletion()` | 7 | ✓ |
| 591 | sendTypingStart | `sendTypingStart()` | 7 | ✓ |
| 600 | sendTypingStop | `sendTypingStop()` | 7 | ✓ |
| 611 | replaceState | `replaceState(newState)` | 25 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.audio-player]], [[js.game-store]], [[js.local-identity]], [[js.net-host]], [[js.net-signaling]], [[js.net-transport-rtc]], [[js.net-transport]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]], [[js.stamp-layer]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
