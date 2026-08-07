---
source: js/original-table-list-dialog.js
lines: 103
exports: 1
imported_by: 1
api_sha: 6f0d5fbdb2d8
prose_sha: 6f0d5fbdb2d8
generated: 2026-08-07
tags: [codemap]
---

# js/original-table-list-dialog.js

<!-- prose:summary -->
登録済みのオリジナル表（room.originalTables）のタイトル一覧ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
登録済みオリジナル表の一覧ダイアログ。選択して編集へ渡すだけで、編集本体は [[js.original-table-dialog]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | fn | showOriginalTableListDialog | `showOriginalTableListDialog({ tables, onAdd, onSelect, onRemove })` | 追加・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 8 | ensureDialog | `ensureDialog()` | 7 |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
