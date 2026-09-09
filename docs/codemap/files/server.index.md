---
source: server/index.js
lines: 4047
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-09
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

## トップレベル関数（LOCAL TASKS 候補）（110）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 115 | roomKey | `roomKey(roomId)` | 3 |  |
| 139 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 144 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 153 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 166 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 175 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 179 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 196 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 200 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 210 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 225 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 229 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 239 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 264 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 306 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 311 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 322 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 345 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 362 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 366 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 370 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 381 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 390 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 399 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 427 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 436 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 447 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 456 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 467 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 481 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 545 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 625 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 636 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 672 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 687 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 727 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 739 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 777 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 786 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 798 | generateRoomId | `generateRoomId()` | 3 |  |
| 815 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 823 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 831 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 836 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 851 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 882 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 891 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 900 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 117 |  |
| 1025 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1064 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 32 |  |
| 1121 | pinHostParticipant | `async pinHostParticipant(roomId, entry, participantId)` | 9 |  |
| 1136 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1181 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 24 |  |
| 1207 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1219 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1228 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1239 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1254 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1267 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1274 | pickRemovedMediaKey | `pickRemovedMediaKey(state, message)` | 11 |  |
| 1288 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1294 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1314 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1324 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1329 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1338 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1378 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1394 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1401 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1408 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1416 | bucketSpace | `bucketSpace()` | 8 |  |
| 1431 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1461 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1513 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1571 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1624 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1634 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1703 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1818 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1848 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1872 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1925 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 110 |  |
| 2037 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 2050 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 2080 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 2109 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2190 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2217 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2237 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2286 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2303 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2481 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 36 |  |
| 2530 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2604 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2718 | bcdiceIsBlocked | `bcdiceIsBlocked(origin, now)` | 3 |  |
| 2722 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2732 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 106 |  |
| 2840 | rememberUnavailable | `rememberUnavailable(cacheKey, cached, now, reason)` | 4 |  |
| 2846 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2862 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2896 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2919 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2995 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 3005 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 3023 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 3040 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 3068 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 3083 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 3092 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3988 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.store.stamps]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
