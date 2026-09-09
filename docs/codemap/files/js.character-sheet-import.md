---
source: js/character-sheet-import.js
lines: 91
exports: 3
imported_by: 2
api_sha: d4f9b5c27c47
prose_sha: d4f9b5c27c47
generated: 2026-09-09
tags: [codemap]
---

# js/character-sheet-import.js

<!-- prose:summary -->
「キャラクターシートのURLから取り込む」の共通部分。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | fn | extractSheetKey | `extractSheetKey(source, rawUrl)` | 貼られたURLから、そのサービスのシートのキーを取り出す。 |
| 49 | fn | fetchCharacterSheetJson | `async fetchCharacterSheetJson(pluginId, key)` | サーバー経由でシートのJSONを取る。 |
| 74 | fn | promptForCharacterSheetJson | `async promptForCharacterSheetJson(pluginId, source)` | URLを尋ねて、シートのJSONを取ってくるところまで。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 25 | extractSheetKey | `extractSheetKey(source, rawUrl)` | 19 | ✓ |
| 49 | fetchCharacterSheetJson | `async fetchCharacterSheetJson(pluginId, key)` | 16 | ✓ |
| 74 | promptForCharacterSheetJson | `async promptForCharacterSheetJson(pluginId, source)` | 17 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.character-builder]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
