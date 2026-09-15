---
source: js/store/buffs.js
lines: 142
exports: 9
imported_by: 4
api_sha: 40e9e06251d9
prose_sha: 40e9e06251d9
generated: 2026-09-15
tags: [codemap]
---

# js/store/buffs.js

<!-- prose:summary -->
バフ/デバフの終了条件（フェーズ）と、フェーズ終了時の後始末。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
バフ/デバフの終了フェーズの入れ子（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）と、フェーズが終わったときの後始末を持つ。applyPhaseEnd がバフの削除とプラグインの components のリセット（resetPluginComponentsForPhase）を1段ずつ流してログ本文まで組み立て、部屋に掛かる効果の後始末は applyRoomExtensionsPhaseEnd が同じ入れ子で流す（何を消すかは [[js.parameters.registry]] 経由でプラグインが決める）。どのアクションで呼ぶかは [[js.store.handlers.buffs]]・[[js.store.handlers.round]]・[[js.store.handlers.scenes]] 側。
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 11 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 15 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 19 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 27 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 37 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 47 | fn | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 指定フェーズ(phase: 'scene'\|'round'\|'scenario'\|'check'\|'process')の終了条件を持つバフ/デバフを トークンから取り除く。 |
| 75 | fn | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | removeExpiredBuffsと同じ「フェーズが終了した」タイミングで、プラグイン固有のcomponents （DX3ならエフェクトの使用回数）もリセットする。 |
| 93 | fn | applyRoomExtensionsPhaseEnd | `applyRoomExtensionsPhaseEnd(room, activePlugin, phase)` | フェーズ終了で、部屋の拡張ルーム設定（ステラナイツの始まりの部屋など）の後始末をさせる。 |
| 116 | fn | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | フェーズ（シーン/ラウンド/シナリオ/判定/プロセス）が終了したときの共通処理。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 27 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 37 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 47 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 | ✓ |
| 75 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 | ✓ |
| 93 | applyRoomExtensionsPhaseEnd | `applyRoomExtensionsPhaseEnd(room, activePlugin, phase)` | 13 | ✓ |
| 116 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 | ✓ |

## 依存

- import → [[js.parameters.registry]]
- imported by → [[js.game-store]], [[js.store.handlers.buffs]], [[js.store.handlers.round]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
applyRoomExtensionsPhaseEnd は部屋全体のフェーズ終了（クリンナップ完了・ROUND_PROGRESSION_END・APPLY_SCENE・部屋全体の EXPIRE_BUFFS）でだけ呼ぶ。1コマ分の EXPIRE_BUFFS（ロールのたびの「判定終了」）で呼ぶと、部屋の効果が判定1回で消える。
<!-- /prose:notes -->
