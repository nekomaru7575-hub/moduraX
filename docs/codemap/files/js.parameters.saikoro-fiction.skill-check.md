---
source: js/parameters/saikoro-fiction/skill-check.js
lines: 112
exports: 5
imported_by: 2
api_sha: 645d157cd910
prose_sha: 645d157cd910
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-check.js

<!-- prose:summary -->
サイコロ・フィクション共通の「特技判定」の実行とチャットへの出力。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系（シノビガミ／インセイン等）共通の特技判定の実行とチャット出力の組み立て。目標特技からの距離計算は [[js.parameters.saikoro-fiction.skill-table]] に委ねる。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 14 | const | SKILL_CHECK_COMMAND_PATTERN | `SKILL_CHECK_COMMAND_PATTERN` | 特技判定(隠形術) / 特技判定(忍術:7) の形。 |
| 17 | fn | buildSkillCheckCommand | `buildSkillCheckCommand(skillName)` | チャット欄に貼れる特技判定コマンドの文字列 |
| 25 | fn | describeSkillCheck | `describeSkillCheck(resolution)` | 判定内容の1行説明。 |
| 38 | fn | buildCheckCommand | `buildCheckCommand(spec, targetNumber, checkOptions)` | 実際にBCDiceへ投げるコマンド文字列。 |
| 78 | fn | runSkillCheck | `async runSkillCheck({ spec, state, targetCellId, token, dispatch, rollBCDice, bcdiceSystem, checkOptions, systemLabel = '特技判定', chatCommand })` | 特技判定を実行してメインチャットに結果を流す。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 17 | buildSkillCheckCommand | `buildSkillCheckCommand(skillName)` | 3 | ✓ |
| 25 | describeSkillCheck | `describeSkillCheck(resolution)` | 6 | ✓ |
| 38 | buildCheckCommand | `buildCheckCommand(spec, targetNumber, checkOptions)` | 6 | ✓ |
| 49 | logToMain | `logToMain(dispatch, resultText, token, system, chatCommand)` | 13 |  |
| 78 | runSkillCheck | `async runSkillCheck({ spec, state, targetCellId, token, dispatch, rollBCDice, bcdiceSystem, checkOptions, systemLabel = '特技判定', chatCommand })` | 34 | ✓ |

## 依存

- import → [[js.parameters.saikoro-fiction.skill-table]]
- imported by → [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
