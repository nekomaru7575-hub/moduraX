---
source: js/room-parameters-dialog.js
lines: 187
exports: 1
imported_by: 1
api_sha: 1814e24bd1b5
prose_sha: 1814e24bd1b5
generated: 2026-08-07
tags: [codemap]
---

# js/room-parameters-dialog.js

<!-- prose:summary -->
ルーム変数（room.parameters）専用の一覧編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ルーム変数（`room.parameters`）の一覧編集ダイアログ。コマのパラメータではなく部屋全体で共有する値を扱う。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 38 | fn | showRoomParametersDialog | `showRoomParametersDialog({ parameters, onConfirm })` | 「編集不可(editable:false)」な変数は値の変更を受け付けず、 「削除不可(locked:true)」な変数は削除ボタンを出さない（character-dialogの編集ダイアログと同じ規約）。 |

## トップレベル関数・非export（2）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 8 | parseRoomParameterValue | `parseRoomParameterValue(raw)` | 6 |
| 17 | ensureDialog | `ensureDialog()` | 7 |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
