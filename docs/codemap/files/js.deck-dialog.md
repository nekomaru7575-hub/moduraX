---
source: js/deck-dialog.js
lines: 317
exports: 3
imported_by: 1
api_sha: e12f1a14154e
prose_sha: e12f1a14154e
generated: 2026-08-28
tags: [codemap]
---

# js/deck-dialog.js

<!-- prose:summary -->
盤面のカードを操作する小さなダイアログ3種：裏向きのカードを自分だけ確認する／何枚どこへ引くか／ストッカーのカードを送る。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面のカードを操作する小さなダイアログ3種を持つ。裏向きのカードを自分だけ確認する`showCardPeekDialog`、何枚をどのストッカーへ引くかを決める `showDrawCountDialog`、ストッカー内のカードを別のストッカーか出身デッキへまとめて送る `showStockerSendDialog`。いずれも[[js.panel-dialog]]と同じ構えで、`<dialog>`を1枚だけ作って使い回し、結果は`onConfirm`で返す。

**デッキそのものは扱わない。** 作成・一覧・盤面への配置は[[js.deck-list-dialog]]と[[js.deck-editor-dialog]]が持ち（ルームメニューの「デッキ一覧」から開く）、ここを開く導線は[[js.board-data-driven]]の右クリックメニューだけ。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 32 | fn | showCardPeekDialog | `showCardPeekDialog({ face })` | 「カードを見る」で表面を自分だけ確認するダイアログ。 |
| 108 | fn | showDrawCountDialog | `showDrawCountDialog({ max, stockers, onConfirm })` | 「何枚・どこへ引くか」の入力ダイアログ。 |
| 209 | fn | showStockerSendDialog | `showStockerSendDialog({ cards, stockers, onConfirm })` | ストッカー内のカードから送るものをチェックボックスで選び、別のストッカーか出身デッキへ まとめて送る。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 15 | formGroup | `formGroup(labelText, title = '')` | 9 |  |
| 32 | showCardPeekDialog | `showCardPeekDialog({ face })` | 64 | ✓ |
| 108 | showDrawCountDialog | `showDrawCountDialog({ max, stockers, onConfirm })` | 89 | ✓ |
| 209 | showStockerSendDialog | `showStockerSendDialog({ cards, stockers, onConfirm })` | 108 | ✓ |

## 依存

- import → [[js.dialog-host]]
- imported by → [[js.board-data-driven]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
