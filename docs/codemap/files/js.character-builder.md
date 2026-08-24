---
source: js/character-builder.js
lines: 242
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-08-24
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

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 36 | resolveImport | `resolveImport(pluginId, json)` | 5 |  |
| 44 | detectPluginFromSnapshot | `detectPluginFromSnapshot(snapshot)` | 5 |  |
| 50 | renderLandingForm | `renderLandingForm()` | 92 |  |
| 143 | startEditing | `startEditing(pluginId, json, errorEl)` | 29 |  |
| 173 | openEditDialog | `openEditDialog(pluginId)` | 28 |  |
| 202 | renderPostSaveActions | `renderPostSaveActions(pluginId, name)` | 34 |  |

## 依存

- import → [[js.character-dialog]], [[js.character-json-import]], [[js.character-sheet-import]], [[js.character-snapshot]], [[js.file-uploader]], [[js.game-store]], [[js.parameters.registry]], [[js.pwa]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
