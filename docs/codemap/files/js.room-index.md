---
source: js/room-index.js
lines: 715
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-02
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
| 44 | roomBoardUrl | `roomBoardUrl(room)` | 5 |  |
| 50 | buildSelectOptions | `buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {})` | 15 |  |
| 82 | formatUptime | `formatUptime(sec)` | 8 |  |
| 91 | appendMetric | `appendMetric(parent, label, value, suffix = '')` | 9 |  |
| 103 | renderServerStatus | `renderServerStatus(load)` | 61 |  |
| 172 | describeExpiry | `describeExpiry(updatedAt)` | 13 |  |
| 196 | mountEntryPanel | `mountEntryPanel()` | 57 |  |
| 256 | visibleRooms | `visibleRooms()` | 5 |  |
| 262 | fillRoomSelect | `fillRoomSelect()` | 39 |  |
| 303 | renderSelectedRoom | `renderSelectedRoom()` | 67 |  |
| 374 | mountCreatePanel | `mountCreatePanel()` | **251** |  |
| 627 | fillBcdiceSelect | `fillBcdiceSelect()` | 11 |  |
| 641 | renderCreateAvailability | `renderCreateAvailability(canCreate, reason)` | 12 |  |
| 654 | loadRooms | `async loadRooms()` | 44 |  |

## 依存

- import → [[js.asset-store]], [[js.bcdice-catalog]], [[js.icons]], [[js.p2p-import-handoff]], [[js.parameters.registry]], [[js.pwa]], [[js.room-entry]], [[js.state-import]], [[js.untrusted-json]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
