---
source: server/index.js
lines: 4106
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-18
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

## トップレベル関数（LOCAL TASKS 候補）（109）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 129 | roomKey | `roomKey(roomId)` | 3 |  |
| 153 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 158 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 167 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 180 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 189 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 193 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 215 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 230 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 234 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 3 |  |
| 240 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 269 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 274 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 285 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 308 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 327 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 331 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 335 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 346 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 355 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 364 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 392 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 401 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 412 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 421 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 434 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 498 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 578 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 589 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 625 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 640 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 680 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 692 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 730 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 738 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 750 | generateRoomId | `generateRoomId()` | 3 |  |
| 767 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 775 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 783 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 788 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 803 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 834 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 843 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 872 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 14 |  |
| 889 | cachedRoomOrNull | `cachedRoomOrNull(cached)` | 6 |  |
| 898 | loadRoom | `async loadRoom(roomId)` | 78 |  |
| 984 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1023 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 32 |  |
| 1080 | pinHostParticipant | `async pinHostParticipant(roomId, entry, participantId)` | 9 |  |
| 1095 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1140 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 28 |  |
| 1170 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1187 | flushAllPendingSaves | `flushAllPendingSaves()` | 14 |  |
| 1202 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1213 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1228 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1241 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1248 | pickRemovedMediaKey | `pickRemovedMediaKey(state, message)` | 11 |  |
| 1262 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1268 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1288 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1298 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1303 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1312 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1352 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1368 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1375 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1382 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1390 | bucketSpace | `bucketSpace()` | 8 |  |
| 1405 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1435 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1487 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1545 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1598 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1607 | ensureRoomsDir | `async ensureRoomsDir()` | 3 |  |
| 1653 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1768 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1798 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1822 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1875 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 120 |  |
| 1997 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 2010 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 2040 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 2069 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2150 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2177 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2197 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2246 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2263 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2441 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2487 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2561 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2675 | bcdiceIsBlocked | `bcdiceIsBlocked(origin, now)` | 3 |  |
| 2679 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2689 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 106 |  |
| 2797 | rememberUnavailable | `rememberUnavailable(cacheKey, cached, now, reason)` | 4 |  |
| 2803 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2819 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2853 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2879 | fetchSheetSecret | `async fetchSheetSecret(source, key, signal)` | 23 |  |
| 2904 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 58 |  |
| 2989 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2999 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 3017 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 3034 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 3062 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 3077 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 3086 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 4032 | shutdown | `shutdown(signal)` | 38 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.store.images]], [[js.store.stamps]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
