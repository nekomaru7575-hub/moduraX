---
source: js/parameters/shinobigami.js
lines: 1225
exports: 7
imported_by: 1
api_sha: 2d7fd8041b6e
prose_sha: 2d7fd8041b6e
generated: 2026-08-19
tags: [codemap]
---

# js/parameters/shinobigami.js

<!-- prose:summary -->
シノビガミのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シノビガミのプラグイン記述子。特技表データ（[[js.parameters.shinobigami-skills]]）を共通の表モデルへ流し込み、生命力（特技表の枠から自動算出）・忍法（汎用のスキル枠組みへ SHINOBIGAMI_NINPOU_SPEC として宣言）・背景（一覧版。長所／短所のトグル）・忍具（アイテム版。兵糧丸・神通丸・遁甲符を既定の枠として配る）・人物（一覧版。居所/秘密/奥義のチェックと、属性に連動する感情、行ごとの「感情修正」ボタン）・プロットで手番順が決まるラウンド進行テンプレートを束ねる。判定に効く修正値（AdB/AnB/SB/FB）と基準値（{F}/{S}）もここで定義する。表の描画も判定の実行も忍法の使用処理も共通側にあり、システム固有なのは特技データと BCDice コマンドの組み立て（resolveShinobigamiCheck）、「1ラウンドに使える忍法コストの合計はプロットまで」の判定（handleNinpouUseCommand）、そして感情修正が何をするか（runEmotionModifier）だけ。奥義だけは入れ子（奥義改造）と1件ごとの公開先を持つため、共通の枠組みに乗らず専用ボックス（[[js.parameters.shinobigami-ougi-box]]）にしてある。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | const | SKILL_TABLE_COMPONENT_KEY | `SKILL_TABLE_COMPONENT_KEY` | キャラクターの components に特技表を保存するときのキー。 |
| 130 | const | SHINOBIGAMI_SKILL_TABLE | `SHINOBIGAMI_SKILL_TABLE` |  |
| 292 | const | SHINOBIGAMI_NINPOU_SPEC | `SHINOBIGAMI_NINPOU_SPEC` |  |
| 344 | const | SHINOBIGAMI_BACKGROUND_SPEC | `SHINOBIGAMI_BACKGROUND_SPEC` | 背景。 |
| 438 | const | SHINOBIGAMI_PERSON_SPEC | `SHINOBIGAMI_PERSON_SPEC` |  |
| 482 | const | SHINOBIGAMI_TOOL_SPEC | `SHINOBIGAMI_TOOL_SPEC` | 忍具。 |
| 1201 | const | SHINOBIGAMI_PLUGIN | `SHINOBIGAMI_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（36）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 66 | buildShinobigamiCheckCommand | `buildShinobigamiCheckCommand({ options, targetNumber })` | 6 |  |
| 96 | resolveShinobigamiCheck | `resolveShinobigamiCheck({ options, targetNumber, getParam })` | 33 |  |
| 207 | buildShinobigamiCharacterParameters | `buildShinobigamiCharacterParameters()` | 3 |  |
| 219 | computePlotValue | `computePlotValue(context)` | 4 |  |
| 225 | computeFumbleBase | `computeFumbleBase(context)` | 3 |  |
| 230 | computeRoundNumber | `computeRoundNumber(context)` | 3 |  |
| 245 | computeShinobigamiDerivedParameters | `computeShinobigamiDerivedParameters(_parameters, components = {}, context = {})` | 11 |  |
| 258 | readSkillTableState | `readSkillTableState(components)` | 3 |  |
| 276 | buildSkillChoices | `buildSkillChoices()` | 15 |  |
| 357 | readBackgroundList | `readBackgroundList(components)` | 5 |  |
| 381 | buildEmotionChoices | `buildEmotionChoices()` | 5 |  |
| 388 | emotionGroupOf | `emotionGroupOf(attitude)` | 3 |  |
| 399 | runEmotionModifier | `runEmotionModifier({ skill, context })` | 38 |  |
| 467 | readPersonList | `readPersonList(components)` | 5 |  |
| 490 | readToolList | `readToolList(components)` | 5 |  |
| 497 | readNinpouList | `readNinpouList(components)` | 3 |  |
| 516 | readNinpouCost | `readNinpouCost(components, roundNumber)` | 6 |  |
| 527 | ninpouCostOf | `ninpouCostOf(ninpou)` | 5 |  |
| 534 | describeNinpouSkill | `describeNinpouSkill(cellId)` | 4 |  |
| 545 | resetShinobigamiComponentsOnPhaseEnd | `resetShinobigamiComponentsOnPhaseEnd(components, phase)` | 12 |  |
| 562 | renderShinobigamiCharacterPanel | `renderShinobigamiCharacterPanel({ container, mode, canEdit = true, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, generateBuffId, dispatch, rollBCDice, findTokenByName = null, participants = {}, myParticipantId = null })` | **215** |  |
| 787 | looksLikeShinobigamiChatCommand | `looksLikeShinobigamiChatCommand(rawInput)` | 5 |  |
| 798 | handleSkillCheckCommand | `handleSkillCheckCommand(rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue })` | 30 |  |
| 834 | handleNinpouUseCommand | `handleNinpouUseCommand(rawInput, context)` | 85 |  |
| 931 | handleOugiUseCommand | `handleOugiUseCommand(rawInput, { token, dispatch, myParticipantId = null })` | 46 |  |
| 978 | handleShinobigamiChatCommand | `handleShinobigamiChatCommand(rawInput, context)` | 5 |  |
| 1002 | sheetText | `sheetText(value)` | 3 |  |
| 1007 | sheetChecked | `sheetChecked(value)` | 3 |  |
| 1012 | sheetNumber | `sheetNumber(value)` | 4 |  |
| 1026 | cellIdFromSheetId | `cellIdFromSheetId(rawId)` | 8 |  |
| 1047 | importShinobigamiSkillTableFromSheet | `importShinobigamiSkillTableFromSheet(json)` | 33 |  |
| 1085 | importShinobigamiNinpouFromSheet | `importShinobigamiNinpouFromSheet(json)` | 15 |  |
| 1102 | importShinobigamiBackgroundFromSheet | `importShinobigamiBackgroundFromSheet(json)` | 9 |  |
| 1114 | importShinobigamiPersonsFromSheet | `importShinobigamiPersonsFromSheet(json)` | 21 |  |
| 1141 | importShinobigamiCharacterJson | `importShinobigamiCharacterJson(json)` | 24 |  |
| 1182 | buildShinobigamiRoundPhaseTemplate | `buildShinobigamiRoundPhaseTemplate()` | 18 |  |

## 依存

- import → [[js.parameters.paramFactory]], [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.saikoro-fiction.skill-table]], [[js.parameters.shinobigami-ougi-box]], [[js.parameters.shinobigami-skills]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
ファンブル値はプロットで変わるが、公開前の値は Core（[[js.game-store]] の buildDerivedContext）で落とされて届かない。ここで公開状態を見に行く必要はないし、見に行ってはいけない。

判定値修正（AnB）は目標値から引く。BCDice の `nSG@s#f>=x` に固定値修正の書式が無く、出目へ足すとスペシャル/ファンブルの判定までずれるため。

忍法コストの合計（ninpouCost）を components に置いているのは、ラウンド終了で戻せる場所がそこしか無いから（パラメータをリセットする口は Core に無い）。パラメータ側の「コスト計」はその写しで、書き戻す元にはしない。記録には何ラウンド目かを一緒に持たせてあり、リセットの経路をどこかで通し損ねても前のラウンドの合計を引きずらない。

感情修正は**他人のコマ**へバフを付ける。名前の完全一致で引くので、人物欄の名前が盤面のコマとずれていると何も起きない（理由は出す）。他人のコマへバフを付けること自体はチャットの `バフ>対象コマ名(...)` で既にできるので、新しい権限は増えていない。

人物の感情は12件すべてを選択肢として宣言し、画面に出す分だけを属性で絞る（filterOptions）。絞り込みを宣言そのものに効かせると、属性を切り替えた瞬間に保存済みの感情が既定へ落ちる。

Webキャラクターシートの取り込みで**推測に頼っている箇所は無い**が、シート側の並びに依存している点が2つある。ギャップは `skills.a`〜`f` の6つで、**`f` が器術の左（＝妖術との境目）**から始まり `a`=体術の左…と続く（実際のシートの見出し行で確認済み）。感情は番号（1〜6）で保存されるので、[[js.parameters.shinobigami-skills]] の `SHINOBIGAMI_EMOTIONS` の**並び順を変えると別の感情として取り込まれる**。

取得特技は2か所（`learned[].id` と `skills.rowN.checkM`）のどちらにも書かれうるので両方を見る。片方だけだとシートによって取り込みが空になる。

左右を繋ぐか（cyclic）は取り込みで変えない（既定のままオフ）。シートの表自体は繋がった形だが、繋ぐかどうかは卓の運用で決まり、距離＝目標値が変わるため。`skills.f` が塗られていればギャップとしては入るので、特技表ボックスのチェックを入れるだけでシートどおりになる。
<!-- /prose:notes -->
