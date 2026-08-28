---
source: js/parameters/saikoro-fiction/skill-check.js
lines: 159
exports: 5
imported_by: 2
api_sha: 58eb1bd97ee9
prose_sha: 58eb1bd97ee9
generated: 2026-08-28
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-check.js

<!-- prose:summary -->
サイコロ・フィクション共通の「特技判定」の実行とチャットへの出力。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
サイコロ・フィクション系（シノビガミ／インセイン等）共通の特技判定の実行とチャット出力の組み立て。目標特技からの距離計算は [[js.parameters.saikoro-fiction.skill-table]] に委ね、BCDice へ投げるコマンドの書式はシステム固有なので spec.check に委ねる。resolveCheckAdjustments はコマ側の修正（シノビガミの AdB/AnB/SB/FB。いずれもバフ込みの実効値）を判定コマンドの値と目標値へ反映する口で、表からの判定もチャットコマンドからの判定も必ずここを通る。`特技判定(...)` については**受ける側だけ**を持つ（SKILL_CHECK_COMMAND_PATTERN）。貼り付け用の文字列を組み立てる口は無い：表のボックスからコマンドをまとめてコピーするボタンを外したため、作る側の使い手がいなくなった。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 14 | const | SKILL_CHECK_COMMAND_PATTERN | `SKILL_CHECK_COMMAND_PATTERN` | 特技判定(隠形術) / 特技判定(忍術:7) の形。 |
| 20 | fn | describeSkillCheck | `describeSkillCheck(resolution)` | 判定内容の1行説明。 |
| 33 | fn | buildCheckCommand | `buildCheckCommand(spec, targetNumber, checkOptions)` | 実際にBCDiceへ投げるコマンド文字列。 |
| 54 | fn | resolveCheckAdjustments | `resolveCheckAdjustments(spec, { options, targetNumber, token, getEffectiveParameterValue })` | 判定コマンドに渡す値と目標値に、そのキャラクター固有の修正を反映する。 |
| 115 | fn | runSkillCheck | `async runSkillCheck({ spec, state, targetCellId, token, dispatch, rollBCDice, bcdiceSystem, getEffectiveParameterValue, systemLabel = '特技判定', chatCommand })` | 特技判定を実行してメインチャットに結果を流す。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 20 | describeSkillCheck | `describeSkillCheck(resolution)` | 6 | ✓ |
| 33 | buildCheckCommand | `buildCheckCommand(spec, targetNumber, checkOptions)` | 6 | ✓ |
| 54 | resolveCheckAdjustments | `resolveCheckAdjustments(spec, { options, targetNumber, token, getEffectiveParameterValue })` | 25 | ✓ |
| 84 | logToMain | `logToMain(dispatch, resultText, token, system, chatCommand)` | 13 |  |
| 115 | runSkillCheck | `async runSkillCheck({ spec, state, targetCellId, token, dispatch, rollBCDice, bcdiceSystem, getEffectiveParameterValue, systemLabel = '特技判定', chatCommand })` | 44 | ✓ |

## 依存

- import → [[js.parameters.saikoro-fiction.skill-table]]
- imported by → [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
判定のたびに指定する一時的なオプションはもう無い。修正はすべてコマのパラメータ側にあるので、表から振ってもチャットコマンドから振っても同じ値が乗る。
<!-- /prose:notes -->
