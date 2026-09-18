---
source: js/net-sync.js
lines: 1032
exports: 9
imported_by: 3
api_sha: 4fc499cfc0b5
prose_sha: 4fc499cfc0b5
generated: 2026-09-18
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
| 170 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 575 | fn | initNetSync | `initNetSync()` |  |
| 921 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 951 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 962 | fn | sendStamp | `sendStamp(stampId)` | スタンプを送る。 |
| 976 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除を要求する。 |
| 986 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 995 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 1006 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（34）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 170 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 180 | askEntryPassword | `askEntryPassword({ error, submit })` | 10 |  |
| 193 | sendJoin | `sendJoin(submit)` | 8 |  |
| 203 | submitJoinOverTransport | `submitJoinOverTransport(password)` | 3 |  |
| 219 | reconnectDelay | `reconnectDelay(attempts, maxDelayMs)` | 4 |  |
| 227 | startKeepalive | `startKeepalive()` | 21 |  |
| 249 | stopKeepalive | `stopKeepalive()` | 5 |  |
| 256 | scheduleReconnect | `scheduleReconnect()` | 18 |  |
| 277 | suspend | `suspend()` | 20 |  |
| 298 | resumeFromSuspend | `resumeFromSuspend()` | 9 |  |
| 312 | flushIdentify | `flushIdentify()` | 6 |  |
| 319 | connect | `connect()` | 22 |  |
| 342 | handleOpen | `handleOpen()` | 11 |  |
| 356 | handleMessage | `handleMessage(message)` | 110 |  |
| 468 | handleClose | `handleClose({ code })` | 63 |  |
| 534 | generateChatEntryId | `generateChatEntryId()` | 4 |  |
| 550 | withStampedChatEntry | `withStampedChatEntry(action, payload)` | 12 |  |
| 570 | stampPayload | `stampPayload(action, payload)` | 4 |  |
| 575 | initNetSync | `initNetSync()` | 17 | ✓ |
| 600 | startP2pSession | `async startP2pSession()` | 72 |  |
| 685 | handleSignalingClose | `handleSignalingClose()` | 11 |  |
| 702 | reconnectHostSignaling | `async reconnectHostSignaling()` | 52 |  |
| 761 | initAsHost | `initAsHost(session, seedState)` | 61 |  |
| 830 | adoptLocalMedia | `async adoptLocalMedia()` | 12 |  |
| 844 | initAsP2pGuest | `initAsP2pGuest(session)` | 23 |  |
| 872 | handleP2pClose | `handleP2pClose({ code })` | 29 |  |
| 904 | handleP2pFailure | `handleP2pFailure(reason)` | 5 |  |
| 921 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 18 | ✓ |
| 951 | requestChatSendSound | `requestChatSendSound()` | 7 | ✓ |
| 962 | sendStamp | `sendStamp(stampId)` | 7 | ✓ |
| 976 | requestRoomDeletion | `requestRoomDeletion()` | 7 | ✓ |
| 986 | sendTypingStart | `sendTypingStart()` | 7 | ✓ |
| 995 | sendTypingStop | `sendTypingStop()` | 7 | ✓ |
| 1006 | replaceState | `replaceState(newState)` | 26 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.asset-store]], [[js.asset-sync]], [[js.audio-player]], [[js.game-store]], [[js.host-persistence]], [[js.local-identity]], [[js.net-host]], [[js.net-signaling]], [[js.net-transport-rtc]], [[js.net-transport]], [[js.p2p-import-handoff]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]], [[js.stamp-layer]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
