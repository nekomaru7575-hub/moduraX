---
source: js/room-entry-dialog.js
lines: 76
exports: 2
imported_by: 1
api_sha: acda0d72d8fc
prose_sha: acda0d72d8fc
generated: 2026-09-09
tags: [codemap]
---

# js/room-entry-dialog.js

<!-- prose:summary -->
入室パスワードの入力ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
入室パスワードの入力ダイアログ。[[js.net-sync]] が接続時に認証を求められたときに開かれる。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 20 | fn | showRoomEntryDialog | `showRoomEntryDialog({ password = '', error = false, onSubmit })` | password: string 前回入力した値（初期値として出す）, error: boolean 直前の入力が違っていたか, onSubmit: (password: string) => void }} opt… |
| 73 | fn | closeRoomEntryDialog | `closeRoomEntryDialog()` |  |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 20 | showRoomEntryDialog | `showRoomEntryDialog({ password = '', error = false, onSubmit })` | 52 | ✓ |
| 73 | closeRoomEntryDialog | `closeRoomEntryDialog()` | 3 | ✓ |

## 依存

- import → [[js.dialog-host]]
- imported by → [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
