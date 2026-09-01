---
source: server/index.js
lines: 3816
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-01
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

## トップレベル関数（LOCAL TASKS 候補）（106）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 111 | roomKey | `roomKey(roomId)` | 3 |  |
| 135 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 140 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 149 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 162 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 171 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 175 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 192 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 196 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 206 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 221 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 225 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 235 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 260 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 302 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 307 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 318 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 341 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 358 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 362 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 366 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 377 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 386 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 395 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 423 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 432 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 443 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 452 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 463 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 477 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 535 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 612 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 623 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 659 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 674 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 714 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 726 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 764 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 773 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 785 | generateRoomId | `generateRoomId()` | 3 |  |
| 802 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 810 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 818 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 823 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 838 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 869 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 878 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 887 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 114 |  |
| 1009 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1026 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1051 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message)` | 24 |  |
| 1084 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1106 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1118 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1127 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1138 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1153 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1166 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1172 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1178 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1198 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1208 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1213 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1222 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1262 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1278 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1285 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1292 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1300 | bucketSpace | `bucketSpace()` | 8 |  |
| 1315 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1345 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1397 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1455 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1508 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1518 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1587 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1702 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1732 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1756 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1809 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1907 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1920 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1945 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1974 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2055 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2082 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2102 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2151 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2168 | handleCreateRoom | `async handleCreateRoom(req, res)` | 160 |  |
| 2360 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2406 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2480 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2572 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2582 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2640 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2656 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2690 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2713 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2789 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2799 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2817 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2834 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2862 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2877 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2886 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3757 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
