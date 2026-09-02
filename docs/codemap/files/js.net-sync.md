---
source: js/net-sync.js
lines: 703
exports: 9
imported_by: 3
api_sha: 4fc499cfc0b5
prose_sha: 4fc499cfc0b5
generated: 2026-09-02
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
| 73 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 340 | fn | initNetSync | `initNetSync()` |  |
| 599 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 622 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 633 | fn | sendStamp | `sendStamp(stampId)` | スタンプを送る。 |
| 647 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除を要求する。 |
| 657 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 666 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 677 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（26）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 73 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 83 | askEntryPassword | `askEntryPassword({ error, submit })` | 10 |  |
| 96 | sendJoin | `sendJoin(submit)` | 8 |  |
| 106 | submitJoinOverTransport | `submitJoinOverTransport(password)` | 3 |  |
| 114 | flushIdentify | `flushIdentify()` | 4 |  |
| 119 | connect | `connect()` | 9 |  |
| 129 | handleOpen | `handleOpen()` | 6 |  |
| 138 | handleMessage | `handleMessage(message)` | 103 |  |
| 243 | handleClose | `handleClose({ code })` | 53 |  |
| 299 | generateChatEntryId | `generateChatEntryId()` | 4 |  |
| 315 | withStampedChatEntry | `withStampedChatEntry(action, payload)` | 12 |  |
| 335 | stampPayload | `stampPayload(action, payload)` | 4 |  |
| 340 | initNetSync | `initNetSync()` | 16 | ✓ |
| 364 | startP2pSession | `async startP2pSession()` | 70 |  |
| 441 | initAsHost | `initAsHost(session, seedState)` | 59 |  |
| 508 | adoptLocalMedia | `async adoptLocalMedia()` | 12 |  |
| 522 | initAsP2pGuest | `initAsP2pGuest(session)` | 23 |  |
| 550 | handleP2pClose | `handleP2pClose({ code })` | 29 |  |
| 582 | handleP2pFailure | `handleP2pFailure(reason)` | 5 |  |
| 599 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 11 | ✓ |
| 622 | requestChatSendSound | `requestChatSendSound()` | 7 | ✓ |
| 633 | sendStamp | `sendStamp(stampId)` | 7 | ✓ |
| 647 | requestRoomDeletion | `requestRoomDeletion()` | 7 | ✓ |
| 657 | sendTypingStart | `sendTypingStart()` | 7 | ✓ |
| 666 | sendTypingStop | `sendTypingStop()` | 7 | ✓ |
| 677 | replaceState | `replaceState(newState)` | 26 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.asset-store]], [[js.asset-sync]], [[js.audio-player]], [[js.game-store]], [[js.host-persistence]], [[js.local-identity]], [[js.net-host]], [[js.net-signaling]], [[js.net-transport-rtc]], [[js.net-transport]], [[js.p2p-import-handoff]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]], [[js.stamp-layer]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
