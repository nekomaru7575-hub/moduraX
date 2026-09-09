---
source: js/store/buffs.js
lines: 124
exports: 8
imported_by: 4
api_sha: 8ac1fb164242
prose_sha: 8ac1fb164242
generated: 2026-09-09
tags: [codemap]
---

# js/store/buffs.js

<!-- prose:summary -->
バフ/デバフの終了条件（フェーズ）と、フェーズ終了時の後始末。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 11 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 15 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 19 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 27 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 37 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 47 | fn | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 指定フェーズ(phase: 'scene'\|'round'\|'scenario'\|'check'\|'process')の終了条件を持つバフ/デバフを トークンから取り除く。 |
| 75 | fn | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | removeExpiredBuffsと同じ「フェーズが終了した」タイミングで、プラグイン固有のcomponents （DX3ならエフェクトの使用回数）もリセットする。 |
| 98 | fn | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | フェーズ（シーン/ラウンド/シナリオ/判定/プロセス）が終了したときの共通処理。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 27 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 37 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 47 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 | ✓ |
| 75 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 | ✓ |
| 98 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 | ✓ |

## 依存

- import → [[js.parameters.registry]]
- imported by → [[js.game-store]], [[js.store.handlers.buffs]], [[js.store.handlers.round]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
