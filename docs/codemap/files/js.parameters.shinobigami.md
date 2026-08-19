---
source: js/parameters/shinobigami.js
lines: 845
exports: 5
imported_by: 1
api_sha: db344c628c60
prose_sha: db344c628c60
generated: 2026-08-19
tags: [codemap]
---

# js/parameters/shinobigami.js

<!-- prose:summary -->
シノビガミのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シノビガミのプラグイン記述子。特技表データ（[[js.parameters.shinobigami-skills]]）を共通の表モデルへ流し込み、生命力（特技表の枠から自動算出）・忍法（汎用のスキル枠組みへ SHINOBIGAMI_NINPOU_SPEC として宣言）・背景（同じ枠組みの一覧版。createListSpec に長所／短所のトグルを1つ足しただけ）・プロットで手番順が決まるラウンド進行テンプレートを束ねる。判定に効く修正値（AdB/AnB/SB/FB）と基準値（{F}/{S}）もここで定義する。表の描画も判定の実行も忍法の使用処理も共通側にあり、システム固有なのは特技データと BCDice コマンドの組み立て（resolveShinobigamiCheck）、そして「1ラウンドに使える忍法コストの合計はプロットまで」の判定（handleNinpouUseCommand）だけ。奥義だけは入れ子（奥義改造）と1件ごとの公開先を持つため、共通の枠組みに乗らず専用ボックス（[[js.parameters.shinobigami-ougi-box]]）にしてある。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 29 | const | SKILL_TABLE_COMPONENT_KEY | `SKILL_TABLE_COMPONENT_KEY` | キャラクターの components に特技表を保存するときのキー。 |
| 128 | const | SHINOBIGAMI_SKILL_TABLE | `SHINOBIGAMI_SKILL_TABLE` |  |
| 290 | const | SHINOBIGAMI_NINPOU_SPEC | `SHINOBIGAMI_NINPOU_SPEC` |  |
| 342 | const | SHINOBIGAMI_BACKGROUND_SPEC | `SHINOBIGAMI_BACKGROUND_SPEC` | 背景。 |
| 827 | const | SHINOBIGAMI_PLUGIN | `SHINOBIGAMI_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（22）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 64 | buildShinobigamiCheckCommand | `buildShinobigamiCheckCommand({ options, targetNumber })` | 6 |  |
| 94 | resolveShinobigamiCheck | `resolveShinobigamiCheck({ options, targetNumber, getParam })` | 33 |  |
| 205 | buildShinobigamiCharacterParameters | `buildShinobigamiCharacterParameters()` | 3 |  |
| 217 | computePlotValue | `computePlotValue(context)` | 4 |  |
| 223 | computeFumbleBase | `computeFumbleBase(context)` | 3 |  |
| 228 | computeRoundNumber | `computeRoundNumber(context)` | 3 |  |
| 243 | computeShinobigamiDerivedParameters | `computeShinobigamiDerivedParameters(_parameters, components = {}, context = {})` | 11 |  |
| 256 | readSkillTableState | `readSkillTableState(components)` | 3 |  |
| 274 | buildSkillChoices | `buildSkillChoices()` | 15 |  |
| 355 | readBackgroundList | `readBackgroundList(components)` | 5 |  |
| 362 | readNinpouList | `readNinpouList(components)` | 3 |  |
| 381 | readNinpouCost | `readNinpouCost(components, roundNumber)` | 6 |  |
| 392 | ninpouCostOf | `ninpouCostOf(ninpou)` | 5 |  |
| 399 | describeNinpouSkill | `describeNinpouSkill(cellId)` | 4 |  |
| 410 | resetShinobigamiComponentsOnPhaseEnd | `resetShinobigamiComponentsOnPhaseEnd(components, phase)` | 12 |  |
| 427 | renderShinobigamiCharacterPanel | `renderShinobigamiCharacterPanel({ container, mode, canEdit = true, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, generateBuffId, dispatch, rollBCDice, participants = {}, myParticipantId = null })` | 158 |  |
| 595 | looksLikeShinobigamiChatCommand | `looksLikeShinobigamiChatCommand(rawInput)` | 5 |  |
| 606 | handleSkillCheckCommand | `handleSkillCheckCommand(rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue })` | 30 |  |
| 642 | handleNinpouUseCommand | `handleNinpouUseCommand(rawInput, context)` | 85 |  |
| 739 | handleOugiUseCommand | `handleOugiUseCommand(rawInput, { token, dispatch, myParticipantId = null })` | 46 |  |
| 786 | handleShinobigamiChatCommand | `handleShinobigamiChatCommand(rawInput, context)` | 5 |  |
| 808 | buildShinobigamiRoundPhaseTemplate | `buildShinobigamiRoundPhaseTemplate()` | 18 |  |

## 依存

- import → [[js.parameters.paramFactory]], [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.saikoro-fiction.skill-table]], [[js.parameters.shinobigami-ougi-box]], [[js.parameters.shinobigami-skills]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
ファンブル値はプロットで変わるが、公開前の値は Core（[[js.game-store]] の buildDerivedContext）で落とされて届かない。ここで公開状態を見に行く必要はないし、見に行ってはいけない。

判定値修正（AnB）は目標値から引く。BCDice の `nSG@s#f>=x` に固定値修正の書式が無く、出目へ足すとスペシャル/ファンブルの判定までずれるため。

忍法コストの合計（ninpouCost）を components に置いているのは、ラウンド終了で戻せる場所がそこしか無いから（パラメータをリセットする口は Core に無い）。パラメータ側の「コスト計」はその写しで、書き戻す元にはしない。記録には何ラウンド目かを一緒に持たせてあり、リセットの経路をどこかで通し損ねても前のラウンドの合計を引きずらない。
<!-- /prose:notes -->
