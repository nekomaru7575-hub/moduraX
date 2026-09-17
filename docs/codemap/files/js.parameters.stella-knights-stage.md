---
source: js/parameters/stella-knights-stage.js
lines: 482
exports: 23
imported_by: 2
api_sha: 38386113e8c0
prose_sha: 38386113e8c0
generated: 2026-09-17
tags: [codemap]
---

# js/parameters/stella-knights-stage.js

<!-- prose:summary -->
銀剣のステラナイツの「舞台」：シナリオ側の仕掛けを、GMの押下に合わせてMainへ流す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
舞台（セット／アクション／EXの3列のルーチン）の状態の形と進行の規則だけを持つ純関数の集まり。
置き場は部屋の拡張データ（room.extensions.STELLA_KNIGHTS.stage）で、窓口は
[[js.parameters.registry]] 経由の normalizeStage / reduceStage / applyStageRoundEvent の3つ。

**発動はすべてGMの押下で起きる。** どの段でどれを撃つかは STAGE_STEPS のidで決まり、
その並び（押す回数とボタンのラベル）は [[js.parameters.stella-knights]] の
buildRoundPhaseTemplate が `steps` として宣言する（**このファイルからプラグイン本体は
読めない**＝循環importなので、突き合わせる名前をこちら側に置いている）。
予兆と適用が同じ中身を指すのは、どちらも nextActionRoutine 一本を通るから。

画面は [[js.parameters.stella-knights-stage-section]]。resetOnPhaseEnd は持たない
（舞台はラウンドをまたいで続く仕掛けなので、ラウンド終了で消してはいけない）。
<!-- /prose:role -->

## export（23）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 33 | const | STAGE_KEY | `STAGE_KEY` | js/parameters/stella-knights-stage.js 銀剣のステラナイツの「舞台」：シナリオ側の仕掛けを、ラウンド進行に合わせて自動で流す。 |
| 34 | const | STAGE_LABEL | `STAGE_LABEL` |  |
| 37 | const | OMEN_LOG_NAME | `OMEN_LOG_NAME` | Mainタブに出すときの表示名。 |
| 38 | const | STAGE_LOG_NAME | `STAGE_LOG_NAME` |  |
| 42 | const | OMEN_DECLARATION | `OMEN_DECLARATION` | ブリンガーの手番が始まったときに出す前口上。 |
| 46 | const | STAGE_SET_PHASE_ID | `STAGE_SET_PHASE_ID` | セットルーチンを撃つ段。 |
| 51 | const | STAGE_STEPS | `STAGE_STEPS` | GMが押して進める段（Coreの steps）のid。 |
| 61 | const | ROUTINE_KINDS | `ROUTINE_KINDS` |  |
| 62 | const | ROUTINE_KIND_LABELS | `ROUTINE_KIND_LABELS` |  |
| 66 | const | MAX_ROUTINES_PER_KIND | `MAX_ROUTINES_PER_KIND` | 1つの舞台が持てる数。 |
| 67 | const | MAX_STAGE_NAME_LENGTH | `MAX_STAGE_NAME_LENGTH` |  |
| 68 | const | MAX_ROUTINE_NAME_LENGTH | `MAX_ROUTINE_NAME_LENGTH` |  |
| 69 | const | MAX_ROUTINE_EFFECT_LENGTH | `MAX_ROUTINE_EFFECT_LENGTH` |  |
| 89 | fn | createStageState | `createStageState()` | 空の舞台 |
| 126 | fn | normalizeStage | `normalizeStage(raw)` | 保存データ・取り込んだJSON（信用しない）を正規形へ整える。 |
| 159 | fn | nextSetRoutine | `nextSetRoutine(stage)` | 次に発動するセットルーチンと、その位置。 |
| 168 | fn | nextActionRoutine | `nextActionRoutine(stage)` | 次に発動するアクション／EXルーチンと、それがどちらの列か。 |
| 178 | fn | routineNumberLabel | `routineNumberLabel(kind, index)` | 何番目のルーチンかの呼び名。 |
| 183 | fn | describeRoutine | `describeRoutine(kind, index, routine)` | ログ1行ぶんの本文。 |
| 239 | fn | applyStageRoundEvent | `applyStageRoundEvent(value, event)` | ラウンド進行の節目を受けて舞台を進める（Coreの拡張ルーム設定の applyRoundEvent）。 |
| 323 | fn | describeCursor | `describeCursor(stage, kind)` | 「次はセットNo.2「◯◯」」のような1行。 |
| 339 | fn | reduceStage | `reduceStage(value, op, args)` | 舞台の編集とGMの進行操作。 |
| 472 | const | STAGE_EXTENSION_MODEL | `STAGE_EXTENSION_MODEL` | 「⋯」→「拡張ルーム設定」へ出す宣言（renderSection と applyRoundEvent は画面側・記述子側で足す） |

## トップレベル関数（LOCAL TASKS 候補）（18）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 74 | text | `text(value, max)` | 3 |  |
| 78 | clampIndex | `clampIndex(value, min, max)` | 5 |  |
| 84 | isRoutineKind | `isRoutineKind(kind)` | 3 |  |
| 89 | createStageState | `createStageState()` | 10 | ✓ |
| 100 | normalizeRoutineList | `normalizeRoutineList(raw, kind)` | 20 |  |
| 126 | normalizeStage | `normalizeStage(raw)` | 29 | ✓ |
| 159 | nextSetRoutine | `nextSetRoutine(stage)` | 4 | ✓ |
| 168 | nextActionRoutine | `nextActionRoutine(stage)` | 5 | ✓ |
| 178 | routineNumberLabel | `routineNumberLabel(kind, index)` | 3 | ✓ |
| 183 | describeRoutine | `describeRoutine(kind, index, routine)` | 7 | ✓ |
| 191 | entryFor | `entryFor(system, kind, index, routine)` | 4 |  |
| 202 | advancedSetCursor | `advancedSetCursor(stage)` | 14 |  |
| 218 | withExTransition | `withExTransition(cursor, routine)` | 4 |  |
| 239 | applyStageRoundEvent | `applyStageRoundEvent(value, event)` | 69 | ✓ |
| 311 | routineLabel | `routineLabel(kind, index, routine)` | 4 |  |
| 318 | cursorMax | `cursorMax(stage, kind)` | 3 |  |
| 323 | describeCursor | `describeCursor(stage, kind)` | 6 | ✓ |
| 339 | reduceStage | `reduceStage(value, op, args)` | 131 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.stella-knights-stage-section]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
誤爆が前提の仕掛けなので、戻す口が2系統ある。**どのルーチンが次に来るか**は reduceStage の
stepBack / setCursor / setExMode / resetProgress（拡張ルーム設定の「← 戻す」）。
**どのボタンを次に押すか**はCore側の ROUND_STEP_BACK（[[js.store.handlers.round]]）。
2つは別物で、片方を戻してももう片方は動かない。

fireNow だけは進行の位置を動かさない。「1つ戻したうえで、代わりに別のルーチンを撃つ」
という使い方のためで、ここを動かすと巻き戻した意味が消える。

番号の表記（No.（X）/ EX（X））は routineNumberLabel 一本を通す。ログ・欄の行頭・
進行の現在地が別々に組み立てると、卓とGMが違う番号を指すことになる。
<!-- /prose:notes -->
