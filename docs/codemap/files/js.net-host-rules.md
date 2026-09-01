---
source: js/net-host-rules.js
lines: 174
exports: 8
imported_by: 3
api_sha: ed957f611edc
prose_sha: ed957f611edc
generated: 2026-09-01
tags: [codemap]
---

# js/net-host-rules.js

<!-- prose:summary -->
ホスト権威P2Pのホスト役（js/net-host.js）が使う判定そのもの。連打よけ・記入中の集計・入室メッセージの重複判定・控えを送る間引き。サーバーと共有する上限もここに置く。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | MESSAGE_RATE_LIMIT | `MESSAGE_RATE_LIMIT` | 1つの接続（ホストから見ればピア1人）が窓の中で送ってよいメッセージ数。 |
| 43 | const | SNAPSHOT_INTERVAL_MS | `SNAPSHOT_INTERVAL_MS` | ホストが控えをサーバーへ預ける間隔（js/host-persistence.js）。 |
| 58 | fn | nextSnapshotDelay | `nextSnapshotDelay({ now, lastSentAt, intervalMs = SNAPSHOT_INTERVAL_MS })` | 次に控えを送るまでの待ち時間を決める。 |
| 76 | const | MAX_IDENTIFY_PER_PEER | `MAX_IDENTIFY_PER_PEER` | 1つの接続が名乗ってよい回数。 |
| 85 | fn | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 窓を区切って数える流量制限（server/index.jsのexceedsMessageRateの移植）。 |
| 111 | fn | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 直近の窓を滑らせて数える流量制限（server/index.jsのallowStampの移植）。 |
| 139 | fn | typingUsersFrom | `typingUsersFrom(members)` | 「記入中」の一覧を、いま繋がっている面々から組み立てる。 |
| 165 | fn | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 名乗りを受けて入室メッセージを出すか（server/index.jsのIDENTIFY内の判定の移植）。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 58 | nextSnapshotDelay | `nextSnapshotDelay({ now, lastSentAt, intervalMs = SNAPSHOT_INTERVAL_MS })` | 6 | ✓ |
| 85 | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 18 | ✓ |
| 111 | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 13 | ✓ |
| 139 | typingUsersFrom | `typingUsersFrom(members)` | 9 | ✓ |
| 165 | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 9 | ✓ |

## 依存

- import → なし
- imported by → [[js.host-persistence]], [[js.net-host]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
