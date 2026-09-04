---
source: js/room-stamp-list-dialog.js
lines: 138
exports: 1
imported_by: 1
api_sha: 2b55aefaf222
prose_sha: 2b55aefaf222
generated: 2026-09-04
tags: [codemap]
---

# js/room-stamp-list-dialog.js

<!-- prose:summary -->
部屋に登録したスタンプ（room.stamps）の一覧ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋に登録したスタンプの一覧ダイアログ。ルームメニューの「オリジナルスタンプ一覧」から開く。js/original-table-list-dialog.jsと同じ役割分担で、この画面は一覧と導線だけを持ち、入力はjs/room-stamp-dialog.jsが持つ。

追加・削除は即時反映で「適用」を挟まない。呼び出し側（js/main.js）が状態を変えたあと開き直す約束。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 30 | fn | showRoomStampListDialog | `showRoomStampListDialog({ stamps, onAdd, onSelect, onRemove })` | 追加・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | showRoomStampListDialog | `showRoomStampListDialog({ stamps, onAdd, onSelect, onRemove })` | 108 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.room-authority]], [[js.store.stamps]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
