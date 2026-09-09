---
source: js/character-builder.js
lines: 481
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-09
tags: [codemap]
---

# js/character-builder.js

<!-- prose:summary -->
部屋を作らずに、外部キャラクターシートツール（ゆとシート等）のJSON、または 本アプリのコマ丸ごとスナップショットJSONを読み込んで編集し、スナップショット JSONとして書き出す「コマ作成ツール」ページのロジック。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
character-builder.html 専用のエントリポイント。部屋を作らずにコマ1体を作り込み、スナップショット JSON として書き出すためのページで、WebSocket 同期には一切関与しない。ダイアログとスナップショット形式は本体と同じモジュールを共有している。
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 57 | setNotice | `setNotice(kind, text)` | 3 |  |
| 63 | resolveImport | `resolveImport(pluginId, json)` | 5 |  |
| 71 | detectPluginFromSnapshot | `detectPluginFromSnapshot(snapshot)` | 5 |  |
| 77 | pluginLabelOf | `pluginLabelOf(pluginId)` | 4 |  |
| 82 | formatDate | `formatDate(ms)` | 5 |  |
| 92 | reloadLibrary | `async reloadLibrary()` | 5 |  |
| 98 | render | `render()` | 5 |  |
| 106 | buildCreateCard | `buildCreateCard()` | 111 |  |
| 219 | buildShelf | `buildShelf()` | 60 |  |
| 283 | buildShelfCard | `buildShelfCard(entry)` | 50 |  |
| 334 | buildCardMenu | `buildCardMenu(entry)` | 17 |  |
| 359 | startNew | `startNew(pluginId)` | 6 |  |
| 366 | startEditing | `startEditing(pluginId, json, errorEl)` | 30 |  |
| 398 | startEditingLibraryEntry | `startEditingLibraryEntry(entry)` | 7 |  |
| 411 | duplicateEntry | `async duplicateEntry(entry)` | 9 |  |
| 421 | openEditDialog | `openEditDialog()` | 52 |  |

## 依存

- import → [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.context-menu]], [[js.file-uploader]], [[js.game-store]], [[js.icons]], [[js.parameters.registry]], [[js.pwa]], [[js.token-library]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
