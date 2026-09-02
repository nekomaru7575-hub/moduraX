---
source: server/bcdice-cache-rules.js
lines: 106
exports: 5
imported_by: 1
api_sha: 36f0306dc1ea
prose_sha: 36f0306dc1ea
generated: 2026-09-02
tags: [codemap]
---

# server/bcdice-cache-rules.js

<!-- prose:summary -->
BCDiceの中継キャッシュ（server/index.jsのloadBcdiceCached）の判断そのもの。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
BCDiceの中継キャッシュ（[[server.index]] の `loadBcdiceCached`）が、上流へ問い合わせる前後にする判断だけを切り出した純粋モジュール。時計もネットワークもRedisも触らない。**ここは一度間違えている**：上流の4xxをまとめて「そのシステムは存在しない」として1時間覚えていたため、403（弾かれた）や429（叩きすぎ）を受けると、そのシステムだけダイス判定が1時間効かなくなっていた。時間で直るので原因に辿り着けない壊れ方をする。紛らわしいのは、広く取ること自体は誤りではなかったこと——BCDiceは実在しないIDに404ではなく**400**を返すので、404だけに絞ると「無い」を1件も覚えられない。境目は数字の大小ではなく「上流がそのIDについて答えたのか、こちらを門前払いしたのか」にある。あわせて『いまは取れない』の短い休み（`UNAVAILABLE_COOLDOWN_MS`）を持つ：403/429を「無い」から外した以上、何も持たないと**弾かれている間ほど上流を叩き続ける**ことになる。休みを立てても持っている中身は捨てない（上流の不調でヘルプもコマンド判定も失われる方が困る）。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | const | MISS_CACHE_MS | `MISS_CACHE_MS` | 「そのシステムは無い」と覚えておく時間。 |
| 28 | const | UNAVAILABLE_COOLDOWN_MS | `UNAVAILABLE_COOLDOWN_MS` | 上流が「無い」とは言っていないのに取れなかったとき、次に叩きに行くまで待つ時間。 |
| 48 | fn | meansMissing | `meansMissing(status)` | その答えは「そのシステムが実在しない」を意味するか。 |
| 66 | fn | decideCacheRead | `decideCacheRead({ cached, now, cacheMs })` | 覚えている記録を見て、上流へ行く前に何をするか決める。 |
| 95 | fn | buildUnavailableEntry | `buildUnavailableEntry({ cached, now, reason })` | 取れなかったときに覚える記録を組み立てる。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | meansMissing | `meansMissing(status)` | 3 | ✓ |
| 66 | decideCacheRead | `decideCacheRead({ cached, now, cacheMs })` | 21 | ✓ |
| 95 | buildUnavailableEntry | `buildUnavailableEntry({ cached, now, reason })` | 11 | ✓ |

## 依存

- import → なし
- imported by → [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
