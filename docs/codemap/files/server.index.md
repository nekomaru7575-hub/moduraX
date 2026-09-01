---
source: server/index.js
lines: 3750
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

## トップレベル関数（LOCAL TASKS 候補）（105）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 106 | roomKey | `roomKey(roomId)` | 3 |  |
| 127 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 132 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 141 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 154 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 163 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 167 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 184 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 188 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 198 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 213 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 217 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 227 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 252 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 294 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 299 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 310 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 333 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 350 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 354 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 358 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 369 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 378 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 387 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 415 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 424 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 435 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 444 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 455 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 469 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 527 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 604 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 615 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 651 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 666 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 706 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 718 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 756 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 765 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 777 | generateRoomId | `generateRoomId()` | 3 |  |
| 794 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 802 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 810 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 815 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 830 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 861 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 870 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 879 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 114 |  |
| 1001 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1018 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1046 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1068 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1080 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1089 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1100 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1115 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1128 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1134 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1140 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1160 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1170 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1175 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1184 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1224 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1240 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1247 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1254 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1262 | bucketSpace | `bucketSpace()` | 8 |  |
| 1277 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1307 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1359 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1417 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1470 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1480 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1549 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1664 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1694 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1718 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1771 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1869 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1882 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1907 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1936 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2017 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2044 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2064 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2113 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2130 | handleCreateRoom | `async handleCreateRoom(req, res)` | 160 |  |
| 2322 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2368 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2442 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2534 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2544 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2602 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2618 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2652 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2675 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2751 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2761 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2779 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2796 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2824 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2839 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2848 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3691 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
