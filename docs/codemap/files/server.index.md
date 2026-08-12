---
source: server/index.js
lines: 2792
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-12
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

## トップレベル関数（LOCAL TASKS 候補）（84）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 86 | roomKey | `roomKey(roomId)` | 3 |  |
| 107 | encodeRoomState | `async encodeRoomState(json)` | 4 |  |
| 112 | decodeRoomState | `async decodeRoomState(value)` | 5 |  |
| 121 | readRoomState | `async readRoomState(roomId)` | 10 |  |
| 134 | writeRoomStateJson | `async writeRoomStateJson(roomId, json)` | 8 |  |
| 143 | writeRoomState | `async writeRoomState(roomId, state)` | 3 |  |
| 147 | deleteRoomState | `async deleteRoomState(roomId)` | 7 |  |
| 160 | roomSummaryKey | `roomSummaryKey(roomId)` | 3 |  |
| 164 | roomSummaryFilePath | `roomSummaryFilePath(roomId)` | 3 |  |
| 168 | roomSummaryOf | `roomSummaryOf(entry)` | 5 |  |
| 174 | readRoomSummary | `async readRoomSummary(roomId)` | 10 |  |
| 185 | writeRoomSummary | `async writeRoomSummary(roomId, summary)` | 8 |  |
| 194 | deleteRoomSummary | `async deleteRoomSummary(roomId)` | 6 |  |
| 203 | syncRoomSummary | `async syncRoomSummary(roomId, entry)` | 14 |  |
| 232 | deriveParticipantId | `deriveParticipantId(authToken)` | 3 |  |
| 237 | equalsSecret | `equalsSecret(a, b)` | 6 |  |
| 248 | verifyIdentity | `verifyIdentity(participantId, authToken)` | 4 |  |
| 271 | isDeveloperToken | `isDeveloperToken(roomId, authToken)` | 7 |  |
| 288 | authMetaKey | `authMetaKey(roomId)` | 3 |  |
| 292 | authMetaFilePath | `authMetaFilePath(roomId)` | 3 |  |
| 296 | readAuthMeta | `async readAuthMeta(roomId)` | 10 |  |
| 307 | writeAuthMeta | `async writeAuthMeta(roomId, meta)` | 8 |  |
| 316 | deleteAuthMeta | `async deleteAuthMeta(roomId)` | 6 |  |
| 325 | updateAuthMeta | `async updateAuthMeta(roomId, patch)` | 11 |  |
| 353 | hashEntryPassword | `hashEntryPassword(salt, password)` | 3 |  |
| 362 | buildEntryPasswordRecord | `buildEntryPasswordRecord(password)` | 9 |  |
| 373 | verifyEntryPassword | `verifyEntryPassword(record, password)` | 6 |  |
| 382 | entryPasswordFromHeaders | `entryPasswordFromHeaders(req)` | 9 |  |
| 393 | clearLegacyGmFlags | `clearLegacyGmFlags(roomId, store)` | 10 |  |
| 407 | canOperateAsGm | `canOperateAsGm(state, participantId)` | 6 |  |
| 504 | isPublicPath | `isPublicPath(filePath)` | 12 |  |
| 557 | serveStaticFile | `async serveStaticFile(req, res)` | 31 |  |
| 589 | sendJson | `sendJson(res, statusCode, body)` | 5 |  |
| 600 | readJsonBody | `readJsonBody(req, maxBytes)` | 37 |  |
| 640 | sendJsonBodyError | `sendJsonBodyError(req, res, error)` | 8 |  |
| 652 | readBinaryBody | `readBinaryBody(req, maxBytes)` | 22 |  |
| 684 | isDeletingRoom | `isDeletingRoom(roomId)` | 3 |  |
| 691 | waitForRoomDeletion | `waitForRoomDeletion(roomId)` | 4 |  |
| 696 | isValidRoomId | `isValidRoomId(id)` | 7 |  |
| 704 | roomFilePath | `roomFilePath(roomId)` | 3 |  |
| 713 | getOrLoadRoom | `async getOrLoadRoom(roomId)` | 93 |  |
| 814 | stateForPersist | `stateForPersist(state)` | 15 |  |
| 831 | persistRoomNow | `async persistRoomNow(roomId, entry)` | 15 |  |
| 855 | schedulePersistForRoom | `schedulePersistForRoom(roomId, entry)` | 20 |  |
| 877 | flushPendingSave | `flushPendingSave(roomId, entry)` | 8 |  |
| 889 | flushAllPendingSaves | `flushAllPendingSaves()` | 8 |  |
| 898 | broadcastToRoom | `broadcastToRoom(entry, sender, message)` | 8 |  |
| 909 | typingUsersList | `typingUsersList(entry)` | 3 |  |
| 924 | allowStamp | `allowStamp(ws)` | 11 |  |
| 937 | pickOwnedAudioKey | `pickOwnedAudioKey(track)` | 3 |  |
| 943 | roomObjectPrefix | `roomObjectPrefix(roomId)` | 3 |  |
| 949 | isOwnKeyOfRoom | `isOwnKeyOfRoom(roomId, key)` | 3 |  |
| 969 | roomStorageBytes | `async roomStorageBytes(roomId)` | 8 |  |
| 979 | addRoomStorageBytes | `addRoomStorageBytes(roomId, delta)` | 4 |  |
| 984 | forgetRoomStorage | `forgetRoomStorage(roomId)` | 3 |  |
| 993 | refuseIfRoomStorageFull | `async refuseIfRoomStorageFull(roomId, bytes)` | 16 |  |
| 1022 | startRoomDeletion | `startRoomDeletion(roomId, entry)` | 29 |  |
| 1067 | deleteRoomData | `async deleteRoomData(roomId)` | 38 |  |
| 1109 | migrateLegacyStateIfNeeded | `async migrateLegacyStateIfNeeded()` | 26 |  |
| 1178 | handleMediaUpload | `async handleMediaUpload(req, res, { typePrefix, extensions, fallbackExtension = null, maxBytes, requireGm = true, forbiddenMessage, unavailableMessage, wrongTypeMessage, label })` | 105 |  |
| 1285 | handleAudioUpload | `handleAudioUpload(req, res)` | 14 |  |
| 1315 | decodeDataUrl | `decodeDataUrl(dataUrl, extensions)` | 12 |  |
| 1339 | adoptMediaUrl | `async adoptMediaUrl(roomId, url, { extensions, maxBytes, label })` | 42 |  |
| 1391 | adoptStateMedia | `async adoptStateMedia(roomId, state)` | 96 |  |
| 1489 | droppedMediaMessage | `droppedMediaMessage(dropped)` | 8 |  |
| 1500 | withImportNotice | `withImportNotice(state, text)` | 9 |  |
| 1523 | handleImageUpload | `handleImageUpload(req, res)` | 20 |  |
| 1552 | handleImageCopy | `async handleImageCopy(req, res)` | 70 |  |
| 1624 | handleListRooms | `async handleListRooms(req, res)` | 7 |  |
| 1637 | summarizeRoomSlot | `async summarizeRoomSlot(id)` | 18 |  |
| 1658 | handleCreateRoom | `async handleCreateRoom(req, res)` | 121 |  |
| 1805 | handleExportRoom | `async handleExportRoom(req, res, roomId)` | 29 |  |
| 1845 | embedStateImages | `async embedStateImages(roomId, state)` | 70 |  |
| 1919 | handleSetEntryPassword | `async handleSetEntryPassword(req, res, roomId)` | 58 |  |
| 1998 | rememberBcdice | `rememberBcdice(cacheKey, entry)` | 6 |  |
| 2008 | loadBcdiceCached | `async loadBcdiceCached(cacheKey, upstreamPath, transform)` | 54 |  |
| 2064 | handleBcdiceSystems | `async handleBcdiceSystems(req, res)` | 11 |  |
| 2080 | handleBcdiceSystemInfo | `async handleBcdiceSystemInfo(req, res, systemId)` | 19 |  |
| 2123 | clientIpOf | `clientIpOf(req)` | 8 |  |
| 2133 | expandIpv6Groups | `expandIpv6Groups(address)` | 9 |  |
| 2151 | rateLimitScopeOf | `rateLimitScopeOf(rawIp)` | 15 |  |
| 2168 | exceedsRateLimit | `exceedsRateLimit(req, kind)` | 14 |  |
| 2196 | rejectTooManyRequests | `rejectTooManyRequests(res)` | 3 |  |
| 2757 | shutdown | `shutdown(signal)` | 23 |  |

## 依存

- import → [[js.game-store]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.untrusted-json]], [[server.r2]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
