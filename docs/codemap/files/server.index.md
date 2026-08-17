---
source: server/index.js
lines: 3025
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-17
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

## トップレベル関数（LOCAL TASKS 候補）（89）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 92 | roomKey | `roomKey(roomId)` | 3 |  |
| 113 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 118 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 127 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 140 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 149 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 153 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 166 | roomSummaryKey | `roomSummaryKey(roomId)` | 3 |  |
| 170 | roomSummaryFilePath | `roomSummaryFilePath(roomId)` | 3 |  |
| 174 | roomSummaryOf | `roomSummaryOf(entry)` | 5 |  |
| 180 | readRoomSummary | `async readRoomSummary(roomId)` | 10 |  |
| 191 | writeRoomSummary | `async writeRoomSummary(roomId, summary)` | 8 |  |
| 200 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 6 |  |
| 209 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 238 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 243 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 254 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 277 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 294 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 298 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 302 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 313 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 322 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 331 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 359 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 368 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 379 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 388 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 399 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 413 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |  |
| 522 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 589 | cacheControlFor | `cacheControlFor(relativePath)` | 7 |  |
| 599 | serveStaticFile | `async serveStaticFile(req, res)` | 35 |  |
| 635 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 650 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 690 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 702 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 734 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 741 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 746 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 754 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 763 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 93 |  |
| 864 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 881 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 15 |  |
| 905 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 927 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 939 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 948 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 959 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 974 | allowStamp | `allowStamp(ws)` | 11 |  |
| 987 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 993 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 999 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 1019 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 1029 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 1034 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1043 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1072 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 29 |  |
| 1117 | deleteRoomData | `async deleteRoomData(roomId)` | 38 |  |
| 1159 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1228 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 105 |  |
| 1335 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1365 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1389 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 42 |  |
| 1441 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1539 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1550 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1573 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1602 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1674 | handleListRooms | `async handleListRooms(req, res)` | 7 |  |
| 1687 | summarizeRoomSlot | `async summarizeRoomSlot(id)` | 18 |  |
| 1708 | handleCreateRoom | `async handleCreateRoom(req, res)` | 121 |  |
| 1861 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 1907 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 1981 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2060 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2070 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 54 |  |
| 2126 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2142 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2176 | readCappedText | `async readCappedText(response, maxBytes)` | 21 |  |
| 2199 | handleCharacterSheet | `async handleCharacterSheet(req, res, url)` | 45 |  |
| 2270 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2280 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2298 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2315 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2343 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2358 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2367 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 2987 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
