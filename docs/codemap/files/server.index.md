---
source: server/index.js
lines: 3833
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-02
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

## トップレベル関数（LOCAL TASKS 候補）（107）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 112 | roomKey | `roomKey(roomId)` | 3 |  |
| 136 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 141 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 150 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 163 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 172 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 176 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 193 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 197 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 207 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 222 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 226 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 236 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 261 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 303 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 308 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 319 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 342 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 359 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 363 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 367 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 378 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 387 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 396 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 424 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 433 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 444 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 453 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 464 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 478 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 539 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 616 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 627 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 663 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 678 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 718 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 730 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 768 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 777 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 789 | generateRoomId | `generateRoomId()` | 3 |  |
| 806 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 814 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 822 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 827 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 842 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 873 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 882 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 891 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 114 |  |
| 1013 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1030 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1055 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1100 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1122 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1134 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1143 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1154 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1169 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1182 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1188 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1194 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1214 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1224 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1229 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1238 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1278 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1294 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1301 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1308 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1316 | bucketSpace | `bucketSpace()` | 8 |  |
| 1331 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1361 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1413 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1471 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1524 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1534 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1603 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1718 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1748 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1772 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1825 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1923 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1936 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1961 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1990 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2071 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2098 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2118 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2167 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2184 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2360 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2406 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2480 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2571 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2581 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 68 |  |
| 2651 | rememberUnavailable | `rememberUnavailable(cacheKey, cached, now, reason)` | 4 |  |
| 2657 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2673 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2707 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2730 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2806 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2816 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2834 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2851 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2879 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2894 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2903 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3774 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
