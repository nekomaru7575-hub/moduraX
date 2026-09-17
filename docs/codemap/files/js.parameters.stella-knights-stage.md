---
source: js/parameters/stella-knights-stage.js
lines: 411
exports: 20
imported_by: 2
api_sha: a368fd2c4401
prose_sha: a368fd2c4401
generated: 2026-09-17
tags: [codemap]
---

# js/parameters/stella-knights-stage.js

<!-- prose:summary -->
銀剣のステラナイツの「舞台」：シナリオ側の仕掛けを、ラウンド進行に合わせて自動で流す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（20）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 33 | const | STAGE_KEY | `STAGE_KEY` | js/parameters/stella-knights-stage.js 銀剣のステラナイツの「舞台」：シナリオ側の仕掛けを、ラウンド進行に合わせて自動で流す。 |
| 34 | const | STAGE_LABEL | `STAGE_LABEL` |  |
| 37 | const | OMEN_LOG_NAME | `OMEN_LOG_NAME` | Mainタブに出すときの表示名。 |
| 38 | const | STAGE_LOG_NAME | `STAGE_LOG_NAME` |  |
| 42 | const | STAGE_SET_PHASE_ID | `STAGE_SET_PHASE_ID` | セットルーチンを撃つ段。 |
| 44 | const | ROUTINE_KINDS | `ROUTINE_KINDS` |  |
| 45 | const | ROUTINE_KIND_LABELS | `ROUTINE_KIND_LABELS` |  |
| 49 | const | MAX_ROUTINES_PER_KIND | `MAX_ROUTINES_PER_KIND` | 1つの舞台が持てる数。 |
| 50 | const | MAX_STAGE_NAME_LENGTH | `MAX_STAGE_NAME_LENGTH` |  |
| 51 | const | MAX_ROUTINE_NAME_LENGTH | `MAX_ROUTINE_NAME_LENGTH` |  |
| 52 | const | MAX_ROUTINE_EFFECT_LENGTH | `MAX_ROUTINE_EFFECT_LENGTH` |  |
| 72 | fn | createStageState | `createStageState()` | 空の舞台 |
| 109 | fn | normalizeStage | `normalizeStage(raw)` | 保存データ・取り込んだJSON（信用しない）を正規形へ整える。 |
| 142 | fn | nextSetRoutine | `nextSetRoutine(stage)` | 次に発動するセットルーチン。 |
| 150 | fn | nextActionRoutine | `nextActionRoutine(stage)` | 次に発動するアクション／EXルーチンと、それがどちらの列か。 |
| 156 | fn | describeRoutine | `describeRoutine(routine)` | ログ1行ぶんの本文。 |
| 205 | fn | applyStageRoundEvent | `applyStageRoundEvent(value, event)` | ラウンド進行の節目を受けて舞台を進める（Coreの拡張ルーム設定の applyRoundEvent）。 |
| 252 | fn | describeCursor | `describeCursor(stage, kind)` | 「次はセットNo.2「◯◯」」のような1行。 |
| 268 | fn | reduceStage | `reduceStage(value, op, args)` | 舞台の編集とGMの進行操作。 |
| 401 | const | STAGE_EXTENSION_MODEL | `STAGE_EXTENSION_MODEL` | 「⋯」→「拡張ルーム設定」へ出す宣言（renderSection と applyRoundEvent は画面側・記述子側で足す） |

## トップレベル関数（LOCAL TASKS 候補）（17）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 57 | text | `text(value, max)` | 3 |  |
| 61 | clampIndex | `clampIndex(value, min, max)` | 5 |  |
| 67 | isRoutineKind | `isRoutineKind(kind)` | 3 |  |
| 72 | createStageState | `createStageState()` | 10 | ✓ |
| 83 | normalizeRoutineList | `normalizeRoutineList(raw, kind)` | 20 |  |
| 109 | normalizeStage | `normalizeStage(raw)` | 29 | ✓ |
| 142 | nextSetRoutine | `nextSetRoutine(stage)` | 3 | ✓ |
| 150 | nextActionRoutine | `nextActionRoutine(stage)` | 4 | ✓ |
| 156 | describeRoutine | `describeRoutine(routine)` | 7 | ✓ |
| 164 | entryFor | `entryFor(system, routine)` | 4 |  |
| 175 | advancedSetCursor | `advancedSetCursor(stage)` | 14 |  |
| 191 | withExTransition | `withExTransition(cursor, routine)` | 4 |  |
| 205 | applyStageRoundEvent | `applyStageRoundEvent(value, event)` | 32 | ✓ |
| 240 | routineLabel | `routineLabel(kind, index, routine)` | 4 |  |
| 247 | cursorMax | `cursorMax(stage, kind)` | 3 |  |
| 252 | describeCursor | `describeCursor(stage, kind)` | 6 | ✓ |
| 268 | reduceStage | `reduceStage(value, op, args)` | 131 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.stella-knights-stage-section]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
