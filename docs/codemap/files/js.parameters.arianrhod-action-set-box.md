---
source: js/parameters/arianrhod-action-set-box.js
lines: 481
exports: 11
imported_by: 1
api_sha: 5c6ff66b35fe
prose_sha: 5c6ff66b35fe
generated: 2026-08-24
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
| 21 | const | ARIANRHOD_ACTION_SLOTS | `ARIANRHOD_ACTION_SLOTS` | 行動セットの3つの枠。 |
| 49 | fn | normalizeActionSet | `normalizeActionSet(raw)` | 保存済みの行動セット1件を正規形にする。 |
| 66 | fn | normalizeActionSetList | `normalizeActionSetList(rawList)` | 名前が空のものは一覧から落とす（コマンドから引けないため） |
| 73 | fn | findActionSetByName | `findActionSetByName(actionSets, name)` | 行動セットを名前（完全一致）で探す。 |
| 79 | fn | buildActionSetChatLines | `buildActionSetChatLines(setName)` | チャットパレット貼り付け用の3コマンド（発動/判定/ダメージ）。 |
| 88 | fn | skillFitsSlot | `skillFitsSlot(skill, slot)` | そのスキルが枠のタイミングに当てはまるか（部分一致） |
| 93 | fn | collectActionSetSkills | `collectActionSetSkills(actionSet, skills)` | 行動セットに組み込まれているスキル（枠の並び順）を、登録済み一覧から引く |
| 150 | fn | runActionSetActivate | `runActionSetActivate({ spec, actionSet, skills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, chatCommand })` | 行動セットの発動。 |
| 185 | fn | runActionSetCheck | `async runActionSetCheck({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, diceModParamId, valueModParamId, chatCommand })` | 行動セットの判定。 |
| 226 | fn | runActionSetDamage | `async runActionSetDamage({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, damageDiceParamId, attackParamId, attackModParamId, chatCommand })` | 行動セットのダメージ。 |
| 265 | fn | showActionSetBox | `showActionSetBox({ actionSets = [], skills = [], abilityChoices = [], readOnly = false, onSave })` | 行動セットの一覧・編集ボックス。 |

## トップレベル関数（LOCAL TASKS 候補）（17）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 29 | ensureDialog | `ensureDialog()` | 7 |  |
| 37 | newActionSetId | `newActionSetId()` | 3 |  |
| 41 | toText | `toText(value)` | 3 |  |
| 49 | normalizeActionSet | `normalizeActionSet(raw)` | 15 | ✓ |
| 66 | normalizeActionSetList | `normalizeActionSetList(rawList)` | 5 | ✓ |
| 73 | findActionSetByName | `findActionSetByName(actionSets, name)` | 3 | ✓ |
| 79 | buildActionSetChatLines | `buildActionSetChatLines(setName)` | 7 | ✓ |
| 88 | skillFitsSlot | `skillFitsSlot(skill, slot)` | 3 | ✓ |
| 93 | collectActionSetSkills | `collectActionSetSkills(actionSet, skills)` | 8 | ✓ |
| 103 | signed | `signed(value)` | 4 |  |
| 110 | logToMain | `logToMain(dispatch, resultText, token, chatCommand)` | 9 |  |
| 127 | formatExpiringNote | `formatExpiringNote(token, phase)` | 6 |  |
| 135 | buildSlotLines | `buildSlotLines(actionSet)` | 7 |  |
| 150 | runActionSetActivate | `runActionSetActivate({ spec, actionSet, skills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, chatCommand })` | 30 | ✓ |
| 185 | runActionSetCheck | `async runActionSetCheck({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, diceModParamId, valueModParamId, chatCommand })` | 34 | ✓ |
| 226 | runActionSetDamage | `async runActionSetDamage({ actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice, bcdiceSystem, damageDiceParamId, attackParamId, attackModParamId, chatCommand })` | 27 | ✓ |
| 265 | showActionSetBox | `showActionSetBox({ actionSets = [], skills = [], abilityChoices = [], readOnly = false, onSave })` | **216** | ✓ |

## 依存

- import → [[js.parameters.skill.skill-use]], [[js.read-only-form]]
- imported by → [[js.parameters.arianrhod]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
