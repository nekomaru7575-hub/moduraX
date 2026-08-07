---
source: server/index.js
lines: 1727
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-07
tags: [codemap]
---

# server/index.js

<!-- prose:summary -->
静的ファイル配信と WebSocket 同期を同一ポートで提供するサーバー本体。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面の HTML/JS/画像の配信、部屋の作成・削除・一覧の API、WebSocket による状態同期、参加者の認証、画像・音源のアップロード中継をすべて持つ。状態の解釈はクライアントと同じ [[js.game-store]] を import して行うため、遷移ロジックが二重にならない。永続化は部屋ごとの JSON ファイルと Upstash Redis、ファイル実体は [[server.r2]]。
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数・非export（50）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 59 | roomKey | `roomKey(roomId)` | 3 |
| 64 | readRoomState | `async readRoomState(roomId)` | 10 |
| 75 | writeRoomState | `async writeRoomState(roomId, state)` | 8 |
| 84 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |
| 106 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |
| 111 | equalsSecret | `equalsSecret(a, b)` | 6 |
| 122 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |
| 145 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |
| 162 | authMetaKey | `authMetaKey(roomId)` | 3 |
| 166 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |
| 170 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |
| 181 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |
| 190 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |
| 199 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |
| 227 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |
| 236 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |
| 247 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |
| 256 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |
| 267 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |
| 281 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |
| 361 | serveStaticFile | `async serveStaticFile(req, res)` | 22 |
| 384 | sendJson | `sendJson(res, statusCode, body)` | 5 |
| 390 | readJsonBody | `readJsonBody(req)` | 14 |
| 408 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |
| 439 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |
| 446 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |
| 451 | isValidRoomId | `isValidRoomId(id)` | 7 |
| 459 | roomFilePath | `roomFilePath(roomId)` | 3 |
| 468 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 79 |
| 548 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 14 |
| 563 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |
| 573 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |
| 579 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |
| 585 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |
| 601 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 28 |
| 645 | deleteRoomData | `async deleteRoomData(roomId)` | 29 |
| 678 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |
| 747 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 4 |
| 846 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |
| 875 | decodeDataUrl | `decodeDataUrl(dataUrl)` | 12 |
| 892 | adoptImage | `async adoptImage(roomId, image)` | 33 |
| 930 | adoptStateImages | `async adoptStateImages(roomId, state)` | 43 |
| 987 | handleImageUpload | `handleImageUpload(req, res)` | 20 |
| 1016 | handleImageCopy | `async handleImageCopy(req, res)` | 67 |
| 1085 | handleListRooms | `async handleListRooms(req, res)` | 15 |
| 1103 | handleCreateRoom | `async handleCreateRoom(req, res)` | 109 |
| 1216 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 56 |
| 1286 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 38 |
| 1326 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |
| 1342 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |

## 依存

- import → [[js.game-store]], [[js.state-import]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
export を持たない単一ファイルで 1600 行超。ルーティング・WebSocket・永続化が同居しているので、変更前に該当セクションを絞ってから読むこと。
<!-- /prose:notes -->
