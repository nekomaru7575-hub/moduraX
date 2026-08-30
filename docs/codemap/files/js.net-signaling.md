---
source: js/net-signaling.js
lines: 107
exports: 2
imported_by: 2
api_sha: 2e4018a8c221
prose_sha: 2e4018a8c221
generated: 2026-08-30
tags: [codemap]
---

# js/net-signaling.js

<!-- prose:summary -->
WebRTCで相手を見つけるための、サーバーを経由した細い口。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 32 | fn | createSignaling | `createSignaling({ host, onWelcome, onSignal, onServerInit, onClose })` |  |
| 106 | const | ICE_SERVERS | `ICE_SERVERS` | 公開STUN。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 32 | createSignaling | `createSignaling({ host, onWelcome, onSignal, onServerInit, onClose })` | 71 | ✓ |

## 依存

- import → [[js.net-transport-ws]], [[js.untrusted-json]]
- imported by → [[js.net-host]], [[js.net-transport-rtc]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
