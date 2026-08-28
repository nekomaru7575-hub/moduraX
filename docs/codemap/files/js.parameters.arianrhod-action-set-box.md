---
source: js/parameters/arianrhod-action-set-box.js
lines: 463
exports: 11
imported_by: 1
api_sha: 5c6ff66b35fe
prose_sha: 5c6ff66b35fe
generated: 2026-08-28
tags: [codemap]
---

# js/parameters/arianrhod-action-set-box.js

<!-- prose:summary -->
アリアンロッドの「行動セット」＝ムーブ／マイナー／メジャーで何を行うかという宣言の組。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
行動セット（ムーブ／マイナー／メジャーで何を行うかの宣言）の一覧・編集と、発動・判定・ダメージの実行。DX3 のコンボ（[[js.parameters.dx3-combo-box]]）と同じ構えで、登録はボックス・実行は3つのチャットコマンド、発動そのものは汎用の runSkillUse（[[js.parameters.skill.skill-use]]）へ委ねる。違うのは枠の作り（3枠に1つずつ＋自由記述）と判定式で、判定は `(2+{AdB})D6+{能力ボーナス}+{AnB}`、ダメージは `(2+{DdB})D6+{攻撃力}+{DaB}`。ダメージの後にプロセス終了のバフを剥がすのが「使用したバフを片付ける」経路になっている。
<!-- /prose:role -->

## export（11）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | const | ARIANRHOD_ACTION_SLOTS | `ARIANRHOD_ACTION_SLOTS` | 行動セットの3つの枠。 |
| 42 | fn | normalizeActionSet | `normalizeActionSet(raw)` | 保存済みの行動セット1件を正規形にする。 |
| 59 | fn | normalizeActionSetList | `normalizeActionSetList(rawList)` | 名前が空のものは一覧から落とす（コマンドから引けないため） |
| 66 | fn | findActionSetByName | `findActionSetByName(actionSets, name)` | 行動セットを名前（完全一致）で探す。 |
| 72 | fn | buildActionSetChatLines | `buildActionSetChatLines(setName)` | チャットパレット貼り付け用の3コマンド（発動/判定/ダメージ）。 |
| 81 | fn | skillFitsSlot | `skillFitsSlot(skill, slot)` | そのスキルが枠のタイミングに当てはまるか（部分一致） |
| 86 | fn | collectActionSetSkills | `collectActionSetSkills(actionSet, skills)` | 行動セットに組み込まれているスキル（枠の並び順）を、登録済み一覧から引く |
| 143 | fn | runActionSetActivate | `runActionSetActivate({ spec, actionSet, skills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, chatCommand })` | 行動セットの発動。 |
| 178 | fn | runActionSetCheck | `async runActionSetCheck({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, diceModParamId, valueModParamId, chatCommand })` | 行動セットの判定。 |
| 219 | fn | runActionSetDamage | `async runActionSetDamage({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, damageDiceParamId, attackParamId, attackModParamId, chatCommand })` | 行動セットのダメージ。 |
| 258 | fn | showActionSetBox | `showActionSetBox({ actionSets = [], skills = [], abilityChoices = [], readOnly = false, onSave })` | 行動セットの一覧・編集ボックス。 |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | newActionSetId | `newActionSetId()` | 3 |  |
| 34 | toText | `toText(value)` | 3 |  |
| 42 | normalizeActionSet | `normalizeActionSet(raw)` | 15 | ✓ |
| 59 | normalizeActionSetList | `normalizeActionSetList(rawList)` | 5 | ✓ |
| 66 | findActionSetByName | `findActionSetByName(actionSets, name)` | 3 | ✓ |
| 72 | buildActionSetChatLines | `buildActionSetChatLines(setName)` | 7 | ✓ |
| 81 | skillFitsSlot | `skillFitsSlot(skill, slot)` | 3 | ✓ |
| 86 | collectActionSetSkills | `collectActionSetSkills(actionSet, skills)` | 8 | ✓ |
| 96 | signed | `signed(value)` | 4 |  |
| 103 | logToMain | `logToMain(dispatch, resultText, token, chatCommand)` | 9 |  |
| 120 | formatExpiringNote | `formatExpiringNote(token, phase)` | 6 |  |
| 128 | buildSlotLines | `buildSlotLines(actionSet)` | 7 |  |
| 143 | runActionSetActivate | `runActionSetActivate({ spec, actionSet, skills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, chatCommand })` | 30 | ✓ |
| 178 | runActionSetCheck | `async runActionSetCheck({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, diceModParamId, valueModParamId, chatCommand })` | 34 | ✓ |
| 219 | runActionSetDamage | `async runActionSetDamage({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, damageDiceParamId, attackParamId, attackModParamId, chatCommand })` | 27 | ✓ |
| 258 | showActionSetBox | `showActionSetBox({ actionSets = [], skills = [], abilityChoices = [], readOnly = false, onSave })` | **205** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.parameters.skill.skill-use]], [[js.read-only-form]]
- imported by → [[js.parameters.arianrhod]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
