---
source: js/net-host.js
lines: 263
exports: 1
imported_by: 1
api_sha: 939c547eebc0
prose_sha: 939c547eebc0
generated: 2026-08-30
tags: [codemap]
---

# js/net-host.js

<!-- prose:summary -->
ホスト権威P2Pの「ホスト役」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | fn | startHost | `startHost({ applyRemote, onSeeded })` | ホスト役を始める。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 46 | startHost | `startHost({ applyRemote, onSeeded })` | **217** | ✓ |

## 依存

- import → [[js.game-store]], [[js.local-identity]], [[js.net-signaling]], [[js.room-authority-rules]], [[js.untrusted-json]]
- imported by → [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
