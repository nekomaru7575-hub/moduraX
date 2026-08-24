---
source: server/index.js
lines: 3576
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-24
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

## トップレベル関数（LOCAL TASKS 候補）（105）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 104 | roomKey | `roomKey(roomId)` | 3 |  |
| 125 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 130 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 139 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 152 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 161 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 165 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 182 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 186 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 196 | roomSummaryOf | `roomSummaryOf(entry)` | 9 |  |
| 207 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 211 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 221 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 246 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 288 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 293 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 304 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 327 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 344 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 348 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 352 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 363 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 372 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 381 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 409 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 418 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 429 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 438 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 449 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 463 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 511 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 582 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 593 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 629 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 644 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 684 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 696 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 734 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 743 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 755 | generateRoomId | `generateRoomId()` | 3 |  |
| 772 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 780 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 788 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 793 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 808 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 839 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 848 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 857 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 108 |  |
| 973 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 990 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1018 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1040 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1052 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1061 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1072 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1087 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1100 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1106 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1112 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1132 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1142 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1147 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1156 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1196 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1212 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1219 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1226 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1234 | bucketSpace | `bucketSpace()` | 8 |  |
| 1249 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1279 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1331 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1389 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1442 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1452 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1521 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1636 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1666 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1690 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1743 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1841 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1854 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1879 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1908 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1989 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2016 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2036 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2085 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2102 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2278 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2324 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2398 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2489 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2499 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2557 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2573 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2607 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2630 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2706 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2716 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2734 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2751 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2779 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2794 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2803 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3517 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
