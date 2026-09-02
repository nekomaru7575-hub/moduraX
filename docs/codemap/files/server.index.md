---
source: server/index.js
lines: 4002
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

## トップレベル関数（LOCAL TASKS 候補）（109）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 114 | roomKey | `roomKey(roomId)` | 3 |  |
| 138 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 143 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 152 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 165 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 174 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 178 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 195 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 199 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 209 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 224 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 228 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 238 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 263 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 305 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 310 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 321 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 344 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 361 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 365 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 369 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 380 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 389 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 398 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 426 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 435 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 446 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 455 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 466 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 480 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 541 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 621 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 632 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 668 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 683 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 723 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 735 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 773 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 782 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 794 | generateRoomId | `generateRoomId()` | 3 |  |
| 811 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 819 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 827 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 832 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 847 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 878 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 887 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 896 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 117 |  |
| 1021 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1060 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 32 |  |
| 1117 | pinHostParticipant | `async pinHostParticipant(roomId, entry, participantId)` | 9 |  |
| 1132 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1177 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 24 |  |
| 1203 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1215 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1224 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1235 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1250 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1263 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1269 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1275 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1295 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1305 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1310 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1319 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1359 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1375 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1382 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1389 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1397 | bucketSpace | `bucketSpace()` | 8 |  |
| 1412 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1442 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1494 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1552 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1605 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1615 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1684 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1799 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1829 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1853 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1906 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 2004 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 2017 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 2042 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 2071 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2152 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2179 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2199 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2248 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2265 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
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
| 2876 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2952 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2962 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2980 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2997 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 3025 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 3040 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 3049 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3943 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
