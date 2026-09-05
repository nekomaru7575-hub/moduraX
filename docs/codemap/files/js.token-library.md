---
source: js/token-library.js
lines: 236
exports: 10
imported_by: 2
api_sha: b00953e2c1cc
prose_sha: b00953e2c1cc
generated: 2026-09-04
tags: [codemap]
---

# js/token-library.js

<!-- prose:summary -->
「棚」——コマ作成ツール（character-builder.html）で作ったコマを、このブラウザに 取っておく置き場。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の外のコマ作成ツールで作ったコマを、このブラウザに残しておく置き場（IndexedDB）。棚の読み書きの規則を1か所に集めてある。

js/asset-store.js と作りは似ているが、性質が逆。あちらは他所から取り直せるキャッシュなので古い順に捨てるが、こちらは利用者が作ったどこにも他に無いデータなので**捨てずに断る**。上限に当たったときの断りが例外ではなく戻り値なのは、画面が理由を出せるようにするため。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | const | MAX_LIBRARY_TOKENS | `MAX_LIBRARY_TOKENS` | 棚に置ける数。 |
| 39 | const | MAX_LIBRARY_ENTRY_BYTES | `MAX_LIBRARY_ENTRY_BYTES` | 1件あたりの上限。 |
| 78 | fn | generateLibraryTokenId | `generateLibraryTokenId()` | 棚の1件のid。 |
| 93 | fn | normalizeLibraryEntry | `normalizeLibraryEntry(raw)` | 保存済みの1件を、画面へ出してよい形へ均す。 |
| 123 | fn | buildLibraryEntry | `buildLibraryEntry(token, pluginId, { id = null, savedAt = null } = {})` | コマ（token）と適用プラグインから、棚へ入れる1件を組み立てる。 |
| 140 | fn | listTokenLibrary | `async listTokenLibrary()` | 棚の中身。 |
| 154 | fn | getLibraryToken | `async getLibraryToken(id)` | 1件取り出す。 |
| 170 | fn | saveLibraryToken | `async saveLibraryToken(entry)` | 1件しまう。 |
| 212 | fn | removeLibraryToken | `async removeLibraryToken(id)` | 1件消す。 |
| 228 | fn | estimateEntryBytes | `estimateEntryBytes(entry)` | 1件のおおよそのバイト数。 |

## トップレベル関数（LOCAL TASKS 候補）（11）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 46 | openDb | `openDb()` | 17 |  |
| 64 | tx | `tx(db, mode)` | 3 |  |
| 68 | wrap | `wrap(request)` | 6 |  |
| 78 | generateLibraryTokenId | `generateLibraryTokenId()` | 4 | ✓ |
| 93 | normalizeLibraryEntry | `normalizeLibraryEntry(raw)` | 25 | ✓ |
| 123 | buildLibraryEntry | `buildLibraryEntry(token, pluginId, { id = null, savedAt = null } = {})` | 12 | ✓ |
| 140 | listTokenLibrary | `async listTokenLibrary()` | 12 | ✓ |
| 154 | getLibraryToken | `async getLibraryToken(id)` | 9 | ✓ |
| 170 | saveLibraryToken | `async saveLibraryToken(entry)` | 40 | ✓ |
| 212 | removeLibraryToken | `async removeLibraryToken(id)` | 10 | ✓ |
| 228 | estimateEntryBytes | `estimateEntryBytes(entry)` | 8 | ✓ |

## 依存

- import → [[js.character-snapshot]]
- imported by → [[js.character-builder]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
