---
source: js/room-entry.js
lines: 34
exports: 4
imported_by: 5
api_sha: a38562f0cbb7
prose_sha: a38562f0cbb7
generated: 2026-08-12
tags: [codemap]
---

# js/room-entry.js

<!-- prose:summary -->
部屋の入室パスワードを、このブラウザに覚えておくところ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
入室パスワードをこのブラウザに覚えておく小さなモジュール。現在の部屋 ID の判定と、API 呼び出しに付けるパスワードヘッダの組み立ても持つ。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 14 | fn | currentRoomId | `currentRoomId()` |  |
| 18 | fn | getStoredEntryPassword | `getStoredEntryPassword(roomId)` |  |
| 22 | fn | setStoredEntryPassword | `setStoredEntryPassword(roomId, password)` |  |
| 30 | fn | entryPasswordHeaders | `entryPasswordHeaders(roomId = currentRoomId())` | アップロード等のHTTP経路に載せるヘッダ。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 10 | key | `key(roomId)` | 3 |  |
| 14 | currentRoomId | `currentRoomId()` | 3 | ✓ |
| 18 | getStoredEntryPassword | `getStoredEntryPassword(roomId)` | 3 | ✓ |
| 22 | setStoredEntryPassword | `setStoredEntryPassword(roomId, password)` | 4 | ✓ |
| 30 | entryPasswordHeaders | `entryPasswordHeaders(roomId = currentRoomId())` | 4 | ✓ |

## 依存

- import → なし
- imported by → [[js.audio-dialog]], [[js.image-upload]], [[js.main]], [[js.net-sync]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
