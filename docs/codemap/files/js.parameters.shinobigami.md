---
source: js/parameters/shinobigami.js
lines: 777
exports: 4
imported_by: 1
api_sha: 345370e97d9d
prose_sha: 345370e97d9d
generated: 2026-08-19
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
| 29 | const | SKILL_TABLE_COMPONENT_KEY | `SKILL_TABLE_COMPONENT_KEY` | キャラクターの components に特技表を保存するときのキー。 |
| 121 | const | SHINOBIGAMI_SKILL_TABLE | `SHINOBIGAMI_SKILL_TABLE` |  |
| 278 | const | SHINOBIGAMI_NINPOU_SPEC | `SHINOBIGAMI_NINPOU_SPEC` |  |
| 762 | const | SHINOBIGAMI_PLUGIN | `SHINOBIGAMI_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（22）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | buildShinobigamiCheckCommand | `buildShinobigamiCheckCommand({ options, targetNumber })` | 6 |  |
| 67 | pickCheckOption | `pickCheckOption(rawOptions, key, autoValue)` | 7 |  |
| 89 | resolveShinobigamiCheck | `resolveShinobigamiCheck({ rawOptions, targetNumber, getParam })` | 31 |  |
| 193 | buildShinobigamiCharacterParameters | `buildShinobigamiCharacterParameters()` | 3 |  |
| 205 | computePlotValue | `computePlotValue(context)` | 4 |  |
| 211 | computeFumbleBase | `computeFumbleBase(context)` | 3 |  |
| 216 | computeRoundNumber | `computeRoundNumber(context)` | 3 |  |
| 231 | computeShinobigamiDerivedParameters | `computeShinobigamiDerivedParameters(_parameters, components = {}, context = {})` | 11 |  |
| 244 | readSkillTableState | `readSkillTableState(components)` | 3 |  |
| 262 | buildSkillChoices | `buildSkillChoices()` | 15 |  |
| 324 | readNinpouList | `readNinpouList(components)` | 3 |  |
| 343 | readNinpouCost | `readNinpouCost(components, roundNumber)` | 6 |  |
| 354 | ninpouCostOf | `ninpouCostOf(ninpou)` | 5 |  |
| 361 | describeNinpouSkill | `describeNinpouSkill(cellId)` | 4 |  |
| 372 | resetShinobigamiComponentsOnPhaseEnd | `resetShinobigamiComponentsOnPhaseEnd(components, phase)` | 12 |  |
| 389 | renderShinobigamiCharacterPanel | `renderShinobigamiCharacterPanel({ container, mode, canEdit = true, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, generateBuffId, dispatch, rollBCDice, participants = {}, myParticipantId = null })` | 130 |  |
| 529 | looksLikeShinobigamiChatCommand | `looksLikeShinobigamiChatCommand(rawInput)` | 5 |  |
| 541 | handleSkillCheckCommand | `handleSkillCheckCommand(rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue })` | 30 |  |
| 577 | handleNinpouUseCommand | `handleNinpouUseCommand(rawInput, context)` | 85 |  |
| 674 | handleOugiUseCommand | `handleOugiUseCommand(rawInput, { token, dispatch, myParticipantId = null })` | 46 |  |
| 721 | handleShinobigamiChatCommand | `handleShinobigamiChatCommand(rawInput, context)` | 5 |  |
| 743 | buildShinobigamiRoundPhaseTemplate | `buildShinobigamiRoundPhaseTemplate()` | 18 |  |

## 依存

- import → [[js.parameters.paramFactory]], [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.saikoro-fiction.skill-table]], [[js.parameters.shinobigami-ougi-box]], [[js.parameters.shinobigami-skills]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
ファンブル値はプロットで変わるが、公開前の値は Core（[[js.game-store]] の buildDerivedContext）で落とされて届かない。ここで公開状態を見に行く必要はないし、見に行ってはいけない。

判定値修正（AnB）は目標値から引く。BCDice の `nSG@s#f>=x` に固定値修正の書式が無く、出目へ足すとスペシャル/ファンブルの判定までずれるため。

忍法コストの合計（ninpouCost）を components に置いているのは、ラウンド終了で戻せる場所がそこしか無いから（パラメータをリセットする口は Core に無い）。パラメータ側の「コスト計」はその写しで、書き戻す元にはしない。記録には何ラウンド目かを一緒に持たせてあり、リセットの経路をどこかで通し損ねても前のラウンドの合計を引きずらない。
<!-- /prose:notes -->
