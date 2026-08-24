---
source: js/info-entry-dialog.js
lines: 226
exports: 1
imported_by: 1
api_sha: 6039d4f17db4
prose_sha: 6039d4f17db4
generated: 2026-08-24
tags: [codemap]
---

# js/info-entry-dialog.js

<!-- prose:summary -->
「情報」1件を編集するダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「情報」1件（タイトルと本文と公開範囲）の編集ダイアログ。一覧側は [[js.info-panel]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 42 | fn | showInfoEntryDialog | `showInfoEntryDialog({ mode = 'create', title = '', sections = [], participants, myParticipantId, onConfirm })` | mode?: 'create'\|'edit', title?: string, sections?: Array<{id: string, label: string, body: string, audience:… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | ensureDialog | `ensureDialog()` | 7 |  |
| 42 | showInfoEntryDialog | `showInfoEntryDialog({ mode = 'create', title = '', sections = [], participants, myParticipantId, onConfirm })` | 184 | ✓ |

## 依存

- import → [[js.audience-picker]]
- imported by → [[js.info-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
