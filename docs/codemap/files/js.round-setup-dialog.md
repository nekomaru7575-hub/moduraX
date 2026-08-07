---
source: js/round-setup-dialog.js
lines: 96
exports: 1
imported_by: 1
api_sha: 07c0cea2aac4
prose_sha: 07c0cea2aac4
generated: 2026-08-07
tags: [codemap]
---

# js/round-setup-dialog.js

<!-- prose:summary -->
ラウンド進行の参加者選択ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ラウンド進行を始めるときに、どのコマを参加者にするかを選ばせるダイアログ。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 24 | fn | showRoundSetupDialog | `showRoundSetupDialog({ title = '参加者を選択', tokens, currentParticipantIds = [], onConfirm })` | title?: string, tokens: Array<{id: string, name: string}>, currentParticipantIds?: string[], onConfirm: (res… |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 8 | ensureDialog | `ensureDialog()` | 7 |

## 依存

- import → なし
- imported by → [[js.round-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
