---
source: js/local-identity.js
lines: 162
exports: 15
imported_by: 11
api_sha: d8594b0ef669
prose_sha: d8594b0ef669
generated: 2026-08-11
tags: [codemap]
---

# js/local-identity.js

<!-- prose:summary -->
このブラウザ（デバイス）を指すための、自己申告不要の匿名ローカルID。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
このブラウザを指す匿名 ID と、部屋ごとの参加者 ID・認証トークンを localStorage で管理する。サインアップの無いこのアプリで「誰か」を表す唯一の根拠なので、10 ファイルが依存する。参加者 ID は部屋名とローカル ID から導出される。
<!-- /prose:role -->

## export（15）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | getLocalUserId | `getLocalUserId()` |  |
| 35 | fn | getNickname | `getNickname()` |  |
| 39 | fn | setNickname | `setNickname(name)` |  |
| 76 | fn | normalizeRoomName | `normalizeRoomName(name)` | 名前は種でもあるので、全角・半角などの表記ゆれで別人になってしまう。 |
| 81 | fn | getStoredRoomName | `getStoredRoomName(roomId)` | 未設定（一度も聞いていない）ならnull、「名前なしで参加」を選んだ場合は空文字を返す。 |
| 85 | fn | setStoredRoomName | `setStoredRoomName(roomId, name)` |  |
| 91 | fn | getStoredDevPassphrase | `getStoredDevPassphrase(roomId)` |  |
| 95 | fn | setStoredDevPassphrase | `setStoredDevPassphrase(roomId, passphrase)` |  |
| 103 | fn | isRoomIdentityAvailable | `isRoomIdentityAvailable()` | 導出にはWeb Crypto（SHA-256）を使う。 |
| 117 | const | PARTICIPANT_ID_LENGTH | `PARTICIPANT_ID_LENGTH` | 公開IDをauthTokenから導出する規則。 |
| 119 | fn | deriveParticipantId | `async deriveParticipantId(authToken)` |  |
| 130 | fn | deriveRoomIdentity | `async deriveRoomIdentity(roomId, seed)` | 種（通常は表示名、開発用の合言葉を入れているときはそちら）から、その部屋での 参加者IDと名乗り用トークンを導出する。 |
| 148 | fn | activateRoomIdentity | `async activateRoomIdentity(roomId, seed)` | 種から識別情報を導出して、この画面の「自分」として設定する。 |
| 153 | fn | getCurrentParticipantId | `getCurrentParticipantId()` |  |
| 159 | fn | getCurrentAuthToken | `getCurrentAuthToken()` | サーバーが「この公開IDを名乗ってよいか」を検証するための値。 |

## トップレベル関数（LOCAL TASKS 候補）（18）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 9 | generateId | `generateId()` | 6 |  |
| 18 | getLocalUserId | `getLocalUserId()` | 12 | ✓ |
| 35 | getNickname | `getNickname()` | 3 | ✓ |
| 39 | setNickname | `setNickname(name)` | 3 | ✓ |
| 66 | roomNameKey | `roomNameKey(roomId)` | 3 |  |
| 70 | devPassphraseKey | `devPassphraseKey(roomId)` | 3 |  |
| 76 | normalizeRoomName | `normalizeRoomName(name)` | 3 | ✓ |
| 81 | getStoredRoomName | `getStoredRoomName(roomId)` | 3 | ✓ |
| 85 | setStoredRoomName | `setStoredRoomName(roomId, name)` | 5 | ✓ |
| 91 | getStoredDevPassphrase | `getStoredDevPassphrase(roomId)` | 3 | ✓ |
| 95 | setStoredDevPassphrase | `setStoredDevPassphrase(roomId, passphrase)` | 4 | ✓ |
| 103 | isRoomIdentityAvailable | `isRoomIdentityAvailable()` | 3 | ✓ |
| 107 | sha256Hex | `async sha256Hex(text)` | 6 |  |
| 119 | deriveParticipantId | `async deriveParticipantId(authToken)` | 3 | ✓ |
| 130 | deriveRoomIdentity | `async deriveRoomIdentity(roomId, seed)` | 9 | ✓ |
| 148 | activateRoomIdentity | `async activateRoomIdentity(roomId, seed)` | 4 | ✓ |
| 153 | getCurrentParticipantId | `getCurrentParticipantId()` | 3 | ✓ |
| 159 | getCurrentAuthToken | `getCurrentAuthToken()` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.audio-dialog]], [[js.board-data-driven]], [[js.character-dialog]], [[js.character-panel]], [[js.identity-dialog]], [[js.image-upload]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
