---
source: js/original-table-dialog.js
lines: 164
exports: 1
imported_by: 1
api_sha: bf2e03ed6fe8
prose_sha: bf2e03ed6fe8
generated: 2026-08-24
tags: [codemap]
---

# js/original-table-dialog.js

<!-- prose:summary -->
オリジナル表（ユーザー定義のダイス表）の作成／編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ユーザー定義のダイス表（オリジナル表）の作成・編集ダイアログ。表の実体は部屋の状態（`room.originalTables`）に入り、チャットからの実行は [[js.main]] が扱う。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 52 | fn | showOriginalTableDialog | `showOriginalTableDialog({ table = null, onConfirm, onCancel = null })` | tableを渡すとその内容を初期表示した編集モードになる。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 9 | parseTableEntries | `parseTableEntries(text)` | 13 |  |
| 24 | formatTableEntries | `formatTableEntries(entries)` | 3 |  |
| 31 | ensureDialog | `ensureDialog()` | 7 |  |
| 52 | showOriginalTableDialog | `showOriginalTableDialog({ table = null, onConfirm, onCancel = null })` | 112 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
