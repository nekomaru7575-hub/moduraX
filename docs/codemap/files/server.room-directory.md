---
source: server/room-directory.js
lines: 164
exports: 8
imported_by: 1
api_sha: 1195b5250a1e
prose_sha: 1195b5250a1e
generated: 2026-09-10
tags: [codemap]
---

# server/room-directory.js

<!-- prose:summary -->
全部屋の要約（名前・プラグイン・BCDiceシステム・鍵の有無・最終更新）を1か所に集めた 「部屋の名簿」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 40 | fn | configureRoomDirectory | `configureRoomDirectory(redisClient, directoryFilePath)` | 使う前に一度だけ呼ぶ。 |
| 64 | fn | loadRoomDirectory | `loadRoomDirectory()` | 保存先から名簿を読み込む（初回だけ実際に読む）。 |
| 104 | fn | upsertRoomSummary | `async upsertRoomSummary(roomId, summary)` | 名簿に1件書く（既にあれば上書き）。 |
| 111 | fn | removeRoomSummary | `async removeRoomSummary(roomId)` | 名簿から1件外す。 |
| 118 | fn | getRoomSummary | `getRoomSummary(roomId)` | 1件だけ引く。 |
| 123 | fn | roomCount | `roomCount()` | 名簿にある部屋の数。 |
| 128 | fn | allRoomIds | `allRoomIds()` | 掃除（期限切れ部屋の自動削除）が全件を回るため。 |
| 145 | fn | listRoomSummaries | `listRoomSummaries({ query = '', limit = 200 } = {})` | 一覧用。 |

## トップレベル関数（LOCAL TASKS 候補）（11）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 40 | configureRoomDirectory | `configureRoomDirectory(redisClient, directoryFilePath)` | 5 | ✓ |
| 48 | parseSummary | `parseSummary(value)` | 10 |  |
| 64 | loadRoomDirectory | `loadRoomDirectory()` | 31 | ✓ |
| 98 | writeLocalFile | `async writeLocalFile()` | 4 |  |
| 104 | upsertRoomSummary | `async upsertRoomSummary(roomId, summary)` | 5 | ✓ |
| 111 | removeRoomSummary | `async removeRoomSummary(roomId)` | 5 | ✓ |
| 118 | getRoomSummary | `getRoomSummary(roomId)` | 3 | ✓ |
| 123 | roomCount | `roomCount()` | 3 | ✓ |
| 128 | allRoomIds | `allRoomIds()` | 3 | ✓ |
| 134 | matchesQuery | `matchesQuery(summary, needle)` | 3 |  |
| 145 | listRoomSummaries | `listRoomSummaries({ query = '', limit = 200 } = {})` | 19 | ✓ |

## 依存

- import → なし
- imported by → [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
