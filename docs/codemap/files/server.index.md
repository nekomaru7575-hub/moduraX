---
source: server/index.js
lines: 1745
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-08
tags: [codemap]
---

# server/index.js

<!-- prose:summary -->
盤面のHTML/JS/画像などの静的ファイル配信と、リアルタイム同期用のWebSocketを 同じNodeサーバー・同じポートで提供する。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数（LOCAL TASKS 候補）（50）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 62 | roomKey | `roomKey(roomId)` | 3 |  |
| 67 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 78 | writeRoomState | `async writeRoomState(roomId, state)` | 8 |  |
| 87 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 109 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 114 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 125 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 148 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 165 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 169 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 173 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 184 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 193 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 202 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 230 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 239 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 250 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 259 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 270 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 284 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |  |
| 364 | serveStaticFile | `async serveStaticFile(req, res)` | 22 |  |
| 387 | sendJson | `sendJson(res, statusCode, body)` | 5 |  |
| 393 | readJsonBody | `readJsonBody(req)` | 14 |  |
| 411 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 442 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 449 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 454 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 462 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 471 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 79 |  |
| 551 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 14 |  |
| 566 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 576 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 582 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 588 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 604 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 28 |  |
| 648 | deleteRoomData | `async deleteRoomData(roomId)` | 29 |  |
| 681 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 750 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 97 |  |
| 849 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 878 | decodeDataUrl | `decodeDataUrl(dataUrl)` | 12 |  |
| 895 | adoptImage | `async adoptImage(roomId, image)` | 33 |  |
| 933 | adoptStateImages | `async adoptStateImages(roomId, state)` | 43 |  |
| 990 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1019 | handleImageCopy | `async handleImageCopy(req, res)` | 67 |  |
| 1088 | handleListRooms | `async handleListRooms(req, res)` | 15 |  |
| 1106 | handleCreateRoom | `async handleCreateRoom(req, res)` | 109 |  |
| 1219 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 56 |  |
| 1289 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 38 |  |
| 1329 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 1345 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |

## 依存

- import → [[js.game-store]], [[js.state-import]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
