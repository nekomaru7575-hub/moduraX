---
source: js/token-library-dialog.js
lines: 180
exports: 1
imported_by: 1
api_sha: 989036ee9940
prose_sha: 989036ee9940
generated: 2026-09-04
tags: [codemap]
---

# js/token-library-dialog.js

<!-- prose:summary -->
「保存したコマから追加」——部屋の外のコマ作成ツールで作って棚（js/token-library.js）に 残したコマを、この部屋のバックヤードへ引き込む。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
棚（js/token-library.js）から選んで、この部屋のバックヤードへ引き込むダイアログ。キャラクター一覧のバックヤードタブから開く。

引き込みは盤面へJSONを落としたときと同じ2段構え（ADD_CHARACTER → RESTORE_CHARACTER_SNAPSHOT）に、棚入れ（MOVE_TO_BACKYARD）を足したもの。画像の引き取り（adoptImageIntoRoom）を飛ばすと、データURLが部屋の状態に載って以後すべてのアクションで書き直される。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 62 | fn | showTokenLibraryPickerDialog | `async showTokenLibraryPickerDialog({ onDone } = {})` | 棚から選んでこの部屋へ引き込むダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | pluginLabelOf | `pluginLabelOf(pluginId)` | 4 |  |
| 43 | bringIntoRoom | `async bringIntoRoom(entry)` | 14 |  |
| 62 | showTokenLibraryPickerDialog | `async showTokenLibraryPickerDialog({ onDone } = {})` | 118 | ✓ |

## 依存

- import → [[js.board-data-driven]], [[js.dialog-host]], [[js.game-store]], [[js.image-upload]], [[js.local-identity]], [[js.parameters.registry]], [[js.token-library]]
- imported by → [[js.character-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
