---
source: js/store/buffs.js
lines: 161
exports: 10
imported_by: 4
api_sha: 2183a84ed26f
prose_sha: 2183a84ed26f
generated: 2026-09-18
tags: [codemap]
---

# js/store/buffs.js

<!-- prose:summary -->
バフ/デバフの終了条件（フェーズ）と、フェーズ終了時の後始末。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
バフ/デバフの終了フェーズの入れ子（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）と、フェーズが終わったときの後始末を持つ。applyPhaseEnd がバフの削除とプラグインの components のリセット（resetPluginComponentsForPhase）を1段ずつ流してログ本文まで組み立て、部屋に掛かる効果の後始末は applyRoomExtensionsPhaseEnd が同じ入れ子で流す（何を消すかは [[js.parameters.registry]] 経由でプラグインが決める）。

applyRoomExtensionsRoundEvent だけは「終わり」ではなく**進行そのもの**を進めるためのもので、段に入る・手番の開始・手番の終了を部屋の拡張ルーム設定へ知らせ、表示名つきの発言（entries）を返す（ステラナイツの舞台のルーチン）。どのアクションで呼ぶかは [[js.store.handlers.buffs]]・[[js.store.handlers.round]]・[[js.store.handlers.scenes]] 側。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 13 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 17 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 21 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 29 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 39 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 49 | fn | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 指定フェーズ(phase: 'scene'\|'round'\|'scenario'\|'check'\|'process')の終了条件を持つバフ/デバフを トークンから取り除く。 |
| 77 | fn | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | removeExpiredBuffsと同じ「フェーズが終了した」タイミングで、プラグイン固有のcomponents （DX3ならエフェクトの使用回数）もリセットする。 |
| 95 | fn | applyRoomExtensionsPhaseEnd | `applyRoomExtensionsPhaseEnd(room, activePlugin, phase)` | フェーズ終了で、部屋の拡張ルーム設定（ステラナイツの始まりの部屋など）の後始末をさせる。 |
| 118 | fn | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | フェーズ（シーン/ラウンド/シナリオ/判定/プロセス）が終了したときの共通処理。 |
| 153 | fn | applyRoomExtensionsRoundEvent | `applyRoomExtensionsRoundEvent(room, activePlugin, event)` | ラウンド進行の節目（段に入る・手番が決まる・段を押す・進行の終了）を、 部屋の拡張ルーム設定へ知らせる。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 29 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 39 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 49 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 | ✓ |
| 77 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 | ✓ |
| 95 | applyRoomExtensionsPhaseEnd | `applyRoomExtensionsPhaseEnd(room, activePlugin, phase)` | 13 | ✓ |
| 118 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 | ✓ |
| 153 | applyRoomExtensionsRoundEvent | `applyRoomExtensionsRoundEvent(room, activePlugin, event)` | 8 | ✓ |

## 依存

- import → [[js.parameters.registry]]
- imported by → [[js.game-store]], [[js.store.handlers.buffs]], [[js.store.handlers.round]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
applyRoomExtensionsPhaseEnd は部屋全体のフェーズ終了（クリンナップ完了・ROUND_PROGRESSION_END・APPLY_SCENE・部屋全体の EXPIRE_BUFFS）でだけ呼ぶ。1コマ分の EXPIRE_BUFFS（ロールのたびの「判定終了」）で呼ぶと、部屋の効果が判定1回で消える。

applyRoomExtensionsRoundEvent を呼ぶのは [[js.store.handlers.round]] だけ。返る entries は Main へ並べる発言で、並び順に意味がある（手番終了のぶん → 進行の知らせ → 段に入るぶん・次の手番の予告）。呼び出し側がこの順を崩すと、手番を終えた効果が次の手番の予告より後ろに出る。
<!-- /prose:notes -->
