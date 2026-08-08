---
source: js/net-sync.js
lines: 320
exports: 8
imported_by: 2
api_sha: b83b1bba1907
prose_sha: b83b1bba1907
generated: 2026-08-08
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

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | fn | isDeveloperIdentity | `isDeveloperIdentity()` |  |
| 225 | fn | initNetSync | `initNetSync()` |  |
| 255 | fn | sendIdentify | `sendIdentify(participantId, authToken, name)` | この接続での名乗りをサーバーへ伝える。 |
| 268 | fn | requestChatSendSound | `requestChatSendSound()` | 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。 |
| 277 | fn | requestRoomDeletion | `requestRoomDeletion()` | 部屋の削除をサーバーへ要求する。 |
| 285 | fn | sendTypingStart | `sendTypingStart()` | メイン入力欄が空→非空になった瞬間に呼ぶ。 |
| 292 | fn | sendTypingStop | `sendTypingStop()` | メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。 |
| 301 | fn | replaceState | `replaceState(newState)` | ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと 置き換える。 |

## トップレベル関数（LOCAL TASKS 候補）（12）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 46 | isDeveloperIdentity | `isDeveloperIdentity()` | 3 | ✓ |
| 52 | askEntryPassword | `askEntryPassword({ error })` | 10 |  |
| 65 | sendJoin | `sendJoin()` | 10 |  |
| 80 | flushIdentify | `flushIdentify()` | 5 |  |
| 86 | connect | `connect()` | 138 |  |
| 225 | initNetSync | `initNetSync()` | 23 | ✓ |
| 255 | sendIdentify | `sendIdentify(participantId, authToken, name)` | 8 | ✓ |
| 268 | requestChatSendSound | `requestChatSendSound()` | 5 | ✓ |
| 277 | requestRoomDeletion | `requestRoomDeletion()` | 5 | ✓ |
| 285 | sendTypingStart | `sendTypingStart()` | 5 | ✓ |
| 292 | sendTypingStop | `sendTypingStop()` | 5 | ✓ |
| 301 | replaceState | `replaceState(newState)` | 19 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.audio-player]], [[js.game-store]], [[js.local-identity]], [[js.room-entry-dialog]], [[js.room-entry]], [[js.state-import]]
- imported by → [[js.main]], [[js.room-authority]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
