---
source: server/index.js
lines: 2895
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-14
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

## トップレベル関数（LOCAL TASKS 候補）（86）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 90 | roomKey | `roomKey(roomId)` | 3 |  |
| 111 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 116 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 125 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 138 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 147 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 151 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 164 | roomSummaryKey | `roomSummaryKey(roomId)` | 3 |  |
| 168 | roomSummaryFilePath | `roomSummaryFilePath(roomId)` | 3 |  |
| 172 | roomSummaryOf | `roomSummaryOf(entry)` | 5 |  |
| 178 | readRoomSummary | `async readRoomSummary(roomId)` | 10 |  |
| 189 | writeRoomSummary | `async writeRoomSummary(roomId, summary)` | 8 |  |
| 198 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 6 |  |
| 207 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 236 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 241 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 252 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 275 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 292 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 296 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 300 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 311 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 320 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 329 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 357 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 366 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 377 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 386 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 397 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 411 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |  |
| 511 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 564 | serveStaticFile | `async serveStaticFile(req, res)` | 31 |  |
| 596 | sendJson | `sendJson(res, statusCode, body, extraHeaders = null)` | 9 |  |
| 611 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 651 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 663 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 695 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 702 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 707 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 715 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 724 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 93 |  |
| 825 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 842 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 15 |  |
| 866 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 888 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 900 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 909 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 920 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 935 | allowStamp | `allowStamp(ws)` | 11 |  |
| 948 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 954 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 960 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 980 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 990 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 995 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 1004 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1033 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 29 |  |
| 1078 | deleteRoomData | `async deleteRoomData(roomId)` | 38 |  |
| 1120 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1189 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 105 |  |
| 1296 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1326 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1350 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 42 |  |
| 1402 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1500 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1511 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1534 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1563 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1635 | handleListRooms | `async handleListRooms(req, res)` | 7 |  |
| 1648 | summarizeRoomSlot | `async summarizeRoomSlot(id)` | 18 |  |
| 1669 | handleCreateRoom | `async handleCreateRoom(req, res)` | 121 |  |
| 1822 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 33 |  |
| 1868 | embedStateImages | `async embedStateImages(roomId, state, limitBytes = MAX_EXPORT_EMBED_BYTES)` | 70 |  |
| 1942 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 2021 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2031 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 54 |  |
| 2087 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2103 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2146 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2156 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2174 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2191 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2219 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2234 | declaredBodyBytes | `declaredBodyBytes(req, fallbackBytes)` | 4 |  |
| 2243 | withHeavySlot | `async withHeavySlot(req, res, kind, bodyBytes, handler, hardMaxBytes = Infinity)` | 25 |  |
| 2857 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.memory-budget]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
