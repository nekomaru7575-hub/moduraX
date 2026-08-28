---
source: js/chat-palette.js
lines: 441
exports: 6
imported_by: 1
api_sha: 38d7d777e3d4
prose_sha: 38d7d777e3d4
generated: 2026-08-28
tags: [codemap]
---

# js/chat-palette.js

<!-- prose:summary -->
チャットパレット：ユーザ(ブラウザ)ごとによく使うフレーズを保存し、選ぶだけで送れるようにする機能。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ブラウザごとに保存するよく使うフレーズ集。状態は localStorage にあり、部屋の共有状態（[[js.game-store]]）には入らない。1タブ＝改行区切りのテキスト1本で、行の解釈（空行は無視・「//」始まりは見出し）はここが単独で持つ。判定規則は `isChatPaletteHeading` に集約していて、[[js.main]] のメインチャット欄の予測変換も同じ関数を通す。送信そのものは持たず、`onSend` で呼び出し元（[[js.main]] の submitFromPalette）へ委ねる。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | const | CHAT_PALETTE_FORMAT | `CHAT_PALETTE_FORMAT` | パレットのファイル保存形式のマーカー。 |
| 65 | fn | loadChatPaletteState | `loadChatPaletteState()` |  |
| 82 | fn | saveChatPaletteState | `saveChatPaletteState(state)` |  |
| 90 | fn | parseChatPaletteLines | `parseChatPaletteLines(text)` |  |
| 105 | fn | isChatPaletteHeading | `isChatPaletteHeading(line)` | 見出しの行か。 |
| 121 | fn | renderChatPalette | `renderChatPalette({ container, onSend, findTokenByName })` | パレットのUIを描画する。 |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | generateTabId | `generateTabId()` | 4 |  |
| 35 | createTab | `createTab(name = '', text = '')` | 3 |  |
| 39 | emptyState | `emptyState()` | 4 |  |
| 46 | normalizeState | `normalizeState(raw)` | 18 |  |
| 65 | loadChatPaletteState | `loadChatPaletteState()` | 16 | ✓ |
| 82 | saveChatPaletteState | `saveChatPaletteState(state)` | 7 | ✓ |
| 90 | parseChatPaletteLines | `parseChatPaletteLines(text)` | 6 | ✓ |
| 105 | isChatPaletteHeading | `isChatPaletteHeading(line)` | 3 | ✓ |
| 121 | renderChatPalette | `renderChatPalette({ container, onSend, findTokenByName })` | **320** | ✓ |

## 依存

- import → [[js.character-snapshot]], [[js.file-uploader]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
行の操作は2段階になっている。シングルクリックはパレット内チャット欄へ入れるだけ、ダブルクリックで発言。ダブルクリックは click 2回のあとに来るので「欄に入る→送られる」の順に起きるが、判定用の遅延は入れていない（シングル側が何度起きても無害なため）。この2段階は、押し間違いがそのまま卓へ流れないようにするための作りなので、シングルで送るように戻さないこと。

「//」始まりの行は見出しで、押せる要素にせず色だけ変える。**「//」を消して描かない**のは、編集画面のテキストと一覧の見た目を一致させるため。見出しを増やしたら [[js.main]] の予測変換（updateCommandInputSuggestions）も同じ規則で弾く必要がある。

「初期化」は全タブを捨てて空のタブ1枚へ戻す。取り消しは効かないので、確認文で枚数と「保存しておけば戻せる」ことを出したうえで、フッターの左端（よく押すボタンから離した位置）に置いている。
<!-- /prose:notes -->
