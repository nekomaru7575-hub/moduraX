---
source: js/store/chat.js
lines: 103
exports: 9
imported_by: 6
api_sha: d279cb20df81
prose_sha: d279cb20df81
generated: 2026-09-09
tags: [codemap]
---

# js/store/chat.js

<!-- prose:summary -->
チャットタブとログへの追記。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 12 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 22 | const | SYSTEM_CHAT_TAB_ID | `SYSTEM_CHAT_TAB_ID` | システム発言のうち「読み流してよい事務連絡」を集める固定タブ（withSystemTabLog参照）。 |
| 23 | const | SYSTEM_CHAT_TAB_NAME | `SYSTEM_CHAT_TAB_NAME` |  |
| 31 | fn | withFixedChatTabs | `withFixedChatTabs(chatTabs, chatLogs)` | 固定タブ（Main・システム）と、その空ログを必ず用意した chatTabs / chatLogs を返す。 |
| 61 | fn | withBgmLog | `withBgmLog(chatLogs, tracks, nextTrackId, time)` | BGMが切り替わったことをシステムタブへ1行残す（曲名、またはnextTrackId:nullで「停止」）。 |
| 78 | fn | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 指定タブのログへ1件追記した新しいchatLogsを返す。 |
| 88 | fn | withSystemLogIn | `withSystemLogIn(chatLogs, tabId, text, time)` | システム発言（発言者が「システム」の1行）を指定タブへ1件追記する。 |
| 94 | fn | withSystemLog | `withSystemLog(chatLogs, text, time)` | Mainタブへ出すシステム発言。 |
| 100 | fn | withSystemTabLog | `withSystemTabLog(chatLogs, text, time)` | システムタブへ出すシステム発言。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 31 | withFixedChatTabs | `withFixedChatTabs(chatTabs, chatLogs)` | 23 | ✓ |
| 61 | withBgmLog | `withBgmLog(chatLogs, tracks, nextTrackId, time)` | 6 | ✓ |
| 78 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 | ✓ |
| 88 | withSystemLogIn | `withSystemLogIn(chatLogs, tabId, text, time)` | 3 | ✓ |
| 94 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 | ✓ |
| 100 | withSystemTabLog | `withSystemTabLog(chatLogs, text, time)` | 3 | ✓ |

## 依存

- import → [[js.store.audio]], [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.audio]], [[js.store.handlers.buffs]], [[js.store.handlers.chat]], [[js.store.handlers.round]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
