---
source: js/room-delete-dialog.js
lines: 69
exports: 1
imported_by: 1
api_sha: 66ecbc1516f1
prose_sha: 66ecbc1516f1
generated: 2026-08-07
tags: [codemap]
---

# js/room-delete-dialog.js

<!-- prose:summary -->
部屋削除の確認ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋削除の確認ダイアログ。確認を取るだけで、削除要求の送信は [[js.net-sync]] が行う。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 21 | fn | showRoomDeleteConfirmDialog | `showRoomDeleteConfirmDialog({ onDelete, onSaveAndDelete })` | onDelete: () => void, onSaveAndDelete: () => void }} options |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 7 | ensureDialog | `ensureDialog()` | 7 |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
