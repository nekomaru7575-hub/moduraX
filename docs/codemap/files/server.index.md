---
source: server/index.js
lines: 3815
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
| 538 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 615 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 626 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 662 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 677 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 717 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 729 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 767 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 776 | isValidRoomId | `isValidRoomId(id)` | 4 |  |
| 788 | generateRoomId | `generateRoomId()` | 3 |  |
| 805 | isRoomActive | `isRoomActive(entry)` | 5 |  |
| 813 | activeRoomCount | `activeRoomCount()` | 5 |  |
| 821 | canActivateRoom | `canActivateRoom(entry)` | 3 |  |
| 826 | markRoomEntered | `markRoomEntered(entry)` | 7 |  |
| 841 | scheduleRoomUnload | `scheduleRoomUnload(roomId, entry)` | 30 |  |
| 872 | unloadRoom | `unloadRoom(roomId, entry)` | 8 |  |
| 881 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 890 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 114 |  |
| 1012 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 1029 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 19 |  |
| 1054 | applyHostSnapshot | `async applyHostSnapshot(roomId, entry, message, frameBytes)` | 36 |  |
| 1099 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 1121 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 1133 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 1142 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 1153 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 1168 | allowStamp | `allowStamp(ws)` | 11 |  |
| 1181 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 1187 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 1193 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1213 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1223 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1228 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1237 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1277 | recountBucketUsage | `async recountBucketUsage()` | 14 |  |
| 1293 | refreshBucketUsageInBackground | `refreshBucketUsageInBackground()` | 5 |  |
| 1300 | addBucketBytes | `addBucketBytes(delta)` | 3 |  |
| 1307 | invalidateBucketUsage | `invalidateBucketUsage()` | 3 |  |
| 1315 | bucketSpace | `bucketSpace()` | 8 |  |
| 1330 | refuseIfBucketFull | `refuseIfBucketFull(kind)` | 17 |  |
| 1360 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 36 |  |
| 1412 | deleteRoomData | `async deleteRoomData(roomId)` | 40 |  |
| 1470 | sweepExpiredRooms | `async sweepExpiredRooms()` | 50 |  |
| 1523 | sweepExpiredRoomsInBackground | `sweepExpiredRoomsInBackground()` | 6 |  |
| 1533 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1602 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 113 |  |
| 1717 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1747 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1771 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 43 |  |
| 1824 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1922 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1935 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1960 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1989 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 2070 | handleListRooms | `async handleListRooms(req, res, url)` | 24 |  |
| 2097 | createBlockedReason | `createBlockedReason()` | 11 |  |
| 2117 | serverLoadSnapshot | `serverLoadSnapshot()` | 40 |  |
| 2166 | summarizeRoom | `summarizeRoom(summary)` | 11 |  |
| 2183 | handleCreateRoom | `async handleCreateRoom(req, res)` | 144 |  |
| 2359 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 2405 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 2479 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2571 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2581 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2639 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2655 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2689 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2712 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2788 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2798 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2816 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2833 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2861 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2876 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2885 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3756 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.net-host-rules]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]], [[server.room-directory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
