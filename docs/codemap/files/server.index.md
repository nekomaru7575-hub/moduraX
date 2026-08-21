---
source: server/index.js
lines: 3097
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-21
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

## トップレベル関数（LOCAL TASKS 候補）（90）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 96 | roomKey | `roomKey(roomId)` | 3 |  |
| 117 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 122 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 131 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 144 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 153 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 157 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 170 | roomSummaryKey | `roomSummaryKey(roomId)` | 3 |  |
| 174 | roomSummaryFilePath | `roomSummaryFilePath(roomId)` | 3 |  |
| 178 | roomSummaryOf | `roomSummaryOf(entry)` | 5 |  |
| 184 | readRoomSummary | `async readRoomSummary(roomId)` | 10 |  |
| 195 | writeRoomSummary | `async writeRoomSummary(roomId, summary)` | 8 |  |
| 204 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 6 |  |
| 213 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 242 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 247 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 258 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 281 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 298 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 302 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 306 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 317 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 326 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 335 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 363 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 372 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 383 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 392 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 403 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 417 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 3 |  |
| 463 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 534 | cacheControlFor | `cacheControlFor(relativePath)` | 8 |  |
| 545 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 581 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 596 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 636 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 648 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 680 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 687 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 692 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 700 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 709 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 93 |  |
| 810 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 827 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 15 |  |
| 851 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 873 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 885 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 894 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 905 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 920 | allowStamp | `allowStamp(ws)` | 11 |  |
| 933 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 939 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 945 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 965 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 975 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 980 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 989 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1018 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 29 |  |
| 1063 | deleteRoomData | `async deleteRoomData(roomId)` | 38 |  |
| 1105 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1174 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 105 |  |
| 1281 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1311 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1335 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 42 |  |
| 1387 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1485 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1498 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1523 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1552 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1626 | handleListRooms | `async handleListRooms(req, res)` | 9 |  |
| 1642 | serverLoadSnapshot | `serverLoadSnapshot()` | 28 |  |
| 1680 | summarizeRoomSlot | `async summarizeRoomSlot(id)` | 20 |  |
| 1703 | handleCreateRoom | `async handleCreateRoom(req, res)` | 121 |  |
| 1856 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 1902 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 1976 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2067 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2077 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 56 |  |
| 2135 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2151 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2185 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2208 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 49 |  |
| 2283 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2293 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2311 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2328 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2356 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2371 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2380 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 3055 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]], [[js.room-authority-rules]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
