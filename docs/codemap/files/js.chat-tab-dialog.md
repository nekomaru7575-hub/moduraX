---
source: js/chat-tab-dialog.js
lines: 99
exports: 1
imported_by: 1
api_sha: 708c4c974239
prose_sha: 708c4c974239
generated: 2026-08-07
tags: [codemap]
---

# js/chat-tab-dialog.js

<!-- prose:summary -->
チャットタブの追加・公開先の変更ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
チャットタブの追加と、そのタブの公開先変更のダイアログ。公開先の選択 UI は [[js.audience-picker]] に委ねる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | fn | showChatTabDialog | `showChatTabDialog({ mode = 'create', name = '', audience = null, participants, myParticipantId, onConfirm })` | mode?: 'create'\|'edit', name?: string, audience?: string[]\|null, participants: Record<string, {id:string, ni… |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 9 | ensureDialog | `ensureDialog()` | 7 |

## 依存

- import → [[js.audience-picker]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
