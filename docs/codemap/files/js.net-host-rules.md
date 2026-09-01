---
source: js/net-host-rules.js
lines: 194
exports: 9
imported_by: 3
api_sha: 155cf886cc10
prose_sha: 155cf886cc10
generated: 2026-09-01
tags: [codemap]
---

# js/net-host-rules.js

<!-- prose:summary -->
ホスト権威P2Pのホスト役（js/net-host.js）が使う判定そのもの。連打よけ・記入中の集計・入室メッセージの重複判定・控えを送る間引き。サーバーと共有する上限もここに置く。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
[[js.net-host]] は `store` と `RTCPeerConnection` に触るためNodeから読めず、そのままでは1行もテストできない。連打よけ・記入中の集計・入室メッセージの重複判定はどれも「境界で1つずれる」種類の間違いをする場所なので、環境依存物に触れない判定だけをここへ分けてある（分け方は [[js.room-authority-rules]] と同じ流儀）。もう一つの役割は**写しを増やさないこと**：メッセージ流量の上限（`MESSAGE_RATE_LIMIT`）と控え1回の大きさの上限（`MAX_SNAPSHOT_BYTES`）は [[server.index]] も同じ値を使う必要があり、両方に数字を書けば必ずどちらかがずれる。控えの上限は、圧縮された本文を展開するときの `maxOutputLength` としてサーバーが使う——手前のフレームサイズの門は圧縮後しか見られないので、この値がそのまま「1通で確保させられる領域」の上限になる。DOM・window・store には一切触れないこと。
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | MESSAGE_RATE_LIMIT | `MESSAGE_RATE_LIMIT` | 1つの接続（ホストから見ればピア1人）が窓の中で送ってよいメッセージ数。 |
| 43 | const | SNAPSHOT_INTERVAL_MS | `SNAPSHOT_INTERVAL_MS` | ホストが控えをサーバーへ預ける間隔（js/host-persistence.js）。 |
| 63 | const | MAX_SNAPSHOT_BYTES | `MAX_SNAPSHOT_BYTES` | 控え1回の、**展開したあとの**大きさの上限（js/host-persistence.js／server/index.js）。 |
| 78 | fn | nextSnapshotDelay | `nextSnapshotDelay({ now, lastSentAt, intervalMs = SNAPSHOT_INTERVAL_MS })` | 次に控えを送るまでの待ち時間を決める。 |
| 96 | const | MAX_IDENTIFY_PER_PEER | `MAX_IDENTIFY_PER_PEER` | 1つの接続が名乗ってよい回数。 |
| 105 | fn | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 窓を区切って数える流量制限（server/index.jsのexceedsMessageRateの移植）。 |
| 131 | fn | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 直近の窓を滑らせて数える流量制限（server/index.jsのallowStampの移植）。 |
| 159 | fn | typingUsersFrom | `typingUsersFrom(members)` | 「記入中」の一覧を、いま繋がっている面々から組み立てる。 |
| 185 | fn | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 名乗りを受けて入室メッセージを出すか（server/index.jsのIDENTIFY内の判定の移植）。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 78 | nextSnapshotDelay | `nextSnapshotDelay({ now, lastSentAt, intervalMs = SNAPSHOT_INTERVAL_MS })` | 6 | ✓ |
| 105 | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 18 | ✓ |
| 131 | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 13 | ✓ |
| 159 | typingUsersFrom | `typingUsersFrom(members)` | 9 | ✓ |
| 185 | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 9 | ✓ |

## 依存

- import → なし
- imported by → [[js.host-persistence]], [[js.net-host]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
