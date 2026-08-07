---
source: js/dice-notation.js
lines: 82
exports: 2
imported_by: 2
api_sha: cb125e30856a
prose_sha: cb125e30856a
generated: 2026-08-07
tags: [codemap]
---

# js/dice-notation.js

<!-- prose:summary -->
BCDice APIが返す出目の配列（rands）を、3Dダイス（vendor/dice-box-threejs）へ渡す ダイス記法へ変換する。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
BCDice が返す生の出目配列（rands）を、3Dダイスライブラリが解釈できる記法へ変換する純粋関数。演出に流せるダイス数の上限（`MAX_ANIMATED_DICE`）もここが持つ。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 11 | const | MAX_ANIMATED_DICE | `MAX_ANIMATED_DICE` | 一度に転がすダイスの上限。 |
| 58 | fn | randsToNotation | `randsToNotation(rands)` | randsをダイス記法へ変換する。 |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 30 | expandRand | `expandRand(rand)` | 21 |

## 依存

- import → なし
- imported by → [[js.dice-animation]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
