---
source: js/ice-probe.js
lines: 201
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-10
tags: [codemap]
---

# js/ice-probe.js

<!-- prose:summary -->
「この回線からP2Pの部屋に入れるか」を、相手を用意せずに1台だけで測る道具（/ice-probe.html）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
P2P卓が自分の回線から使えるかを、**相手を1人も用意せずに**測るページ（/ice-probe.html）の中身。docs/p2p-migration-notes.md の5-2に「未検証・最大のリスク」として残っていたTURNの話を、「1台で測れる部分」と「人を集めないと出ない部分」に分けたうちの前者を担う。候補を集めるだけで接続はしない——同じ機械の2つの RTCPeerConnection を繋いでもどんなNATでも成功するので、証拠にならないため。判定は [[js.ice-probe-rules]]、盤面が実際に使う設定は [[js.net-signaling]] の ICE_SERVERS から読む（中継のみで張れるかを、本番と同じ設定で試すため）。**結果はどこへも送らない**。貼って返すための一行にグローバルIPを載せないのは、判定に住所そのものを使っていないから。
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | gather | `gather(config)` | 48 |  |
| 96 | line | `line(text, cls = '')` | 6 |  |
| 103 | table | `table(rows)` | 13 |  |
| 117 | run | `async run()` | 72 |  |

## 依存

- import → [[js.ice-probe-rules]], [[js.net-signaling]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
