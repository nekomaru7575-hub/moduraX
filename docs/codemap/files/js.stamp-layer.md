---
source: js/stamp-layer.js
lines: 138
exports: 2
imported_by: 2
api_sha: 592ee42af932
prose_sha: 592ee42af932
generated: 2026-08-12
tags: [codemap]
---

# js/stamp-layer.js

<!-- prose:summary -->
スタンプの表示レイヤー。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 128 | fn | requestStamp | `requestStamp(stampId)` | スタンプを送る。 |
| 132 | fn | initStampLayer | `initStampLayer()` |  |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 34 | pickColumnIndex | `pickColumnIndex()` | 7 |  |
| 43 | claimColumn | `claimColumn(participantId)` | 18 |  |
| 63 | removeItem | `removeItem(participantId, item)` | 7 |  |
| 73 | buildStampElement | `buildStampElement(stamp, name)` | 26 |  |
| 101 | showStamp | `showStamp({ stampId, participantId, name })` | 21 |  |
| 128 | requestStamp | `requestStamp(stampId)` | 3 | ✓ |
| 132 | initStampLayer | `initStampLayer()` | 6 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.net-sync]], [[js.stamp-registry]]
- imported by → [[js.main]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
