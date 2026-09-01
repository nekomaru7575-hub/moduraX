---
source: js/net-host-rules.js
lines: 136
exports: 6
imported_by: 2
api_sha: bf1d984b5bc6
prose_sha: bf1d984b5bc6
generated: 2026-09-01
tags: [codemap]
---

# js/net-host-rules.js

<!-- prose:summary -->
ホスト権威P2Pのホスト役（js/net-host.js）が使う判定そのもの。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | MESSAGE_RATE_LIMIT | `MESSAGE_RATE_LIMIT` | 1つの接続（ホストから見ればピア1人）が窓の中で送ってよいメッセージ数。 |
| 38 | const | MAX_IDENTIFY_PER_PEER | `MAX_IDENTIFY_PER_PEER` | 1つの接続が名乗ってよい回数。 |
| 47 | fn | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 窓を区切って数える流量制限（server/index.jsのexceedsMessageRateの移植）。 |
| 73 | fn | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 直近の窓を滑らせて数える流量制限（server/index.jsのallowStampの移植）。 |
| 101 | fn | typingUsersFrom | `typingUsersFrom(members)` | 「記入中」の一覧を、いま繋がっている面々から組み立てる。 |
| 127 | fn | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 名乗りを受けて入室メッセージを出すか（server/index.jsのIDENTIFY内の判定の移植）。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 18 | ✓ |
| 73 | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 13 | ✓ |
| 101 | typingUsersFrom | `typingUsersFrom(members)` | 9 | ✓ |
| 127 | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 9 | ✓ |

## 依存

- import → なし
- imported by → [[js.net-host]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
