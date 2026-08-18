---
source: server/memory-budget.js
lines: 179
exports: 6
imported_by: 1
api_sha: 8626f4e566de
prose_sha: 8626f4e566de
generated: 2026-08-18
tags: [codemap]
---

# server/memory-budget.js

<!-- prose:summary -->
重い操作（部屋の取り込み・書き出し・ファイルのアップロード）が使うメモリを、実際に 読み込む前に見積もって予約する。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「今これを受け付けたらプロセスが落ちるか」の判断だけを持つ。判断材料は3つ——コンテナの
メモリ上限（環境変数かcgroupから検出）、今の使用量（`process.memoryUsage()`）、種別ごとの
ピーク倍率（ボディ1バイトあたり何バイト使うかの実測値）。あわせて、重い操作が同時に
何本走ってよいかの枠（既定1本）と、その順番待ちの列もここが持つ。

**HTTPもWebSocketも知らない。** 断り方（503・Retry-After・文面）とどの経路に掛けるかは
[[server.index]] の `withHeavySlot` 側の役目で、ここは「取れた／取れなかった」しか返さない。
実際の読み込み・保存・R2への送信にも一切関わらない。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 53 | const | MEMORY_LIMIT_BYTES | `MEMORY_LIMIT_BYTES` |  |
| 88 | fn | availableBytes | `availableBytes()` | いま重い操作に回せるバイト数（ピーク換算）。 |
| 96 | fn | maxBodyBytesFor | `maxBodyBytesFor(kind)` | いま受け付けられるボディの最大バイト数。 |
| 101 | fn | hasRoomFor | `hasRoomFor(kind, bodyBytes)` | このサイズのボディを扱うだけの余裕があるか（順番待ちには入らない）。 |
| 148 | fn | acquireHeavySlot | `async acquireHeavySlot(kind, bodyBytes)` | 重い操作の枠を取る。 |
| 173 | fn | describeBudget | `describeBudget()` | 起動時のログ用。 |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 32 | detectLimitBytes | `detectLimitBytes()` | 20 |  |
| 81 | usedBytes | `usedBytes()` | 5 |  |
| 88 | availableBytes | `availableBytes()` | 3 | ✓ |
| 96 | maxBodyBytesFor | `maxBodyBytesFor(kind)` | 3 | ✓ |
| 101 | hasRoomFor | `hasRoomFor(kind, bodyBytes)` | 3 | ✓ |
| 105 | takeSlot | `takeSlot()` | 25 |  |
| 132 | releaseSlot | `releaseSlot()` | 8 |  |
| 148 | acquireHeavySlot | `async acquireHeavySlot(kind, bodyBytes)` | 23 | ✓ |
| 173 | describeBudget | `describeBudget()` | 6 | ✓ |

## 依存

- import → なし
- imported by → [[server.index]]

## 注意

<!-- prose:notes -->
- `acquireHeavySlot` が返した `release()` は**必ず finally で呼ぶ**。漏らすと枠が戻らず、
  以後すべての重い操作が順番待ちのまま時間切れになる（同時実行が既定1本のため、1回の
  漏れでその経路が事実上止まる）。
- 使用量の判定に `rss` を使わないこと。GCの解放遅れで実態より高く出るため、大きな取り込みを
  一度通しただけで以後ずっと断り続けるようになる。`heapUsed + external` に固定の非ヒープ分を
  足して見ている理由がこれ。
- ピーク倍率（`PEAK_FACTOR`）は実測値。`readJsonBody` などの読み込み手順を変えたら測り直す。
<!-- /prose:notes -->
