---
source: js/parameters/shinobigami.js
lines: 675
exports: 4
imported_by: 1
api_sha: 345370e97d9d
prose_sha: 345370e97d9d
generated: 2026-08-17
tags: [codemap]
---

# js/parameters/shinobigami.js

<!-- prose:summary -->
シノビガミのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シノビガミのプラグイン記述子。特技表データ（[[js.parameters.shinobigami-skills]]）を共通の表モデルへ流し込み、生命力（特技表の枠から自動算出）・忍法（汎用のスキル枠組みへ SHINOBIGAMI_NINPOU_SPEC として宣言）・プロットで手番順が決まるラウンド進行テンプレートを束ねる。判定に効く修正値（AdB/AnB/SB/FB）と基準値（{F}/{S}）もここで定義する。表の描画も判定の実行も忍法の使用処理も共通側にあり、システム固有なのは特技データと BCDice コマンドの組み立て（resolveShinobigamiCheck）、そして「1ラウンドに使える忍法コストの合計はプロットまで」の判定（handleNinpouUseCommand）だけ。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 26 | const | SKILL_TABLE_COMPONENT_KEY | `SKILL_TABLE_COMPONENT_KEY` | キャラクターの components に特技表を保存するときのキー。 |
| 118 | const | SHINOBIGAMI_SKILL_TABLE | `SHINOBIGAMI_SKILL_TABLE` |  |
| 274 | const | SHINOBIGAMI_NINPOU_SPEC | `SHINOBIGAMI_NINPOU_SPEC` |  |
| 660 | const | SHINOBIGAMI_PLUGIN | `SHINOBIGAMI_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（21）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 45 | buildShinobigamiCheckCommand | `buildShinobigamiCheckCommand({ options, targetNumber })` | 6 |  |
| 64 | pickCheckOption | `pickCheckOption(rawOptions, key, autoValue)` | 7 |  |
| 86 | resolveShinobigamiCheck | `resolveShinobigamiCheck({ rawOptions, targetNumber, getParam })` | 31 |  |
| 189 | buildShinobigamiCharacterParameters | `buildShinobigamiCharacterParameters()` | 3 |  |
| 201 | computePlotValue | `computePlotValue(context)` | 4 |  |
| 207 | computeFumbleBase | `computeFumbleBase(context)` | 3 |  |
| 212 | computeRoundNumber | `computeRoundNumber(context)` | 3 |  |
| 227 | computeShinobigamiDerivedParameters | `computeShinobigamiDerivedParameters(_parameters, components = {}, context = {})` | 11 |  |
| 240 | readSkillTableState | `readSkillTableState(components)` | 3 |  |
| 258 | buildSkillChoices | `buildSkillChoices()` | 15 |  |
| 317 | readNinpouList | `readNinpouList(components)` | 3 |  |
| 336 | readNinpouCost | `readNinpouCost(components, roundNumber)` | 6 |  |
| 347 | ninpouCostOf | `ninpouCostOf(ninpou)` | 5 |  |
| 354 | describeNinpouSkill | `describeNinpouSkill(cellId)` | 4 |  |
| 365 | resetShinobigamiComponentsOnPhaseEnd | `resetShinobigamiComponentsOnPhaseEnd(components, phase)` | 12 |  |
| 382 | renderShinobigamiCharacterPanel | `renderShinobigamiCharacterPanel({ container, mode, canEdit = true, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, generateBuffId, dispatch, rollBCDice })` | 100 |  |
| 488 | looksLikeShinobigamiChatCommand | `looksLikeShinobigamiChatCommand(rawInput)` | 3 |  |
| 498 | handleSkillCheckCommand | `handleSkillCheckCommand(rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue })` | 30 |  |
| 534 | handleNinpouUseCommand | `handleNinpouUseCommand(rawInput, context)` | 85 |  |
| 621 | handleShinobigamiChatCommand | `handleShinobigamiChatCommand(rawInput, context)` | 3 |  |
| 641 | buildShinobigamiRoundPhaseTemplate | `buildShinobigamiRoundPhaseTemplate()` | 18 |  |

## 依存

- import → [[js.parameters.paramFactory]], [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.saikoro-fiction.skill-table]], [[js.parameters.shinobigami-skills]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
ファンブル値はプロットで変わるが、公開前の値は Core（[[js.game-store]] の buildDerivedContext）で落とされて届かない。ここで公開状態を見に行く必要はないし、見に行ってはいけない。

判定値修正（AnB）は目標値から引く。BCDice の `nSG@s#f>=x` に固定値修正の書式が無く、出目へ足すとスペシャル/ファンブルの判定までずれるため。

忍法コストの合計（ninpouCost）を components に置いているのは、ラウンド終了で戻せる場所がそこしか無いから（パラメータをリセットする口は Core に無い）。パラメータ側の「コスト計」はその写しで、書き戻す元にはしない。記録には何ラウンド目かを一緒に持たせてあり、リセットの経路をどこかで通し損ねても前のラウンドの合計を引きずらない。
<!-- /prose:notes -->
