---
source: js/net-host-rules.js
lines: 164
exports: 8
imported_by: 3
api_sha: f4cf71bf19fd
prose_sha: f4cf71bf19fd
generated: 2026-09-01
tags: [codemap]
---

# js/net-host-rules.js

<!-- prose:summary -->
ホスト権威P2Pのホスト役（js/net-host.js）が使う判定そのもの。連打よけ・記入中の集計・入室メッセージの重複判定・保存の先送り。サーバーと共有する上限もここに置く。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | MESSAGE_RATE_LIMIT | `MESSAGE_RATE_LIMIT` | 1つの接続（ホストから見ればピア1人）が窓の中で送ってよいメッセージ数。 |
| 38 | const | SAVE_POLICY | `SAVE_POLICY` | 保存を先送りする間隔と、先送りし続ける上限。 |
| 49 | fn | nextSaveDelay | `nextSaveDelay({ now, deadline, policy = SAVE_POLICY })` | 次に保存するまでの待ち時間を決める。 |
| 66 | const | MAX_IDENTIFY_PER_PEER | `MAX_IDENTIFY_PER_PEER` | 1つの接続が名乗ってよい回数。 |
| 75 | fn | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 窓を区切って数える流量制限（server/index.jsのexceedsMessageRateの移植）。 |
| 101 | fn | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 直近の窓を滑らせて数える流量制限（server/index.jsのallowStampの移植）。 |
| 129 | fn | typingUsersFrom | `typingUsersFrom(members)` | 「記入中」の一覧を、いま繋がっている面々から組み立てる。 |
| 155 | fn | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 名乗りを受けて入室メッセージを出すか（server/index.jsのIDENTIFY内の判定の移植）。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 49 | nextSaveDelay | `nextSaveDelay({ now, deadline, policy = SAVE_POLICY })` | 5 | ✓ |
| 75 | createFixedWindowLimiter | `createFixedWindowLimiter({ windowMs, max })` | 18 | ✓ |
| 101 | createSlidingWindowLimiter | `createSlidingWindowLimiter({ windowMs, max })` | 13 | ✓ |
| 129 | typingUsersFrom | `typingUsersFrom(members)` | 9 | ✓ |
| 155 | entryMessageDecision | `entryMessageDecision({ enabled, alreadyDecided, participantId, otherParticipantIds })` | 9 | ✓ |

## 依存

- import → なし
- imported by → [[js.host-persistence]], [[js.net-host]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
