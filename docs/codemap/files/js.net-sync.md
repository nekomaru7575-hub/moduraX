---
source: js/net-sync.js
lines: 809
exports: 9
imported_by: 3
api_sha: 4fc499cfc0b5
prose_sha: 4fc499cfc0b5
generated: 2026-09-09
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
| 86 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 353 | fn | initNetSync | `initNetSync()` |  |
| 698 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 728 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 739 | fn | sendStamp | `sendStamp(stampId)` | スタンプを送る。 |
| 753 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除を要求する。 |
| 763 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 772 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 783 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（28）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 86 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 96 | askEntryPassword | `askEntryPassword({ error, submit })` | 10 |  |
| 109 | sendJoin | `sendJoin(submit)` | 8 |  |
| 119 | submitJoinOverTransport | `submitJoinOverTransport(password)` | 3 |  |
| 127 | flushIdentify | `flushIdentify()` | 4 |  |
| 132 | connect | `connect()` | 9 |  |
| 142 | handleOpen | `handleOpen()` | 6 |  |
| 151 | handleMessage | `handleMessage(message)` | 103 |  |
| 256 | handleClose | `handleClose({ code })` | 53 |  |
| 312 | generateChatEntryId | `generateChatEntryId()` | 4 |  |
| 328 | withStampedChatEntry | `withStampedChatEntry(action, payload)` | 12 |  |
| 348 | stampPayload | `stampPayload(action, payload)` | 4 |  |
| 353 | initNetSync | `initNetSync()` | 16 | ✓ |
| 377 | startP2pSession | `async startP2pSession()` | 72 |  |
| 462 | handleSignalingClose | `handleSignalingClose()` | 11 |  |
| 479 | reconnectHostSignaling | `async reconnectHostSignaling()` | 52 |  |
| 538 | initAsHost | `initAsHost(session, seedState)` | 61 |  |
| 607 | adoptLocalMedia | `async adoptLocalMedia()` | 12 |  |
| 621 | initAsP2pGuest | `initAsP2pGuest(session)` | 23 |  |
| 649 | handleP2pClose | `handleP2pClose({ code })` | 29 |  |
| 681 | handleP2pFailure | `handleP2pFailure(reason)` | 5 |  |
| 698 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 18 | ✓ |
| 728 | requestChatSendSound | `requestChatSendSound()` | 7 | ✓ |
| 739 | sendStamp | `sendStamp(stampId)` | 7 | ✓ |
| 753 | requestRoomDeletion | `requestRoomDeletion()` | 7 | ✓ |
| 763 | sendTypingStart | `sendTypingStart()` | 7 | ✓ |
| 772 | sendTypingStop | `sendTypingStop()` | 7 | ✓ |
| 783 | replaceState | `replaceState(newState)` | 26 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.asset-store]], [[js.asset-sync]], [[js.audio-player]], [[js.game-store]], [[js.host-persistence]], [[js.local-identity]], [[js.net-host]], [[js.net-signaling]], [[js.net-transport-rtc]], [[js.net-transport]], [[js.p2p-import-handoff]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]], [[js.stamp-layer]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
