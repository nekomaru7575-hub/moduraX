---
source: js/card-catalog.js
lines: 154
exports: 7
imported_by: 2
api_sha: 9ea68ff87dc2
prose_sha: 4aee9a6ab821
generated: 2026-08-27
tags: [codemap]
---

# js/card-catalog.js

<!-- prose:summary -->
「盤面に置けるカードの束（デッキ）」の既定の中身を持つ表。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
組み込みの簡易トランプ（4スート×13枚＋ジョーカー）の中身と、カード画像のURLの組み立て、そしてユーザーが作ったデッキ定義（room.deckTemplates）を実際の札へ展開する expandDeckTemplate を持つ純データ層。[[js.stamp-catalog]]と同じくDOM/windowには触れない。画像パスは規則（card_<スート>_<2桁>.png）から組み立てるだけで、表の側にパス文字列を書かせない（[[js.stamp-registry]]の「URLは受け取った側が組み立てる」と同じ約束）。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | CARD_IMAGE_DIR | `CARD_IMAGE_DIR` | トランプ画像の置き場。 |
| 50 | fn | trumpBack | `trumpBack()` | デッキの既定の裏面（差し替えはデッキ配置ダイアログから）。 |
| 72 | fn | buildSimpleTrumpDeck | `buildSimpleTrumpDeck({ jokers = 1 } = {})` | 簡易トランプ1組。 |
| 93 | const | DECK_TEMPLATES | `DECK_TEMPLATES` | 組み込みのデッキ（この部屋で何も作らなくても置けるもの）。 |
| 106 | fn | findDeckTemplate | `findDeckTemplate(id)` |  |
| 122 | fn | expandDeckTemplate | `expandDeckTemplate(template, generateId, max = 200)` | ユーザーが作ったデッキの定義（room.deckTemplates の1件）を、実際の札の並びへ展開する。 |
| 148 | fn | countDeckTemplateCards | `countDeckTemplateCards(template)` | 定義から作られる札の合計枚数（展開せずに数えるだけ）。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 43 | cardImageUrl | `cardImageUrl(fileName)` | 3 |  |
| 50 | trumpBack | `trumpBack()` | 3 | ✓ |
| 54 | trumpFace | `trumpFace(suit, rank)` | 8 |  |
| 63 | jokerFace | `jokerFace()` | 3 |  |
| 72 | buildSimpleTrumpDeck | `buildSimpleTrumpDeck({ jokers = 1 } = {})` | 15 | ✓ |
| 106 | findDeckTemplate | `findDeckTemplate(id)` | 3 | ✓ |
| 122 | expandDeckTemplate | `expandDeckTemplate(template, generateId, max = 200)` | 21 | ✓ |
| 148 | countDeckTemplateCards | `countDeckTemplateCards(template)` | 6 | ✓ |

## 依存

- import → [[js.asset-base]]
- imported by → [[js.deck-editor-dialog]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
