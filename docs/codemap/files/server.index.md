---
source: server/index.js
lines: 1688
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
| 54 | roomKey | `roomKey(roomId)` | 3 |
| 59 | readRoomState | `async readRoomState(roomId)` | 10 |
| 70 | writeRoomState | `async writeRoomState(roomId, state)` | 8 |
| 79 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |
| 101 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |
| 106 | equalsSecret | `equalsSecret(a, b)` | 6 |
| 117 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |
| 140 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |
| 157 | authMetaKey | `authMetaKey(roomId)` | 3 |
| 161 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |
| 165 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |
| 176 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |
| 185 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |
| 194 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |
| 222 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |
| 231 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |
| 242 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |
| 251 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |
| 262 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |
| 276 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |
| 350 | serveStaticFile | `async serveStaticFile(req, res)` | 22 |
| 373 | sendJson | `sendJson(res, statusCode, body)` | 5 |
| 379 | readJsonBody | `readJsonBody(req)` | 14 |
| 397 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |
| 428 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |
| 435 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |
| 440 | isValidRoomId | `isValidRoomId(id)` | 7 |
| 448 | roomFilePath | `roomFilePath(roomId)` | 3 |
| 457 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 79 |
| 537 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 14 |
| 552 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |
| 562 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |
| 568 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |
| 574 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |
| 590 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 28 |
| 634 | deleteRoomData | `async deleteRoomData(roomId)` | 29 |
| 667 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |
| 736 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 4 |
| 835 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |
| 864 | decodeDataUrl | `decodeDataUrl(dataUrl)` | 12 |
| 881 | adoptImage | `async adoptImage(roomId, image)` | 33 |
| 919 | adoptStateImages | `async adoptStateImages(roomId, state)` | 43 |
| 976 | handleImageUpload | `handleImageUpload(req, res)` | 20 |
| 1005 | handleImageCopy | `async handleImageCopy(req, res)` | 67 |
| 1074 | handleListRooms | `async handleListRooms(req, res)` | 15 |
| 1092 | handleCreateRoom | `async handleCreateRoom(req, res)` | 109 |
| 1205 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 56 |
| 1275 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 38 |
| 1315 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |
| 1331 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |

## 依存

- import → [[js.game-store]], [[js.state-import]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
export を持たない単一ファイルで 1600 行超。ルーティング・WebSocket・永続化が同居しているので、変更前に該当セクションを絞ってから読むこと。
<!-- /prose:notes -->
