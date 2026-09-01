---
source: js/net-transport-rtc.js
lines: 163
exports: 1
imported_by: 1
api_sha: 10222e6ae39a
prose_sha: 10222e6ae39a
generated: 2026-09-01
tags: [codemap]
---

# js/net-transport-rtc.js

<!-- prose:summary -->
ホスト（GMのタブ）とDataChannelを1本張る、ゲスト側のトランスポート。開いたシグナリングを受け取って使い、大きいメッセージは js/net-chunk.js で組み直す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 36 | fn | createRtcGuestTransport | `createRtcGuestTransport({ signaling, onOpen, onMessage, onClose })` | ホストとのDataChannelを1本張る。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 36 | createRtcGuestTransport | `createRtcGuestTransport({ signaling, onOpen, onMessage, onClose })` | 127 | ✓ |

## 依存

- import → [[js.net-signaling]]
- imported by → [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
