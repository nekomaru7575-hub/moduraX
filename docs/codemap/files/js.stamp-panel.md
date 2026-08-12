---
source: js/stamp-panel.js
lines: 163
exports: 1
imported_by: 1
api_sha: 0b975953358f
prose_sha: 0b975953358f
generated: 2026-08-12
tags: [codemap]
---

# js/stamp-panel.js

<!-- prose:summary -->
「スタンプ送信」：使えるスタンプを画像で並べ、押すとその場で送る浮動パネル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
使えるスタンプを画像で並べ、押すとその場で送る浮動パネル（[[js.floating-panel]]）。既定は非表示で、盤外の右クリックメニュー（[[js.board-data-driven]] へ setStampPanelController で実体を注入）から出す。並べる顔ぶれは [[js.stamp-registry]] が返すもので、部屋の適用プラグインが変わったら組み直す。送信自体は [[js.stamp-layer]] の requestStamp を通す。連打よけの上限（[[js.stamp-catalog]] の STAMP_RATE_LIMIT）を画面側でも数えているのは、サーバーが上限超過を黙って捨てるため——押しても無反応だと壊れて見えるので、押せない間はボタンを止めて残り秒数を出す（判定の権威はサーバー側で、こちらは案内の写し）。名乗っていない人はサーバーが弾くので、同じくボタンを止めて理由を出す。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | fn | initStampPanel | `initStampPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 31 | initStampPanel | `initStampPanel()` | 132 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.floating-panel]], [[js.local-identity]], [[js.stamp-catalog]], [[js.stamp-layer]], [[js.stamp-registry]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
