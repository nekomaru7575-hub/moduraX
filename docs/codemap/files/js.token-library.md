---
source: js/token-library.js
lines: 285
exports: 13
imported_by: 2
api_sha: 61b32d32b43b
prose_sha: 61b32d32b43b
generated: 2026-09-09
tags: [codemap]
---

# js/token-library.js

<!-- prose:summary -->
「棚」——コマ作成ツール（character-builder.html）で作ったコマを、このブラウザに 取っておく置き場。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の外のコマ作成ツールで作ったコマを、このブラウザに残しておく置き場（IndexedDB）。棚の読み書きの規則を1か所に集めてある。

部屋のコマと棚のコマはidで繋がらない（棚のidを部屋の状態へ入れると、棚を持たない他の参加者にも配られてしまう）。バックヤードから棚へ戻すときの「これは前に保存したあのコマだ」は、名前とシステムの一致で見る（findOverwritableLibraryEntries）。均し方が食い違うと静かに同名が増えるので、保存も読み出しも突き合わせも toLibraryName を通す。

js/asset-store.js と作りは似ているが、性質が逆。あちらは他所から取り直せるキャッシュなので古い順に捨てるが、こちらは利用者が作ったどこにも他に無いデータなので**捨てずに断る**。上限に当たったときの断りが例外ではなく戻り値なのは、画面が理由を出せるようにするため。
<!-- /prose:role -->

## export（13）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 35 | const | MAX_LIBRARY_TOKENS | `MAX_LIBRARY_TOKENS` | 棚に置ける数。 |
| 40 | const | MAX_LIBRARY_ENTRY_BYTES | `MAX_LIBRARY_ENTRY_BYTES` | 1件あたりの上限。 |
| 49 | fn | toLibraryName | `toLibraryName(raw)` | 棚に並べる名前へ均す。 |
| 67 | fn | findOverwritableLibraryEntries | `findOverwritableLibraryEntries(entries, name, pluginId)` | 棚の中から「同じコマの前の版」とみなせるものを探す。 |
| 108 | fn | generateLibraryTokenId | `generateLibraryTokenId()` | 棚の1件のid。 |
| 123 | fn | normalizeLibraryEntry | `normalizeLibraryEntry(raw)` | 保存済みの1件を、画面へ出してよい形へ均す。 |
| 152 | fn | buildLibraryEntry | `buildLibraryEntry(token, pluginId, { id = null, savedAt = null } = {})` | コマ（token）と適用プラグインから、棚へ入れる1件を組み立てる。 |
| 179 | fn | canBringIntoRoom | `canBringIntoRoom(entry, roomPluginId)` | 棚の1件を、この部屋へ持ち込んでよいか。 |
| 189 | fn | listTokenLibrary | `async listTokenLibrary()` | 棚の中身。 |
| 203 | fn | getLibraryToken | `async getLibraryToken(id)` | 1件取り出す。 |
| 219 | fn | saveLibraryToken | `async saveLibraryToken(entry)` | 1件しまう。 |
| 261 | fn | removeLibraryToken | `async removeLibraryToken(id)` | 1件消す。 |
| 277 | fn | estimateEntryBytes | `estimateEntryBytes(entry)` | 1件のおおよそのバイト数。 |

## トップレベル関数（LOCAL TASKS 候補）（14）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 49 | toLibraryName | `toLibraryName(raw)` | 3 | ✓ |
| 67 | findOverwritableLibraryEntries | `findOverwritableLibraryEntries(entries, name, pluginId)` | 6 | ✓ |
| 76 | openDb | `openDb()` | 17 |  |
| 94 | tx | `tx(db, mode)` | 3 |  |
| 98 | wrap | `wrap(request)` | 6 |  |
| 108 | generateLibraryTokenId | `generateLibraryTokenId()` | 4 | ✓ |
| 123 | normalizeLibraryEntry | `normalizeLibraryEntry(raw)` | 24 | ✓ |
| 152 | buildLibraryEntry | `buildLibraryEntry(token, pluginId, { id = null, savedAt = null } = {})` | 12 | ✓ |
| 179 | canBringIntoRoom | `canBringIntoRoom(entry, roomPluginId)` | 5 | ✓ |
| 189 | listTokenLibrary | `async listTokenLibrary()` | 12 | ✓ |
| 203 | getLibraryToken | `async getLibraryToken(id)` | 9 | ✓ |
| 219 | saveLibraryToken | `async saveLibraryToken(entry)` | 40 | ✓ |
| 261 | removeLibraryToken | `async removeLibraryToken(id)` | 10 | ✓ |
| 277 | estimateEntryBytes | `estimateEntryBytes(entry)` | 8 | ✓ |

## 依存

- import → [[js.character-snapshot]]
- imported by → [[js.character-builder]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
