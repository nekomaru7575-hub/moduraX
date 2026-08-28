---
source: server/index.js
lines: 3600
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-28
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
| 521 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 598 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 609 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 645 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 660 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 700 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 712 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 750 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 759 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 771 | generateRoomId | `generateRoomId()` | 3 |  |
| 788 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 796 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 804 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 809 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 824 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 855 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 864 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 873 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 108 |  |
| 989 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1006 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1034 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1056 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1068 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1077 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1088 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1103 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1116 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1122 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1128 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1148 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1158 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1163 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1172 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1212 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1228 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1235 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1242 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1250 | bucketSpace | `bucketSpace()` | 8 |  |
| 1265 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1295 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1347 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1405 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1458 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1468 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1537 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1652 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1682 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1706 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1759 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1857 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1870 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1895 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1924 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2005 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2032 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2052 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2101 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2118 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2294 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2340 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2414 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2506 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2516 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2574 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2590 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2624 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2647 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2723 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2733 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2751 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2768 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2796 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2811 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2820 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3541 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
