---
source: js/store/cards.js
lines: 325
exports: 36
imported_by: 3
api_sha: 4a004b02f4a1
prose_sha: 4a004b02f4a1
generated: 2026-08-28
tags: [codemap]
---

# js/store/cards.js

<!-- prose:summary -->
カード・デッキ・カードストッカーの形を整える処理と、その上限。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（36）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 21 | const | CARD_COLS | `CARD_COLS` | カードの大きさ（マス数）。 |
| 22 | const | CARD_ROWS | `CARD_ROWS` |  |
| 26 | const | DEFAULT_CARD_STACK_ORDER | `DEFAULT_CARD_STACK_ORDER` | カード・デッキの既定の重なり順。 |
| 29 | const | MAX_DRAW_COUNT | `MAX_DRAW_COUNT` | 一度に引ける枚数の上限。 |
| 34 | const | MAX_DECK_CARDS | `MAX_DECK_CARDS` | クライアントが自由に作れるpayload（ADD_DECK・取り込んだ部屋データ）に対する上限。 |
| 37 | const | MAX_CARD_TEXT_LENGTH | `MAX_CARD_TEXT_LENGTH` | カード名（画像が無いときにカードの中央へ出る文字）。 |
| 40 | const | MAX_CARD_INFO_LENGTH | `MAX_CARD_INFO_LENGTH` | カード情報（パネルのテキストと同じ役目。表向きのときだけ読める）。 |
| 41 | const | MAX_CARD_IMAGE_LENGTH | `MAX_CARD_IMAGE_LENGTH` |  |
| 42 | const | MAX_CARD_COLOR_LENGTH | `MAX_CARD_COLOR_LENGTH` |  |
| 44 | const | MAX_CARD_SEEN_BY | `MAX_CARD_SEEN_BY` | 「見た人」(seenBy)の上限。 |
| 48 | const | MAX_DECK_TEMPLATE_ROWS | `MAX_DECK_TEMPLATE_ROWS` | デッキの定義（room.deckTemplates）の上限。 |
| 49 | const | MAX_DECK_TEMPLATE_ROW_COUNT | `MAX_DECK_TEMPLATE_ROW_COUNT` |  |
| 50 | const | MAX_DECK_NAME_LENGTH | `MAX_DECK_NAME_LENGTH` |  |
| 63 | const | MAX_ROOM_DECKS | `MAX_ROOM_DECKS` | 1部屋あたりの総数の上限。 |
| 64 | const | MAX_ROOM_CARDS | `MAX_ROOM_CARDS` |  |
| 65 | const | MAX_DECK_TEMPLATES | `MAX_DECK_TEMPLATES` |  |
| 67 | fn | clampCardText | `clampCardText(value, max)` |  |
| 72 | fn | normalizeCardImage | `normalizeCardImage(image)` | 画像URL。 |
| 82 | fn | normalizeCardFace | `normalizeCardFace(face)` | カードの表面。 |
| 93 | fn | normalizeCardBack | `normalizeCardBack(back)` | カードの裏面。 |
| 101 | fn | normalizeSeenBy | `normalizeSeenBy(seenBy)` |  |
| 109 | fn | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [], stockerId = null, stockerSeq = 0 })` | カード1枚を組み立てる。 |
| 137 | fn | normalizeDeckCards | `normalizeDeckCards(cards)` | デッキが持つ札の並び。 |
| 154 | fn | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` |  |
| 177 | fn | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 保存済み・同期されてきたカード／デッキを、状態へ入れられる形へ均す（hydrate専用）。 |
| 181 | fn | normalizeCardMap | `normalizeCardMap(cards)` |  |
| 192 | fn | withoutLostStockerCards | `withoutLostStockerCards(cards, panels)` | 実在しないパネル（もう箱ではないパネルも含む）を指すstockerIdを外す。 |
| 204 | fn | normalizeDeckMap | `normalizeDeckMap(decks)` |  |
| 219 | fn | buildDeckTemplateCard | `buildDeckTemplateCard(card, index)` | --- デッキの定義（room.deckTemplates） --- 「作り置きの設計図」。 |
| 231 | fn | buildDeckTemplate | `buildDeckTemplate({ id, name = '', back = null, cards = [] })` |  |
| 241 | fn | normalizeDeckTemplateMap | `normalizeDeckTemplateMap(templates)` |  |
| 253 | fn | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 引いたカードの置き場所。 |
| 279 | fn | stockerAllowsUser | `stockerAllowsUser(panel, participantId, localUserId)` | その人がこの箱を使ってよいか。 |
| 287 | fn | nextStockerSeq | `nextStockerSeq(cards)` | 収納の順番。 |
| 292 | fn | listStockerCards | `listStockerCards(cards, panelId)` | ストッカーの中身を、入れた順に取り出す。 |
| 307 | fn | releaseStockerCards | `releaseStockerCards(cards, panel, gridSize)` | 箱の中のカードを盤面へ出す。 |

## トップレベル関数（LOCAL TASKS 候補）（20）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 67 | clampCardText | `clampCardText(value, max)` | 3 | ✓ |
| 72 | normalizeCardImage | `normalizeCardImage(image)` | 4 | ✓ |
| 82 | normalizeCardFace | `normalizeCardFace(face)` | 9 | ✓ |
| 93 | normalizeCardBack | `normalizeCardBack(back)` | 7 | ✓ |
| 101 | normalizeSeenBy | `normalizeSeenBy(seenBy)` | 5 | ✓ |
| 109 | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [], stockerId = null, stockerSeq = 0 })` | 26 | ✓ |
| 137 | normalizeDeckCards | `normalizeDeckCards(cards)` | 16 | ✓ |
| 154 | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` | 17 | ✓ |
| 177 | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 3 | ✓ |
| 181 | normalizeCardMap | `normalizeCardMap(cards)` | 8 | ✓ |
| 192 | withoutLostStockerCards | `withoutLostStockerCards(cards, panels)` | 11 | ✓ |
| 204 | normalizeDeckMap | `normalizeDeckMap(decks)` | 8 | ✓ |
| 219 | buildDeckTemplateCard | `buildDeckTemplateCard(card, index)` | 11 | ✓ |
| 231 | buildDeckTemplate | `buildDeckTemplate({ id, name = '', back = null, cards = [] })` | 9 | ✓ |
| 241 | normalizeDeckTemplateMap | `normalizeDeckTemplateMap(templates)` | 8 | ✓ |
| 253 | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 12 | ✓ |
| 279 | stockerAllowsUser | `stockerAllowsUser(panel, participantId, localUserId)` | 6 | ✓ |
| 287 | nextStockerSeq | `nextStockerSeq(cards)` | 3 | ✓ |
| 292 | listStockerCards | `listStockerCards(cards, panelId)` | 5 | ✓ |
| 307 | releaseStockerCards | `releaseStockerCards(cards, panel, gridSize)` | 18 | ✓ |

## 依存

- import → [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.board]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
