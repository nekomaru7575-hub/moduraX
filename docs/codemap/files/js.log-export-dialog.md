---
source: js/log-export-dialog.js
lines: 91
exports: 1
imported_by: 1
api_sha: 7bbaffdafe39
prose_sha: 7bbaffdafe39
generated: 2026-08-07
tags: [codemap]
---

# js/log-export-dialog.js

<!-- prose:summary -->
「ログを保存」のタブ選択ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ログ保存時に、どのタブを書き出すかを選ばせるダイアログ。HTML の組み立ては [[js.log-export]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 21 | fn | showLogExportDialog | `showLogExportDialog({ tabs, onConfirm })` | tabs: {id: string, name: string}[], onConfirm: (selectedTabIds: string[]) => void }} options |

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
