---
source: js/BCdice.js
lines: 37
exports: 1
imported_by: 2
api_sha: 808f14485f64
prose_sha: 808f14485f64
generated: 2026-08-14
tags: [codemap]
---

# js/BCdice.js

<!-- prose:summary -->
BCDice の公開 API を叩いてダイス判定を実行する唯一の口。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
エンドポイント（bcdice.onlinesession.app）をハードコードで持ち、`rollBCDice` 1本だけを公開する。HTTP 400 + `ok:false` は通信障害ではなく「そのシステムの構文として解釈できなかった」ことを表すため、`unsupported` フラグを立てて呼び出し側が区別できるようにしている。成功時は `resultText` と生の出目配列 `diceValues`（rands）を返し、後者は3Dダイス演出へ渡る。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 2 | fn | rollBCDice | `async rollBCDice(system, command)` | BCdice.js の中身をこれに丸ごと差し替えてみてください |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 2 | rollBCDice | `async rollBCDice(system, command)` | 36 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
