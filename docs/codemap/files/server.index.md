---
source: server/index.js
lines: 3789
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
| 111 | roomKey | `roomKey(roomId)` | 3 |  |
| 132 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 137 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 146 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 159 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 168 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 172 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 189 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 193 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 203 | roomSummaryOf | `roomSummaryOf(entry)` | 13 |  |
| 218 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 222 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 232 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 257 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 299 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 304 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 315 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 338 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 355 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 359 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 363 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 374 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 383 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 392 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 420 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 429 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 440 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 449 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 460 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 474 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 532 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 609 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 620 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 656 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 671 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 711 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 723 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 761 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 770 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 782 | generateRoomId | `generateRoomId()` | 3 |  |
| 799 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 807 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 815 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 820 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 835 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 866 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 875 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 884 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 114 |  |
| 1006 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1023 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1051 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1073 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1085 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1094 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1105 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1120 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1133 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1139 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1145 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1165 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1175 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1180 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1189 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1229 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1245 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1252 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1259 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1267 | bucketSpace | `bucketSpace()` | 8 |  |
| 1282 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1312 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1364 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1422 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1475 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1485 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1554 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1669 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1699 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1723 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1776 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1874 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1887 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1912 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1941 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2022 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2049 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2069 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2118 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2135 | handleCreateRoom | `async handleCreateRoom(req, res)` | 160 |  |
| 2327 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2373 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2447 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2539 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2549 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2607 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2623 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2657 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2680 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2756 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2766 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2784 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2801 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2829 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2844 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2853 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3730 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
