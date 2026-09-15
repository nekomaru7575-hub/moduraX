---
source: server/index.js
lines: 4095
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-15
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

## トップレベル関数（LOCAL TASKS 候補）（111）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 116 | roomKey | `roomKey(roomId)` | 3 |  |
| 140 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 145 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 154 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 167 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 176 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 180 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 197 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 201 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 211 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 226 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 230 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 240 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 265 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 307 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 312 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 323 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 346 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 363 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 367 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 371 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 382 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 391 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 400 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 428 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 437 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 448 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 457 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 468 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 482 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 546 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 626 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 637 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 673 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 688 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 728 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 740 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 778 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 787 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 799 | generateRoomId | `generateRoomId()` | 3 |  |
| 816 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 824 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 832 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 837 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 852 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 883 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 892 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 901 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 117 |  |
| 1026 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1065 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 32 |  |
| 1122 | pinHostParticipant | `async pinHostParticipant(roomId, entry, participantId)` | 9 |  |
| 1137 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1182 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 24 |  |
| 1208 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1220 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1229 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1240 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1255 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1268 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1275 | pickRemovedMediaKey | `pickRemovedMediaKey(state, message)` | 11 |  |
| 1289 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1295 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1315 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1325 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1330 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1339 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1379 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1395 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1402 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1409 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1417 | bucketSpace | `bucketSpace()` | 8 |  |
| 1432 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1462 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1514 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1572 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1625 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1635 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1704 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1819 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1849 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1873 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1926 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 120 |  |
| 2048 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 2061 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 2091 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 2120 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2201 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2228 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2248 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2297 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2314 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2492 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 36 |  |
| 2541 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2615 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2729 | bcdiceIsBlocked | `bcdiceIsBlocked(origin, now)` | 3 |  |
| 2733 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2743 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 106 |  |
| 2851 | rememberUnavailable | `rememberUnavailable(cacheKey, cached, now, reason)` | 4 |  |
| 2857 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2873 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2907 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2933 | fetchSheetSecret | `async fetchSheetSecret(source, key, signal)` | 23 |  |
| 2958 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 58 |  |
| 3043 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 3053 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 3071 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 3088 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 3116 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 3131 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 3140 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 4036 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.store.images]], [[js.store.stamps]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
