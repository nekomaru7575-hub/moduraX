---
source: js/chat-palette.js
lines: 382
exports: 5
imported_by: 1
api_sha: 804066cafe14
prose_sha: 804066cafe14
generated: 2026-08-20
tags: [codemap]
---

# js/chat-palette.js

<!-- prose:summary -->
チャットパレット：ユーザ(ブラウザ)ごとによく使うフレーズを保存し、 クリックだけで即座に送信できるようにする機能。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ブラウザごとに保存するよく使うフレーズ集。状態は localStorage にあり、部屋の共有状態（[[js.game-store]]）には入らない。テキストのパース規則（見出し行・コマンド行）はここが単独で持つ。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | const | CHAT_PALETTE_FORMAT | `CHAT_PALETTE_FORMAT` | パレットのファイル保存形式のマーカー。 |
| 60 | fn | loadChatPaletteState | `loadChatPaletteState()` |  |
| 77 | fn | saveChatPaletteState | `saveChatPaletteState(state)` |  |
| 85 | fn | parseChatPaletteLines | `parseChatPaletteLines(text)` |  |
| 103 | fn | renderChatPalette | `renderChatPalette({ container, onSend, findTokenByName })` | パレットのUIを描画する。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 25 | generateTabId | `generateTabId()` | 4 |  |
| 30 | createTab | `createTab(name = '', text = '')` | 3 |  |
| 34 | emptyState | `emptyState()` | 4 |  |
| 41 | normalizeState | `normalizeState(raw)` | 18 |  |
| 60 | loadChatPaletteState | `loadChatPaletteState()` | 16 | ✓ |
| 77 | saveChatPaletteState | `saveChatPaletteState(state)` | 7 | ✓ |
| 85 | parseChatPaletteLines | `parseChatPaletteLines(text)` | 6 | ✓ |
| 103 | renderChatPalette | `renderChatPalette({ container, onSend, findTokenByName })` | **279** | ✓ |

## 依存

- import → [[js.character-snapshot]], [[js.file-uploader]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
