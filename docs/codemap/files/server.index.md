---
source: server/index.js
lines: 3034
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-19
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

## トップレベル関数（LOCAL TASKS 候補）（89）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 92 | roomKey | `roomKey(roomId)` | 3 |  |
| 113 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 118 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 127 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 140 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 149 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 153 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 166 | roomSummaryKey | `roomSummaryKey(roomId)` | 3 |  |
| 170 | roomSummaryFilePath | `roomSummaryFilePath(roomId)` | 3 |  |
| 174 | roomSummaryOf | `roomSummaryOf(entry)` | 5 |  |
| 180 | readRoomSummary | `async readRoomSummary(roomId)` | 10 |  |
| 191 | writeRoomSummary | `async writeRoomSummary(roomId, summary)` | 8 |  |
| 200 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 6 |  |
| 209 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 238 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 243 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 254 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 277 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 294 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 298 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 302 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 313 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 322 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 331 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 359 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 368 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 379 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 388 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 399 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 413 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |  |
| 522 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 593 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 604 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 640 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 655 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 695 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 707 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 739 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 746 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 751 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 759 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 768 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 93 |  |
| 869 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 886 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 15 |  |
| 910 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 932 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 944 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 953 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 964 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 979 | allowStamp | `allowStamp(ws)` | 11 |  |
| 992 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 998 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1004 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1024 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1034 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1039 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1048 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1077 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 29 |  |
| 1122 | deleteRoomData | `async deleteRoomData(roomId)` | 38 |  |
| 1164 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1233 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 105 |  |
| 1340 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1370 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1394 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 42 |  |
| 1446 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1544 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1557 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1582 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1611 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1683 | handleListRooms | `async handleListRooms(req, res)` | 7 |  |
| 1696 | summarizeRoomSlot | `async summarizeRoomSlot(id)` | 18 |  |
| 1717 | handleCreateRoom | `async handleCreateRoom(req, res)` | 121 |  |
| 1870 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 1916 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 1990 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2069 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2079 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 54 |  |
| 2135 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2151 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2185 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2208 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 45 |  |
| 2279 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2289 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2307 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2324 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2352 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2367 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2376 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 2996 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
