---
source: js/dice-roll-recompute.js
lines: 274
exports: 3
imported_by: 1
api_sha: b229c2364c60
prose_sha: b229c2364c60
generated: 2026-09-15
tags: [codemap]
---

# js/dice-roll-recompute.js

<!-- prose:summary -->
BCDiceで振った後に出目だけを差し替えたとき、結果の文字列をこちらで組み立て直す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
出目を差し替えたロールの結果文字列を、BCDice と同じ見た目で組み立て直す純関数（Core 汎用。どの能力が目を変えたかは知らない）。加算ロール（nDm・四則演算・括弧・比較）、バラ振り（nBm の組・比較で成功数）、繰り返し（x3 / rep3）とシークレットの S を解釈し、システム固有の書式は parsers で先に試させる（ステラナイツの SK は [[js.parameters.stella-knights-starting-room]] 側）。解釈できなければ null を返し、「反映できなかった」と伝えるのは呼び出し側。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 26 | fn | splitRollPrefix | `splitRollPrefix(command)` | 繰り返し・シークレットの前置きを剥がす。 |
| 147 | fn | evaluateArithmetic | `evaluateArithmetic(expr)` | ダイスを含まない整数の式（SKの個数「(5+3)/2」など）を評価する。 |
| 249 | fn | recomputeRollText | `recomputeRollText(command, dice, { parsers = [] } = {})` | 出目を差し替えたロールの結果文字列を組み立て直す。 |

## トップレベル関数（LOCAL TASKS 候補）（10）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 26 | splitRollPrefix | `splitRollPrefix(command)` | 13 | ✓ |
| 42 | tokenize | `tokenize(expr)` | 20 |  |
| 64 | divide | `divide(a, b)` | 4 |  |
| 73 | evaluateTokens | `evaluateTokens(tokens, dice)` | 70 |  |
| 147 | evaluateArithmetic | `evaluateArithmetic(expr)` | 5 | ✓ |
| 153 | compare | `compare(value, op, target)` | 11 |  |
| 165 | countDiceIn | `countDiceIn(tokens)` | 3 |  |
| 173 | parseSumRoll | `parseSumRoll(body)` | 30 |  |
| 207 | parseBarabaraRoll | `parseBarabaraRoll(body)` | 32 |  |
| 249 | recomputeRollText | `recomputeRollText(command, dice, { parsers = [] } = {})` | 25 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.stella-knights-starting-room]]

## 注意

<!-- prose:notes -->
最後の「＞」の後ろに最終値を置く形を崩さないこと。[[js.main]] の parseFinalDiceNumber がそこだけを読んでパラメータ変更・オリジナル表の出目にしている。割り算は Ruby と同じ切り捨てで、0 で割る式と再帰が深すぎる式は null。
<!-- /prose:notes -->
