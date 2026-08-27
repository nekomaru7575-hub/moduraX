---
source: js/parameters/futarisousa.js
lines: 882
exports: 2
imported_by: 1
api_sha: a90379a6f246
prose_sha: a90379a6f246
generated: 2026-08-27
tags: [codemap]
---

# js/parameters/futarisousa.js

<!-- prose:summary -->
バディサスペンスTRPG フタリソウサ のプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
フタリソウサのプラグイン記述子。コマが探偵／助手／NPCのどれであるかを「属性」パラメータで持ち、属性ごとに持てるパラメータとボックスを出し分ける（作りは [[js.parameters.dracurouge]] のPC/NPCと同じで、SET_PARAMETER_VISIBILITY で一覧側もそろえる）。技能だけは専用ボックス [[js.parameters.futarisousa-skill-box]]、アクション・感情・ゲストはスキル枠組みの一覧（[[js.parameters.skill.skill-model]] の createListSpec）に乗せている。心労はチェック3つから computeDerivedParameters で導く。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 57 | const | FUTARISOUSA_BCDICE_SYSTEM | `FUTARISOUSA_BCDICE_SYSTEM` | BCDice側のシステムID。 |
| 870 | const | FUTARISOUSA_PLUGIN | `FUTARISOUSA_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（28）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 168 | buildFutariSousaCharacterParameters | `buildFutariSousaCharacterParameters()` | 5 |  |
| 174 | normalizeCharType | `normalizeCharType(value)` | 5 |  |
| 180 | readCharType | `readCharType(parameters)` | 3 |  |
| 186 | definitionsFor | `definitionsFor(charType)` | 7 |  |
| 195 | visibleParamIdsFor | `visibleParamIdsFor(charType)` | 6 |  |
| 203 | normalizeStressChecks | `normalizeStressChecks(raw)` | 8 |  |
| 212 | readActions | `readActions(components)` | 3 |  |
| 216 | readEmotions | `readEmotions(components)` | 3 |  |
| 220 | readGuests | `readGuests(components)` | 3 |  |
| 226 | computeFutariSousaDerivedParameters | `computeFutariSousaDerivedParameters(parameters, components = {})` | 6 |  |
| 240 | resolveMarginPayer | `resolveMarginPayer({ token, findTokenByName })` | 30 |  |
| 274 | describeMarginChange | `describeMarginChange(payer, before, after)` | 8 |  |
| 287 | runFutariSousaActionUse | `runFutariSousaActionUse({ action, allActions, token, dispatch, findTokenByName, getEffectiveParameterValue, generateBuffId, chatCommand })` | 61 |  |
| 350 | runActionUseFromBox | `runActionUseFromBox({ skill, context })` | 19 |  |
| 370 | looksLikeFutariSousaChatCommand | `looksLikeFutariSousaChatCommand(rawInput)` | 3 |  |
| 374 | handleFutariSousaChatCommand | `handleFutariSousaChatCommand(rawInput, context)` | 26 |  |
| 417 | sheetText | `sheetText(value)` | 3 |  |
| 422 | sheetChecked | `sheetChecked(value)` | 4 |  |
| 443 | importSkillsFromSheet | `importSkillsFromSheet(json)` | 9 |  |
| 454 | importStressFromSheet | `importStressFromSheet(json)` | 4 |  |
| 460 | sheetCost | `sheetCost(value)` | 4 |  |
| 465 | importActionsFromSheet | `importActionsFromSheet(json)` | 13 |  |
| 479 | importGuestsFromSheet | `importGuestsFromSheet(json)` | 13 |  |
| 496 | importEmotionsFromSheet | `importEmotionsFromSheet(json)` | 14 |  |
| 515 | importFutariSousaParameters | `importFutariSousaParameters(json, charType)` | 18 |  |
| 540 | importFutariSousaCharacterJson | `importFutariSousaCharacterJson(json)` | 28 |  |
| 569 | buildTypeSelect | `buildTypeSelect(charType)` | 11 |  |
| 581 | renderFutariSousaCharacterPanel | `renderFutariSousaCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, dispatch, getToken, generateBuffId, findTokenByName, tokenId })` | **288** |  |

## 依存

- import → [[js.parameters.futarisousa-skill-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]], [[js.read-only-form]], [[js.visibility]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
アクションのコストは、助手なら自分・探偵ならパートナー（助手）の「余裕」から引く。他のコマのパラメータを減らす経路はこれが初めてで、スキル枠組みのコスト宣言（field.onUse）では書けない（自分の基礎値にしか払えず、残量も見ないため）。そこで runSkillUse を applyCosts:false で呼び、支払いは runFutariSousaActionUse が自前で行う。

順序が肝で、**弾くのは runSkillUse より前、払うのは後**。createListSpec のスキルは使用可否の判定を持たないので runSkillUse は必ずログを出す。後で弾くと「使用ログが出てから足りないと言われる」ことになる。

パートナーは tokenId ではなく**コマ名**で持つ。改名すると切れるし同名なら先頭が採られるが、選ばせるUIが無いこと・盤面の無いコマ作成ツールでは選べないこと・別の部屋へJSONを持ち込むとIDが無効になることの3点で、名前のほうが実用的。[[js.parameters.shinobigami]] の感情修正と同じ割り切り。

属性を切り替えても components は消さない（見えなくなるだけ）。取り消しの効かない画面で1クリックで全消しになるのを避けるため。
<!-- /prose:notes -->
