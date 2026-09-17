---
source: js/parameters/stella-knights-starting-room.js
lines: 219
exports: 11
imported_by: 2
api_sha: 990cf7641540
prose_sha: 990cf7641540
generated: 2026-09-17
tags: [codemap]
---

# js/parameters/stella-knights-starting-room.js

<!-- prose:summary -->
銀剣のステラナイツのスキル「始まりの部屋」：発動するとラウンド終了まで、振ったd6の目aをbとして扱う。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
銀剣のステラナイツのスキル「始まりの部屋」（振ったd6の目aをbとして扱う。ラウンド終了まで）の状態と計算を純関数で持つ。値は room.extensions.STELLA_KNIGHTS.startingRoom（発動順の rules）。normalize / reduce（add・remove）/ resetOnPhaseEnd（round で全消し）を STARTING_ROOM_EXTENSION_MODEL として [[js.parameters.stella-knights]] の記述子へ渡す。transformStellaKnightsRoll は d6 の目に規則を発動順に連鎖で当て（applyStartingRoomRules / buildFaceMap）、SK は自前で、D・B は [[js.dice-roll-recompute]] で数え直す。欄の描画は [[js.parameters.stella-knights-starting-room-section]]。
<!-- /prose:role -->

## export（11）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 20 | const | STARTING_ROOM_KEY | `STARTING_ROOM_KEY` |  |
| 21 | const | STARTING_ROOM_LABEL | `STARTING_ROOM_LABEL` |  |
| 24 | const | MAX_STARTING_ROOM_RULES | `MAX_STARTING_ROOM_RULES` | 1つの部屋で同時に持てる数。 |
| 33 | fn | createStartingRoomState | `createStartingRoomState()` | 空の状態 |
| 41 | fn | normalizeStartingRoom | `normalizeStartingRoom(raw)` | 保存データ・取り込んだJSON（信用しない）を正規形へ整える。 |
| 65 | fn | reduceStartingRoom | `reduceStartingRoom(value, op, args)` | 発動と解除。 |
| 95 | fn | resetStartingRoomOnPhaseEnd | `resetStartingRoomOnPhaseEnd(value, phase)` | ラウンドが終わったら全部消す。 |
| 106 | fn | applyStartingRoomRules | `applyStartingRoomRules(value, rules)` | 1個の目に、発動した順に規則を当てた最終の目 |
| 115 | fn | buildFaceMap | `buildFaceMap(rules)` | 目の対応表（1〜6それぞれの最終の目）。 |
| 178 | fn | transformStellaKnightsRoll | `transformStellaKnightsRoll({ command, result, rules })` | BCDiceの結果に始まりの部屋を当てる（Coreの transformRollResult から呼ばれる）。 |
| 212 | const | STARTING_ROOM_EXTENSION_MODEL | `STARTING_ROOM_EXTENSION_MODEL` | Coreの「拡張ルーム設定」へ渡す宣言（画面の描画は記述子側で足す） |

## トップレベル関数（LOCAL TASKS 候補）（10）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | isFace | `isFace(value)` | 3 |  |
| 33 | createStartingRoomState | `createStartingRoomState()` | 3 | ✓ |
| 41 | normalizeStartingRoom | `normalizeStartingRoom(raw)` | 14 | ✓ |
| 65 | reduceStartingRoom | `reduceStartingRoom(value, op, args)` | 28 | ✓ |
| 95 | resetStartingRoomOnPhaseEnd | `resetStartingRoomOnPhaseEnd(value, phase)` | 9 | ✓ |
| 106 | applyStartingRoomRules | `applyStartingRoomRules(value, rules)` | 3 | ✓ |
| 115 | buildFaceMap | `buildFaceMap(rules)` | 5 | ✓ |
| 122 | formatRules | `formatRules(rules)` | 3 |  |
| 132 | parseStellaKnightsAttack | `parseStellaKnightsAttack(body)` | 33 |  |
| 178 | transformStellaKnightsRoll | `transformStellaKnightsRoll({ command, result, rules })` | 32 | ✓ |

## 依存

- import → [[js.dice-roll-recompute]]
- imported by → [[js.parameters.stella-knights-starting-room-section]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
規則は発動順の連鎖（1→6, 6→1 なら 1 は 1→6→1 で1）。BCDice の SK の「,k>l」と同じ当て方だが、SK 以外（D6・B6・charge）にも効かせるためこちらで変換して数え直している。巡って元の目に戻っただけの目は「変わっていない」扱いで、結果は同じ参照のまま書き添えも出ない。コマンド自身の「,k>l」は始まりの部屋の後に当てる。説明の1行は結果の前に置く（後ろに置くと parseFinalDiceNumber がその数字を拾う）。
<!-- /prose:notes -->
