---
source: js/room-entry.js
lines: 34
exports: 4
imported_by: 5
api_sha: a38562f0cbb7
prose_sha: a38562f0cbb7
generated: 2026-08-07
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

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 10 | key | `key(roomId)` | 3 |

## 依存

- import → なし
- imported by → [[js.audio-dialog]], [[js.image-upload]], [[js.main]], [[js.net-sync]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
