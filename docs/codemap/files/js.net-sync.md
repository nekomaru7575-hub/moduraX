---
source: js/net-sync.js
lines: 684
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
| 72 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 339 | fn | initNetSync | `initNetSync()` |  |
| 581 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 604 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 615 | fn | sendStamp | `sendStamp(stampId)` | スタンプを送る。 |
| 629 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除を要求する。 |
| 639 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 648 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 659 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（26）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 72 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 82 | askEntryPassword | `askEntryPassword({ error, submit })` | 10 |  |
| 95 | sendJoin | `sendJoin(submit)` | 8 |  |
| 105 | submitJoinOverTransport | `submitJoinOverTransport(password)` | 3 |  |
| 113 | flushIdentify | `flushIdentify()` | 4 |  |
| 118 | connect | `connect()` | 9 |  |
| 128 | handleOpen | `handleOpen()` | 6 |  |
| 137 | handleMessage | `handleMessage(message)` | 103 |  |
| 242 | handleClose | `handleClose({ code })` | 53 |  |
| 298 | generateChatEntryId | `generateChatEntryId()` | 4 |  |
| 314 | withStampedChatEntry | `withStampedChatEntry(action, payload)` | 12 |  |
| 334 | stampPayload | `stampPayload(action, payload)` | 4 |  |
| 339 | initNetSync | `initNetSync()` | 16 | ✓ |
| 363 | startP2pSession | `async startP2pSession()` | 70 |  |
| 440 | initAsHost | `initAsHost(session, seedState)` | 47 |  |
| 490 | adoptSeedMedia | `async adoptSeedMedia()` | 12 |  |
| 504 | initAsP2pGuest | `initAsP2pGuest(session)` | 23 |  |
| 532 | handleP2pClose | `handleP2pClose({ code })` | 29 |  |
| 564 | handleP2pFailure | `handleP2pFailure(reason)` | 5 |  |
| 581 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 11 | ✓ |
| 604 | requestChatSendSound | `requestChatSendSound()` | 7 | ✓ |
| 615 | sendStamp | `sendStamp(stampId)` | 7 | ✓ |
| 629 | requestRoomDeletion | `requestRoomDeletion()` | 7 | ✓ |
| 639 | sendTypingStart | `sendTypingStart()` | 7 | ✓ |
| 648 | sendTypingStop | `sendTypingStop()` | 7 | ✓ |
| 659 | replaceState | `replaceState(newState)` | 25 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.asset-store]], [[js.asset-sync]], [[js.audio-player]], [[js.game-store]], [[js.host-persistence]], [[js.local-identity]], [[js.net-host]], [[js.net-signaling]], [[js.net-transport-rtc]], [[js.net-transport]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]], [[js.stamp-layer]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
