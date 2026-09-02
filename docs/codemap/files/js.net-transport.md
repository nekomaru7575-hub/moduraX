---
source: js/net-transport.js
lines: 59
exports: 3
imported_by: 5
api_sha: 4f9dbcf010d1
prose_sha: 4f9dbcf010d1
generated: 2026-09-02
tags: [codemap]
---

# js/net-transport.js

<!-- prose:summary -->
「同期のメッセージを運ぶ道」の契約と、切断の理由。どちらを使うかは決めない（P2P卓の組み立ては役割が決まってからなので js/net-sync.js にある）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | const | CLOSE_CODES | `CLOSE_CODES` | 切断の理由。 |
| 48 | fn | isP2pMode | `isP2pMode()` | この画面がP2P卓として振る舞うか。 |
| 56 | fn | createTransport | `createTransport(handlers)` | 従来どおりのWebSocketの道を1本作る。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | isP2pMode | `isP2pMode()` | 3 | ✓ |
| 56 | createTransport | `createTransport(handlers)` | 3 | ✓ |

## 依存

- import → [[js.net-transport-ws]]
- imported by → [[js.audio-dialog]], [[js.image-upload]], [[js.main]], [[js.net-host]], [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
