---
source: js/room-index.js
lines: 654
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-01
tags: [codemap]
---

# js/room-index.js

<!-- prose:summary -->
部屋一覧ページ（index.html）のロジック。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
index.html（部屋一覧ページ）のエントリポイント。部屋の作成・一覧表示・入室を扱う。ルーム本体（[[js.main]]）とは別ページで、盤面や WebSocket 同期には関与しない。
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数（LOCAL TASKS 候補）（14）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 41 | roomBoardUrl | `roomBoardUrl(room)` | 5 |  |
| 47 | buildSelectOptions | `buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {})` | 15 |  |
| 79 | formatUptime | `formatUptime(sec)` | 8 |  |
| 88 | appendMetric | `appendMetric(parent, label, value, suffix = '')` | 9 |  |
| 100 | renderServerStatus | `renderServerStatus(load)` | 61 |  |
| 169 | describeExpiry | `describeExpiry(updatedAt)` | 13 |  |
| 193 | mountEntryPanel | `mountEntryPanel()` | 57 |  |
| 253 | visibleRooms | `visibleRooms()` | 5 |  |
| 259 | fillRoomSelect | `fillRoomSelect()` | 39 |  |
| 300 | renderSelectedRoom | `renderSelectedRoom()` | 58 |  |
| 362 | mountCreatePanel | `mountCreatePanel()` | **202** |  |
| 566 | fillBcdiceSelect | `fillBcdiceSelect()` | 11 |  |
| 580 | renderCreateAvailability | `renderCreateAvailability(canCreate, reason)` | 12 |  |
| 593 | loadRooms | `async loadRooms()` | 44 |  |

## 依存

- import → [[js.bcdice-catalog]], [[js.icons]], [[js.parameters.registry]], [[js.pwa]], [[js.room-entry]], [[js.untrusted-json]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
