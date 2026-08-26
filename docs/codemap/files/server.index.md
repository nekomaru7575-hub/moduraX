---
source: server/index.js
lines: 3594
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-26
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
| 104 | roomKey | `roomKey(roomId)` | 3 |  |
| 125 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 130 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 139 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 152 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 161 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 165 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 182 | legacySummaryKey | `legacySummaryKey(roomId)` | 3 |  |
| 186 | legacySummaryFilePath | `legacySummaryFilePath(roomId)` | 3 |  |
| 196 | roomSummaryOf | `roomSummaryOf(entry)` | 9 |  |
| 207 | readRoomSummary | `readRoomSummary(roomId)` | 3 |  |
| 211 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 7 |  |
| 221 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 246 | migrateLegacySummariesIfNeeded | `async migrateLegacySummariesIfNeeded()` | 27 |  |
| 288 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 293 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 304 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 327 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 344 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 348 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 352 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 363 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 372 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 381 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 409 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 418 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 429 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 438 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 449 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 463 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 521 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 592 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 603 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 639 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 654 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 694 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 706 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 744 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 753 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 765 | generateRoomId | `generateRoomId()` | 3 |  |
| 782 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 790 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 798 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 803 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 818 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 849 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 858 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 867 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 108 |  |
| 983 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1000 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1028 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1050 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1062 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1071 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1082 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1097 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1110 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1116 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1122 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1142 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1152 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1157 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1166 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1206 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1222 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1229 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1236 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1244 | bucketSpace | `bucketSpace()` | 8 |  |
| 1259 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1289 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1341 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1399 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1452 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1462 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1531 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1646 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1676 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1700 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1753 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1851 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1864 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1889 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1918 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1999 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2026 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2046 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2095 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2112 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2288 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2334 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2408 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2500 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2510 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2568 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2584 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2618 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2641 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2717 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2727 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2745 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2762 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2790 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2805 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2814 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3535 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
