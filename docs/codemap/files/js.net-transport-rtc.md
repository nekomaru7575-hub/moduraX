---
source: js/net-transport-rtc.js
lines: 135
exports: 1
imported_by: 1
api_sha: ac419d711f70
prose_sha: ac419d711f70
generated: 2026-08-26
tags: [codemap]
---

# js/net-transport-rtc.js

<!-- prose:summary -->
js/net-transport.jsの契約を、ホスト役（GMのタブ）とのWebRTC DataChannelで満たす実装。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 23 | fn | createRtcGuestTransport | `createRtcGuestTransport({ onOpen, onMessage, onClose })` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 23 | createRtcGuestTransport | `createRtcGuestTransport({ onOpen, onMessage, onClose })` | 112 | ✓ |

## 依存

- import → [[js.net-signaling]], [[js.untrusted-json]]
- imported by → [[js.net-transport]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
