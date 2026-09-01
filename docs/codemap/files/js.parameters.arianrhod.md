---
source: js/parameters/arianrhod.js
lines: 586
exports: 11
imported_by: 1
api_sha: c30d2255f777
prose_sha: c30d2255f777
generated: 2026-09-01
tags: [codemap]
---

# js/parameters/arianrhod.js

<!-- prose:summary -->
アリアンロッドRPG 2E のプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
アリアンロッドRPG 2E のプラグイン記述子。パラメータの並び（能力ボーナス7種・判定値修正のレジスタ・MP/フェイト/攻撃力・CL・重量上限/携帯重量）と、スキル（タイミング・SL・2つのコスト・対象）・アイテム（重量・数）・コネクション（名前・関係）の形を宣言し、チャットコマンド（`スキル使用(名前)` / `set.awk|hk|dmg(名前)`）を受ける。一覧UI・使用制限・回数制限・修正値・使用処理は汎用のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）にあり、`item.use` / `item.gain` は `item:` の宣言だけで [[js.parameters.registry]] が配る。行動セットの発動・判定・ダメージは [[js.parameters.arianrhod-action-set-box]]、能力ボーナス・汎用判定の入力は [[js.parameters.arianrhod-ability-box]] が持つ。携帯重量は持ち物の「重量×数」の合計で、一覧の下の表示（footerNote）と自動計算が同じ `sumItemWeight` を通る。
<!-- /prose:role -->

## export（11）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 60 | const | ARIANRHOD_PARAMETERS | `ARIANRHOD_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 75 | fn | buildArianrhodCharacterParameters | `buildArianrhodCharacterParameters()` |  |
| 129 | const | ARIANRHOD_SKILL_SPEC | `ARIANRHOD_SKILL_SPEC` | アリアンロッドのスキルを、汎用の「スキル」として宣言する。 |
| 190 | const | ARIANRHOD_ITEM_SPEC | `ARIANRHOD_ITEM_SPEC` | 持ち物。 |
| 211 | const | ARIANRHOD_CONNECTION_SPEC | `ARIANRHOD_CONNECTION_SPEC` | コネクション。 |
| 224 | fn | readArianrhodSkills | `readArianrhodSkills(components)` | componentsから正規形のスキル一覧を取り出す（js/parameters/dx3.jsのreadDX3Effectsと同型）。 |
| 228 | fn | readArianrhodItems | `readArianrhodItems(components)` |  |
| 232 | fn | readArianrhodConnections | `readArianrhodConnections(components)` |  |
| 236 | fn | readArianrhodActionSets | `readArianrhodActionSets(components)` |  |
| 245 | fn | sumItemWeight | `sumItemWeight(items)` | 持ち物の重量の合計。 |
| 573 | const | ARIANRHOD_PLUGIN | `ARIANRHOD_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（11）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 75 | buildArianrhodCharacterParameters | `buildArianrhodCharacterParameters()` | 3 | ✓ |
| 224 | readArianrhodSkills | `readArianrhodSkills(components)` | 3 | ✓ |
| 228 | readArianrhodItems | `readArianrhodItems(components)` | 3 | ✓ |
| 232 | readArianrhodConnections | `readArianrhodConnections(components)` | 3 | ✓ |
| 236 | readArianrhodActionSets | `readArianrhodActionSets(components)` | 3 | ✓ |
| 245 | sumItemWeight | `sumItemWeight(items)` | 7 | ✓ |
| 255 | computeArianrhodDerivedParameters | `computeArianrhodDerivedParameters(parameters, components = {})` | 5 |  |
| 262 | renderArianrhodCharacterPanel | `renderArianrhodCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false })` | 188 |  |
| 460 | looksLikeArianrhodChatCommand | `looksLikeArianrhodChatCommand(rawInput)` | 4 |  |
| 470 | handleArianrhodChatCommand | `handleArianrhodChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice })` | 92 |  |
| 565 | resetArianrhodComponentsOnPhaseEnd | `resetArianrhodComponentsOnPhaseEnd(components, phase)` | 7 |  |

## 依存

- import → [[js.parameters.arianrhod-ability-box]], [[js.parameters.arianrhod-action-set-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
