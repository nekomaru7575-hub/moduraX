---
source: js/deck-dialog.js
lines: 301
exports: 3
imported_by: 2
api_sha: a06672676a6c
prose_sha: a06672676a6c
generated: 2026-08-18
tags: [codemap]
---

# js/deck-dialog.js

<!-- prose:summary -->
カードとデッキのダイアログ3種：デッキを盤面に置くとき、「何枚引くか」を決めるとき、 裏向きのカードを自分だけ確認するとき（カードを見る）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
カードとデッキのダイアログ3種（デッキを配置する／何枚引くか決める／裏向きのカードを自分だけ確認する）。[[js.panel-dialog]]と同じ構えで、<dialog>を1枚だけ作って使い回す。デッキに入れる札のIDをここで発番するのが肝で、reducerで採番すると同じアクションを実行した各クライアントで別々のIDになってしまう（[[js.game-store]]のADD_DECK）。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 52 | fn | showDeckDialog | `showDeckDialog({ onConfirm })` | デッキを盤面に置くダイアログ。 |
| 195 | fn | showCardPeekDialog | `showCardPeekDialog({ face })` | 「カードを見る」で表面を自分だけ確認するダイアログ。 |
| 250 | fn | showDrawCountDialog | `showDrawCountDialog({ faceUp, max, onConfirm })` | 「何枚引くか」の入力ダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 20 | ensureDialog | `ensureDialog()` | 7 |  |
| 28 | formGroup | `formGroup(labelText, title = '')` | 9 |  |
| 40 | buildDeckCards | `buildDeckCards(template, { jokers })` | 3 |  |
| 52 | showDeckDialog | `showDeckDialog({ onConfirm })` | 136 | ✓ |
| 195 | showCardPeekDialog | `showCardPeekDialog({ face })` | 50 | ✓ |
| 250 | showDrawCountDialog | `showDrawCountDialog({ faceUp, max, onConfirm })` | 51 | ✓ |

## 依存

- import → [[js.card-catalog]], [[js.game-store]], [[js.image-upload]]
- imported by → [[js.board-data-driven]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
