---
source: js/deck-dialog.js
lines: 157
exports: 2
imported_by: 1
api_sha: 1585fdf1fe8e
prose_sha: 1585fdf1fe8e
generated: 2026-08-18
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

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 37 | fn | showCardPeekDialog | `showCardPeekDialog({ face })` | 「カードを見る」で表面を自分だけ確認するダイアログ。 |
| 106 | fn | showDrawCountDialog | `showDrawCountDialog({ faceUp, max, onConfirm })` | 「何枚引くか」の入力ダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 12 | ensureDialog | `ensureDialog()` | 7 |  |
| 20 | formGroup | `formGroup(labelText, title = '')` | 9 |  |
| 37 | showCardPeekDialog | `showCardPeekDialog({ face })` | 64 | ✓ |
| 106 | showDrawCountDialog | `showDrawCountDialog({ faceUp, max, onConfirm })` | 51 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
