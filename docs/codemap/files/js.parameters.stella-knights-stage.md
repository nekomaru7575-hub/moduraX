---
source: js/parameters/stella-knights-stage.js
lines: 502
exports: 23
imported_by: 3
api_sha: 38386113e8c0
prose_sha: 38386113e8c0
generated: 2026-09-18
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
| 43 | const | OMEN_DECLARATION | `OMEN_DECLARATION` | ブリンガーの手番が始まったときに、手番の知らせへ足す前口上。 |
| 47 | const | STAGE_SET_PHASE_ID | `STAGE_SET_PHASE_ID` | セットルーチンを撃つ段。 |
| 52 | const | STAGE_STEPS | `STAGE_STEPS` | GMが押して進める段（Coreの steps）のid。 |
| 62 | const | ROUTINE_KINDS | `ROUTINE_KINDS` |  |
| 63 | const | ROUTINE_KIND_LABELS | `ROUTINE_KIND_LABELS` |  |
| 67 | const | MAX_ROUTINES_PER_KIND | `MAX_ROUTINES_PER_KIND` | 1つの舞台が持てる数。 |
| 68 | const | MAX_STAGE_NAME_LENGTH | `MAX_STAGE_NAME_LENGTH` |  |
| 69 | const | MAX_ROUTINE_NAME_LENGTH | `MAX_ROUTINE_NAME_LENGTH` |  |
| 70 | const | MAX_ROUTINE_EFFECT_LENGTH | `MAX_ROUTINE_EFFECT_LENGTH` |  |
| 90 | fn | createStageState | `createStageState()` | 空の舞台 |
| 127 | fn | normalizeStage | `normalizeStage(raw)` | 保存データ・取り込んだJSON（信用しない）を正規形へ整える。 |
| 160 | fn | nextSetRoutine | `nextSetRoutine(stage)` | 次に発動するセットルーチンと、その位置。 |
| 169 | fn | nextActionRoutine | `nextActionRoutine(stage)` | 次に発動するアクション／EXルーチンと、それがどちらの列か。 |
| 179 | fn | routineNumberLabel | `routineNumberLabel(kind, index)` | 何番目のルーチンかの呼び名。 |
| 184 | fn | describeRoutine | `describeRoutine(kind, index, routine)` | ログ1行ぶんの本文。 |
| 251 | fn | applyStageRoundEvent | `applyStageRoundEvent(value, event)` | ラウンド進行の節目を受けて舞台を進める（Coreの拡張ルーム設定の applyRoundEvent）。 |
| 340 | fn | describeCursor | `describeCursor(stage, kind)` | 「次はセットNo.2「◯◯」」のような1行。 |
| 361 | fn | reduceStage | `reduceStage(value, op, args)` | 【知らせはすべて noticeText（システムタブ）】GMが手元の設定を直しているだけで、卓の流れでは ない。 |
| 492 | const | STAGE_EXTENSION_MODEL | `STAGE_EXTENSION_MODEL` | 「⋯」→「拡張ルーム設定」へ出す宣言（renderSection と applyRoundEvent は画面側・記述子側で足す） |

## トップレベル関数（LOCAL TASKS 候補）（19）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 75 | text | `text(value, max)` | 3 |  |
| 79 | clampIndex | `clampIndex(value, min, max)` | 5 |  |
| 85 | isRoutineKind | `isRoutineKind(kind)` | 3 |  |
| 90 | createStageState | `createStageState()` | 10 | ✓ |
| 101 | normalizeRoutineList | `normalizeRoutineList(raw, kind)` | 20 |  |
| 127 | normalizeStage | `normalizeStage(raw)` | 29 | ✓ |
| 160 | nextSetRoutine | `nextSetRoutine(stage)` | 4 | ✓ |
| 169 | nextActionRoutine | `nextActionRoutine(stage)` | 5 | ✓ |
| 179 | routineNumberLabel | `routineNumberLabel(kind, index)` | 3 | ✓ |
| 184 | describeRoutine | `describeRoutine(kind, index, routine)` | 9 | ✓ |
| 194 | entryFor | `entryFor(system, kind, index, routine)` | 4 |  |
| 205 | advancedSetCursor | `advancedSetCursor(stage)` | 14 |  |
| 222 | withResetProgress | `withResetProgress(stage)` | 6 |  |
| 230 | withExTransition | `withExTransition(cursor, routine)` | 4 |  |
| 251 | applyStageRoundEvent | `applyStageRoundEvent(value, event)` | 74 | ✓ |
| 328 | routineLabel | `routineLabel(kind, index, routine)` | 4 |  |
| 335 | cursorMax | `cursorMax(stage, kind)` | 3 |  |
| 340 | describeCursor | `describeCursor(stage, kind)` | 6 | ✓ |
| 361 | reduceStage | `reduceStage(value, op, args)` | 129 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.stella-knights-stage-box]], [[js.parameters.stella-knights-stage-section]], [[js.parameters.stella-knights]]

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
