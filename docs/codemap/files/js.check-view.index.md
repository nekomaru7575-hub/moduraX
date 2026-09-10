---
source: js/check-view/index.js
lines: 34
exports: 1
imported_by: 1
api_sha: d767ab6475f7
prose_sha: d767ab6475f7
generated: 2026-09-10
tags: [codemap]
---

# js/check-view/index.js

<!-- prose:summary -->
拡張判定UIのビューの表。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
拡張判定UIのビューの表と、ビューの契約そのもの（契約はファイル冒頭のコメントが正）。判定UIを1つ足す作業は「ビューを1本書く → この表に1行足す → [[js.parameters.registry]] の CHECK_VIEWS に1行足す → プラグインが宣言する」の4つで終わる。器（[[js.check-panel]]）とビューの間にある唯一の結び目。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 30 | const | CHECK_VIEW_FACTORIES | `CHECK_VIEW_FACTORIES` | ビューID → ビューを1つ作る関数。 |

## トップレベル関数（LOCAL TASKS 候補）（0）

なし（`function 名(...) {}` 宣言がトップレベルに無い）。

## 依存

- import → [[js.check-view.dice-draft-view]], [[js.check-view.skill-table-view]]
- imported by → [[js.check-panel]]

## 注意

<!-- prose:notes -->
ビューは**オブジェクトではなく、それを作る関数**を登録する。1つのパネルに1つだけ作られ、「保存しない見た目の状態」をその中に閉じ込めるため。
<!-- /prose:notes -->
