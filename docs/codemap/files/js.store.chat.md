---
source: js/store/chat.js
lines: 113
exports: 10
imported_by: 7
api_sha: a25aa27d8af0
prose_sha: a25aa27d8af0
generated: 2026-09-17
tags: [codemap]
---

# js/store/chat.js

<!-- prose:summary -->
チャットタブとログへの追記。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
チャットタブ（Main とシステムの固定2枚を必ず用意する withFixedChatTabs）と、ログへの追記だけを持つ。**ログへ入る経路はすべて withChatEntry を通る**：発言者が「システム」になる withSystemLog（Main。ラウンド進行・シーン開始など卓の流れとして読むもの）と withSystemTabLog（システムタブ。入室・バフ消滅・BGM切替など読み流してよいもの）、表示名を宣言側が決める withExtensionEntries（拡張ルーム設定が返した entries。ステラナイツの舞台の [予兆] [舞台]）がその上に乗る。

描画は持たない（[[js.main]] の buildLogHtml）。どのアクションで呼ぶかは [[js.store.handlers.chat]] ほか各ハンドラ側。
<!-- /prose:role -->

## export（10）

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
| 107 | fn | withExtensionEntries | `withExtensionEntries(chatLogs, entries, time)` | 拡張ルーム設定が返した発言をMainタブへ並べる（js/parameters/registry.jsの「宣言の形」の節）。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

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
| 107 | withExtensionEntries | `withExtensionEntries(chatLogs, entries, time)` | 6 | ✓ |

## 依存

- import → [[js.store.audio]], [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.audio]], [[js.store.handlers.buffs]], [[js.store.handlers.chat]], [[js.store.handlers.room]], [[js.store.handlers.round]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
時刻は呼び出し側が `payload.time` から渡す。[[js.net-sync]] の dispatch ラッパが、送信者のローカル適用より前に一度だけ確定させているので、送信者・サーバー・他クライアントのどこで通っても同じ時刻になる。`withChatEntry` が `Date.now()` を補うのは time が渡らなかったときだけ。

Main とシステムのどちらへ出すかは経路ごとに選ぶ。迷ったら Main（SYSTEM_CHAT_TAB_ID のコメントが基準）。システムタブへ寄せすぎると、盤面下のカレントチャット欄（Main の最新1件だけを映す）に出したいものまで消える。
<!-- /prose:notes -->
