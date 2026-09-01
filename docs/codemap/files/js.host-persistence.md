---
source: js/host-persistence.js
lines: 241
exports: 1
imported_by: 1
api_sha: 41e4d0e4d399
prose_sha: 41e4d0e4d399
generated: 2026-09-01
tags: [codemap]
---

# js/host-persistence.js

<!-- prose:summary -->
P2P卓の永続化。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 73 | fn | startHostPersistence | `startHostPersistence({ send, seedState = null })` | ホストの控えの送信を始める。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 54 | gzipToBase64 | `async gzipToBase64(json)` | 10 |  |
| 73 | startHostPersistence | `startHostPersistence({ send, seedState = null })` | 168 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.asset-store]], [[js.game-store]], [[js.net-host-rules]]
- imported by → [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
