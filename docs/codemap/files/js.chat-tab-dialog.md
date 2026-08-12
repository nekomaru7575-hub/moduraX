---
source: js/chat-tab-dialog.js
lines: 179
exports: 1
imported_by: 1
api_sha: c1277b5bea6f
prose_sha: c1277b5bea6f
generated: 2026-08-12
tags: [codemap]
---

# js/chat-tab-dialog.js

<!-- prose:summary -->
チャットタブの追加・公開先の変更・削除確認ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
チャットタブの追加・公開先変更のダイアログ。公開先の選択 UI は [[js.audience-picker]] に委ねる。`canDelete`/`onDelete` が渡された編集時は削除ボタンを出し、押すと別の確認ダイアログ（`confirmChatTabDelete`）を挟んでから呼び出し元の `onDelete` を呼ぶ。実際のタブ削除・ログ削除の処理自体は行わず、呼び出し側に委ねる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 83 | fn | showChatTabDialog | `showChatTabDialog({ mode = 'create', name = '', audience = null, participants, myParticipantId, canDelete = false, audienceEditable = true, onConfirm, onDelete })` | mode?: 'create'\|'edit', name?: string, audience?: string[]\|null, participants: Record<string, {id:string, ni… |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 9 | ensureDialog | `ensureDialog()` | 7 |  |
| 22 | ensureDeleteConfirmDialog | `ensureDeleteConfirmDialog()` | 7 |  |
| 30 | confirmChatTabDelete | `confirmChatTabDelete(tabName, onConfirm)` | 39 |  |
| 83 | showChatTabDialog | `showChatTabDialog({ mode = 'create', name = '', audience = null, participants, myParticipantId, canDelete = false, audienceEditable = true, onConfirm, onDelete })` | 96 | ✓ |

## 依存

- import → [[js.audience-picker]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
