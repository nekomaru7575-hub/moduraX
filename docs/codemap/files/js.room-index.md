---
source: js/room-index.js
lines: 274
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-14
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

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 20 | buildSelectOptions | `buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {})` | 15 |  |
| 36 | buildOccupiedCard | `buildOccupiedCard(room)` | 35 |  |
| 72 | buildVacantCard | `buildVacantCard(room)` | 173 |  |
| 246 | loadRooms | `async loadRooms()` | 26 |  |

## 依存

- import → [[js.bcdice-catalog]], [[js.parameters.registry]], [[js.room-entry]], [[js.untrusted-json]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
