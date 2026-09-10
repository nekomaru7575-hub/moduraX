---
source: js/token-library-dialog.js
lines: 402
exports: 2
imported_by: 1
api_sha: dfbea4332463
prose_sha: dfbea4332463
generated: 2026-09-10
tags: [codemap]
---

# js/token-library-dialog.js

<!-- prose:summary -->
「保存したコマから追加」——部屋の外のコマ作成ツールで作って棚（js/token-library.js）に 残したコマを、この部屋のバックヤードへ引き込む。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
棚（[[js.token-library]]）と部屋の行き来をどちらも持つダイアログ。キャラクター一覧のバックヤードタブから開く。往復で越える境界（画像の持ち方・システムの食い違い・棚がこのブラウザだけのものであること）が同じなので1ファイルにまとめてある。

引き込み（棚→バックヤード）は盤面へJSONを落としたときと同じ2段構え（ADD_CHARACTER → RESTORE_CHARACTER_SNAPSHOT）に、棚入れ（MOVE_TO_BACKYARD）を足したもの。画像の引き取り（adoptImageIntoRoom）を飛ばすと、データURLが部屋の状態に載って以後すべてのアクションで書き直される。

送り出し（バックヤード→棚）は写しを取るだけで、部屋のコマは動かさない。画像は逆向きの変換をする：P2P卓の /asset/ 参照は部屋の外では何も指さないのでデータURLへ開き、従来卓のR2のURLは公開ドメインがCORSを返さないため読み出せず、そのまま持たせる（部屋を消すと絵も消えるので画面で断る）。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 76 | fn | showTokenLibraryPickerDialog | `async showTokenLibraryPickerDialog({ onDone } = {})` | 棚から選んでこの部屋へ引き込むダイアログ。 |
| 248 | fn | showTokenLibrarySaveDialog | `async showTokenLibrarySaveDialog({ tokenId, onDone } = {})` | このコマを棚へ入れるダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 33 | pluginLabelOf | `pluginLabelOf(pluginId)` | 4 |  |
| 57 | bringIntoRoom | `async bringIntoRoom(entry)` | 14 |  |
| 76 | showTokenLibraryPickerDialog | `async showTokenLibraryPickerDialog({ onDone } = {})` | 138 | ✓ |
| 229 | imageForShelf | `async imageForShelf(image)` | 6 |  |
| 248 | showTokenLibrarySaveDialog | `async showTokenLibrarySaveDialog({ tokenId, onDone } = {})` | 154 | ✓ |

## 依存

- import → [[js.asset-store]], [[js.board-data-driven]], [[js.dialog-host]], [[js.game-store]], [[js.image-upload]], [[js.local-identity]], [[js.parameters.registry]], [[js.token-library]]
- imported by → [[js.character-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
