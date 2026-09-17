---
source: server/index.js
lines: 3960
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-17
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
| 110 | roomKey | `roomKey(roomId)` | 3 |  |
| 134 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 139 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 148 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 161 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 170 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 174 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 196 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 211 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 215 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 3 |  |
| 221 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 250 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 255 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 266 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 289 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 308 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 312 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 316 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 327 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 336 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 345 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 373 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 382 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 393 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 402 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 415 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 479 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 559 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 570 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 606 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 621 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 661 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 673 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 711 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 719 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 731 | generateRoomId | `generateRoomId()` | 3 |  |
| 748 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 756 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 764 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 769 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 784 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 815 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 824 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 831 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 80 |  |
| 919 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 958 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 32 |  |
| 1015 | pinHostParticipant | `async pinHostParticipant(roomId, entry, participantId)` | 9 |  |
| 1030 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1075 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 24 |  |
| 1101 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1113 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1122 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1133 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1148 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1161 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1168 | pickRemovedMediaKey | `pickRemovedMediaKey(state, message)` | 11 |  |
| 1182 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1188 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1208 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1218 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1223 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1232 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1272 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1288 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1295 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1302 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1310 | bucketSpace | `bucketSpace()` | 8 |  |
| 1325 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1355 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1407 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1465 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1518 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1527 | ensureRoomsDir | `async ensureRoomsDir()` | 3 |  |
| 1573 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1688 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1718 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1742 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1795 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 120 |  |
| 1917 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1930 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1960 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1989 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2070 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2097 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2117 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2166 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2183 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2361 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2407 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2481 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2595 | bcdiceIsBlocked | `bcdiceIsBlocked(origin, now)` | 3 |  |
| 2599 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2609 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 106 |  |
| 2717 | rememberUnavailable | `rememberUnavailable(cacheKey, cached, now, reason)` | 4 |  |
| 2723 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2739 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2773 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2799 | fetchSheetSecret | `async fetchSheetSecret(source, key, signal)` | 23 |  |
| 2824 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 58 |  |
| 2909 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2919 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2937 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2954 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2982 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2997 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 3006 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3901 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.store.images]], [[js.store.stamps]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
