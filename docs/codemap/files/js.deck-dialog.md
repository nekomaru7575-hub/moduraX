---
source: js/deck-dialog.js
lines: 347
exports: 3
imported_by: 1
api_sha: e12f1a14154e
prose_sha: 1585fdf1fe8e
generated: 2026-08-26
tags: [codemap]
---

# js/deck-dialog.js

<!-- prose:summary -->
カードとデッキのダイアログ3種：デッキを盤面に置くとき、「何枚引くか」を決めるとき、 裏向きのカードを自分だけ確認するとき（カードを見る）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面のカードを操作する小さなダイアログ2種（裏向きのカードを自分だけ確認する「カードを見る」と、何枚引くかの入力）。[[js.panel-dialog]]と同じ構えで、<dialog>を1枚だけ作って使い回す。デッキの作成・一覧・配置は[[js.deck-list-dialog]]と[[js.deck-editor-dialog]]が持つ。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 38 | fn | showCardPeekDialog | `showCardPeekDialog({ face })` | 「カードを見る」で表面を自分だけ確認するダイアログ。 |
| 114 | fn | showDrawCountDialog | `showDrawCountDialog({ max, stockers, onConfirm })` | 「何枚・どこへ引くか」の入力ダイアログ。 |
| 227 | fn | showStockerSendDialog | `showStockerSendDialog({ cards, stockers, onConfirm })` | ストッカー内のカードから送るものをチェックボックスで選び、別のストッカーか出身デッキへ まとめて送る。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 13 | ensureDialog | `ensureDialog()` | 7 |  |
| 21 | formGroup | `formGroup(labelText, title = '')` | 9 |  |
| 38 | showCardPeekDialog | `showCardPeekDialog({ face })` | 64 | ✓ |
| 114 | showDrawCountDialog | `showDrawCountDialog({ max, stockers, onConfirm })` | 101 | ✓ |
| 227 | showStockerSendDialog | `showStockerSendDialog({ cards, stockers, onConfirm })` | 120 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
