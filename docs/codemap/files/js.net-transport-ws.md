---
source: js/net-transport-ws.js
lines: 52
exports: 2
imported_by: 2
api_sha: 694f5a8f3547
prose_sha: 694f5a8f3547
generated: 2026-08-28
tags: [codemap]
---

# js/net-transport-ws.js

<!-- prose:summary -->
js/net-transport.jsの契約を、今までどおりのWebSocketで満たす実装。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | const | WS_URL | `WS_URL` | WebRTCのシグナリング（js/net-signaling.js）も同じ口へ繋ぐので外へ出しておく。 |
| 17 | fn | createWebSocketTransport | `createWebSocketTransport({ onOpen, onMessage, onClose })` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 17 | createWebSocketTransport | `createWebSocketTransport({ onOpen, onMessage, onClose })` | 35 | ✓ |

## 依存

- import → [[js.untrusted-json]]
- imported by → [[js.net-signaling]], [[js.net-transport]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
