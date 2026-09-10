---
source: js/ice-probe-rules.js
lines: 188
exports: 5
imported_by: 1
api_sha: ba35cb2d1fbe
prose_sha: ba35cb2d1fbe
generated: 2026-09-10
tags: [codemap]
---

# js/ice-probe-rules.js

<!-- prose:summary -->
「この回線からP2Pが張れるか」の判定そのもの。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「この回線からP2Pが張れるか」の判定そのもの。[[js.ice-probe]] は RTCPeerConnection と DOM に触るのでNodeから読めないため、「集めた候補をどう読むか」だけをここへ分けてある（分け方は [[js.net-host-rules]]・[[js.room-authority-rules]] と同じ流儀）。読み違えると**結論が逆になる**のがこの判定の性質で、TURNが要る回線を「大丈夫」と言えば当日に繋がらない人が出るし、逆に全員へ「要る」と言えば要らない中継の費用を払うことになる。見分けているのはNATが宛先ごとに穴を変えるかどうかで、同じ足元（relatedPort）から2つのSTUNへ聞いた結果を突き合わせる。**ブラウザは同じ候補を重複として畳む**ので、「答えが1件だけ」を正しく読むには「単独では両方届く」ことを別に確かめて渡す必要がある（reachableServers）。DOM・window・RTCPeerConnection には一切触れないこと。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 33 | fn | countCandidateTypes | `countCandidateTypes(candidates)` | 候補の種類ごとの数を数える。 |
| 61 | fn | classifyNatMapping | `classifyNatMapping(candidates, { reachableServers = 0 } = {})` | NATの穴の開け方を見分ける。 |
| 122 | fn | verdictSummary | `verdictSummary(verdict, hasTurn)` | 判定を、そのまま人に見せる文にする。 |
| 162 | fn | shareableLine | `shareableLine({ verdict, counts, gatherMs, relayWorked, userAgentHint })` | 人に貼って返してもらうための一行。 |
| 179 | fn | browserHint | `browserHint(userAgent)` | ブラウザ名をおおまかに拾う。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 33 | countCandidateTypes | `countCandidateTypes(candidates)` | 9 | ✓ |
| 61 | classifyNatMapping | `classifyNatMapping(candidates, { reachableServers = 0 } = {})` | 55 | ✓ |
| 122 | verdictSummary | `verdictSummary(verdict, hasTurn)` | 34 | ✓ |
| 162 | shareableLine | `shareableLine({ verdict, counts, gatherMs, relayWorked, userAgentHint })` | 12 | ✓ |
| 179 | browserHint | `browserHint(userAgent)` | 9 | ✓ |

## 依存

- import → なし
- imported by → [[js.ice-probe]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
