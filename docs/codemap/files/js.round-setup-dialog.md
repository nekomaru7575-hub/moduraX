---
source: js/round-setup-dialog.js
lines: 96
exports: 1
imported_by: 1
api_sha: 07c0cea2aac4
prose_sha: 07c0cea2aac4
generated: 2026-08-11
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

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 8 | ensureDialog | `ensureDialog()` | 7 |  |
| 24 | showRoundSetupDialog | `showRoundSetupDialog({ title = '参加者を選択', tokens, currentParticipantIds = [], onConfirm })` | 72 | ✓ |

## 依存

- import → なし
- imported by → [[js.round-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
