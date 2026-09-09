---
source: js/room-stamp-dialog.js
lines: 187
exports: 1
imported_by: 1
api_sha: 53ff0ce67b44
prose_sha: 53ff0ce67b44
generated: 2026-09-09
tags: [codemap]
---

# js/room-stamp-dialog.js

<!-- prose:summary -->
部屋のスタンプ1件の登録・編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
スタンプ1件の登録・編集フォーム。名前と画像を受け取り、画像はpickAndUploadImage経由でR2（P2P卓ならIndexedDB）へ置いてURLだけを持ち帰る。

選んだ直後にjs/store/stamps.jsと同じ許可リストを通すのが肝で、これが無いとアップロードできない環境で「プレビューは出るのに登録できない」壊れ方になる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 30 | fn | showRoomStampDialog | `showRoomStampDialog({ stamp = null, onConfirm, onCancel })` | stamp?: {id:string, label:string, url:string, key:string\|null, counted:boolean} \| null, 編集するスタンプ。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | showRoomStampDialog | `showRoomStampDialog({ stamp = null, onConfirm, onCancel })` | 157 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.image-upload]], [[js.store.stamps]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
