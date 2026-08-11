---
source: server/index.js
lines: 2735
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-11
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

## トップレベル関数（LOCAL TASKS 候補）（83）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 83 | roomKey | `roomKey(roomId)` | 3 |  |
| 104 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 109 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 118 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 131 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 140 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 144 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 157 | roomSummaryKey | `roomSummaryKey(roomId)` | 3 |  |
| 161 | roomSummaryFilePath | `roomSummaryFilePath(roomId)` | 3 |  |
| 165 | roomSummaryOf | `roomSummaryOf(entry)` | 5 |  |
| 171 | readRoomSummary | `async readRoomSummary(roomId)` | 10 |  |
| 182 | writeRoomSummary | `async writeRoomSummary(roomId, summary)` | 8 |  |
| 191 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 6 |  |
| 200 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 229 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 234 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 245 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 268 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 285 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 289 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 293 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 304 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 313 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 322 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 350 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 359 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 370 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 379 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 390 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 404 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |  |
| 498 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 551 | serveStaticFile | `async serveStaticFile(req, res)` | 31 |  |
| 583 | sendJson | `sendJson(res, statusCode, body)` | 5 |  |
| 594 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 634 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 646 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 678 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 685 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 690 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 698 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 707 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 93 |  |
| 808 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 825 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 15 |  |
| 849 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 871 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 883 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 892 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 903 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 908 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 914 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 920 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 940 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 950 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 955 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 964 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 993 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 29 |  |
| 1038 | deleteRoomData | `async deleteRoomData(roomId)` | 38 |  |
| 1080 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1149 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 105 |  |
| 1256 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1286 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1310 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 42 |  |
| 1362 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1460 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1471 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1494 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1523 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1595 | handleListRooms | `async handleListRooms(req, res)` | 7 |  |
| 1608 | summarizeRoomSlot | `async summarizeRoomSlot(id)` | 18 |  |
| 1629 | handleCreateRoom | `async handleCreateRoom(req, res)` | 121 |  |
| 1776 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 29 |  |
| 1816 | embedStateImages | `async embedStateImages(roomId, state)` | 70 |  |
| 1890 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 1969 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 1979 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 54 |  |
| 2035 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2051 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2094 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2104 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2122 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2139 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2167 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2700 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.state-import]], [[js.untrusted-json]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
