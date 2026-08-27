---
source: js/log-clear-dialog.js
lines: 58
exports: 1
imported_by: 1
api_sha: 4fccc5865601
prose_sha: 4fccc5865601
generated: 2026-08-27
tags: [codemap]
---

# js/log-clear-dialog.js

<!-- prose:summary -->
全タブのログを消す前の確認ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
全タブのログ削除前の確認ダイアログ。確認を取るだけで、実際の削除は呼び出し側が行う。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | fn | showLogClearConfirmDialog | `showLogClearConfirmDialog({ onConfirm })` |  |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 8 | ensureDialog | `ensureDialog()` | 7 |  |
| 19 | showLogClearConfirmDialog | `showLogClearConfirmDialog({ onConfirm })` | 39 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
