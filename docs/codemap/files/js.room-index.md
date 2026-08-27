---
source: js/room-index.js
lines: 588
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-27
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

## トップレベル関数（LOCAL TASKS 候補）（13）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 34 | buildSelectOptions | `buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {})` | 15 |  |
| 66 | formatUptime | `formatUptime(sec)` | 8 |  |
| 75 | appendMetric | `appendMetric(parent, label, value, suffix = '')` | 9 |  |
| 87 | renderServerStatus | `renderServerStatus(load)` | 61 |  |
| 156 | describeExpiry | `describeExpiry(updatedAt)` | 13 |  |
| 180 | mountEntryPanel | `mountEntryPanel()` | 57 |  |
| 240 | visibleRooms | `visibleRooms()` | 5 |  |
| 246 | fillRoomSelect | `fillRoomSelect()` | 32 |  |
| 280 | renderSelectedRoom | `renderSelectedRoom()` | 46 |  |
| 330 | mountCreatePanel | `mountCreatePanel()` | 178 |  |
| 510 | fillBcdiceSelect | `fillBcdiceSelect()` | 11 |  |
| 524 | renderCreateAvailability | `renderCreateAvailability(canCreate, reason)` | 12 |  |
| 537 | loadRooms | `async loadRooms()` | 44 |  |

## 依存

- import → [[js.bcdice-catalog]], [[js.icons]], [[js.parameters.registry]], [[js.pwa]], [[js.room-entry]], [[js.untrusted-json]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
