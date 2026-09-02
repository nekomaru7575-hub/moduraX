---
source: js/net-chunk.js
lines: 272
exports: 5
imported_by: 2
api_sha: e842479aca42
prose_sha: e842479aca42
generated: 2026-09-02
tags: [codemap]
---

# js/net-chunk.js

<!-- prose:summary -->
DataChannelで大きなメッセージを運ぶための分割と組み直し。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | const | MAX_REASSEMBLED_BYTES | `MAX_REASSEMBLED_BYTES` | 組み直しの上限。 |
| 47 | fn | chunkBudgetBytes | `chunkBudgetBytes(pc)` | このチャネルで1メッセージに載せてよい本文のバイト数。 |
| 68 | fn | chunkMessage | `chunkMessage(text, budgetBytes, id)` | JSON文字列を封筒に詰める。 |
| 117 | fn | createChunkReassembler | `createChunkReassembler({ onMessage, onDrop })` | 届いた文字列を組み直して、完成したメッセージだけを渡す。 |
| 213 | fn | createChunkSender | `createChunkSender(channel, budget)` | 1本のDataChannelへ、分割と詰まり待ちをしながら送る役。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | chunkBudgetBytes | `chunkBudgetBytes(pc)` | 8 | ✓ |
| 68 | chunkMessage | `chunkMessage(text, budgetBytes, id)` | 19 | ✓ |
| 88 | isHighSurrogate | `isHighSurrogate(code)` | 3 |  |
| 94 | byteLength | `byteLength(text)` | 11 |  |
| 117 | createChunkReassembler | `createChunkReassembler({ onMessage, onDrop })` | 83 | ✓ |
| 213 | createChunkSender | `createChunkSender(channel, budget)` | 59 | ✓ |

## 依存

- import → [[js.untrusted-json]]
- imported by → [[js.net-host]], [[js.net-transport-rtc]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
