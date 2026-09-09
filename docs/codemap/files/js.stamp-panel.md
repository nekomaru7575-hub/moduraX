---
source: js/stamp-panel.js
lines: 220
exports: 1
imported_by: 1
api_sha: 0b975953358f
prose_sha: 0b975953358f
generated: 2026-09-09
tags: [codemap]
---

# js/stamp-panel.js

<!-- prose:summary -->
「スタンプ送信」：使えるスタンプを画像で並べ、押すとその場で送る浮動パネル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
使えるスタンプを画像で並べ、押すとその場で送る浮動パネル（[[js.floating-panel]]）。既定は非表示で、盤外の右クリックメニュー（[[js.board-data-driven]] へ setStampPanelController で実体を注入）から出す。並べる顔ぶれは [[js.stamp-registry]] が返すもので、部屋の適用プラグインが変わったら組み直す。送信自体は [[js.stamp-layer]] の requestStamp を通す。連打よけの上限（server/index.js の allowStamp）に当たっても**ボタンは止めない**——上限は「盤面がスタンプで埋まらないための表示側の都合」であって、押した回数まで無かったことにしたいわけではないため、超えたぶんは盤面に出ないだけにしてある。名乗っていない人だけは、サーバーがスタンプを捨てるうえに集計先も無いので、ボタンを止めて理由を出す。グリッドの下には誰が何枚出したかの集計（[[js.game-store]] の COUNT_STAMP・stampCounts）を出し、GMだけが押せる「集計をリセット」（RESET_STAMP_COUNTS）を添える。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 36 | fn | initStampPanel | `initStampPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 36 | initStampPanel | `initStampPanel()` | 184 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.floating-panel]], [[js.local-identity]], [[js.room-authority]], [[js.stamp-layer]], [[js.stamp-registry]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
