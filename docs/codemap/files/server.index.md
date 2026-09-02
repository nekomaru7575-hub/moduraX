---
source: server/index.js
lines: 3946
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
| 1038 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1082 | pinHostParticipant | `async pinHostParticipant(roomId, entry, participantId)` | 9 |  |
| 1097 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1142 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1164 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1176 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1185 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1196 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1211 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1224 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1230 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1236 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1256 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1266 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1271 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1280 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1320 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1336 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1343 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1350 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1358 | bucketSpace | `bucketSpace()` | 8 |  |
| 1373 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1403 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1455 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1513 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1566 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1576 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1645 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1760 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1790 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1814 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1867 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1965 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1978 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 2003 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 2032 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2113 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2140 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2160 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2209 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2226 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2402 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2448 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2522 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2636 | bcdiceIsBlocked | `bcdiceIsBlocked(origin, now)` | 3 |  |
| 2640 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2650 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 106 |  |
| 2758 | rememberUnavailable | `rememberUnavailable(cacheKey, cached, now, reason)` | 4 |  |
| 2764 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2780 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2814 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2837 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2913 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2923 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2941 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2958 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2986 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 3001 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 3010 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3887 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.bcdice-cache-rules]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
