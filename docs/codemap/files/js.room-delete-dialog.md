---
source: js/room-delete-dialog.js
lines: 71
exports: 1
imported_by: 1
api_sha: 66ecbc1516f1
prose_sha: 66ecbc1516f1
generated: 2026-08-21
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
| 23 | fn | showRoomDeleteConfirmDialog | `showRoomDeleteConfirmDialog({ onDelete, onSaveAndDelete })` | onDelete: () => void, onSaveAndDelete: () => void \| Promise<void> （書き出しにサーバーへの問い合わせが要るため非同期になりうる。ダイアログは待たないが… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 7 | ensureDialog | `ensureDialog()` | 7 |  |
| 23 | showRoomDeleteConfirmDialog | `showRoomDeleteConfirmDialog({ onDelete, onSaveAndDelete })` | 48 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
