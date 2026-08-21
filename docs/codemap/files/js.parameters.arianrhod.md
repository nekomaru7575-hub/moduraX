---
source: js/parameters/arianrhod.js
lines: 426
exports: 6
imported_by: 1
api_sha: a1a8bb17a083
prose_sha: a1a8bb17a083
generated: 2026-08-21
tags: [codemap]
---

# js/parameters/arianrhod.js

<!-- prose:summary -->
アリアンロッドRPG 2E のプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
アリアンロッドRPG 2E のプラグイン記述子。パラメータの並び（能力ボーナス7種・判定値修正のレジスタ・MP/フェイト/攻撃力・CL）と、スキルの形（タイミング・SL・2つのコスト・対象）を宣言し、チャットコマンド（`スキル使用(名前)` / `set.awk|hk|dmg(名前)`）を受ける。一覧UI・使用制限・回数制限・修正値・使用処理は汎用のスキル枠組み（[[js.parameters.skill.skill-model]] / [[js.parameters.skill.skill-box]] / [[js.parameters.skill.skill-use]]）にあり、行動セットの発動・判定・ダメージは [[js.parameters.arianrhod-action-set-box]] が持つ。能力ボーナスとCLは editable:false なので、編集の入口は [[js.parameters.arianrhod-ability-box]]（コマ作成ツール専用）だけ。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 56 | const | ARIANRHOD_PARAMETERS | `ARIANRHOD_PARAMETERS` | 全パラメータをlocked:trueにしてある（＝利用者が消せず、既存のコマにも後から補完される）。 |
| 69 | fn | buildArianrhodCharacterParameters | `buildArianrhodCharacterParameters()` |  |
| 105 | const | ARIANRHOD_SKILL_SPEC | `ARIANRHOD_SKILL_SPEC` | アリアンロッドのスキルを、汎用の「スキル」として宣言する。 |
| 159 | fn | readArianrhodSkills | `readArianrhodSkills(components)` | componentsから正規形のスキル一覧を取り出す（js/parameters/dx3.jsのreadDX3Effectsと同型）。 |
| 163 | fn | readArianrhodActionSets | `readArianrhodActionSets(components)` |  |
| 416 | const | ARIANRHOD_PLUGIN | `ARIANRHOD_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 69 | buildArianrhodCharacterParameters | `buildArianrhodCharacterParameters()` | 3 | ✓ |
| 159 | readArianrhodSkills | `readArianrhodSkills(components)` | 3 | ✓ |
| 163 | readArianrhodActionSets | `readArianrhodActionSets(components)` | 3 | ✓ |
| 168 | renderArianrhodCharacterPanel | `renderArianrhodCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, getToken, getEffectiveParameterValue, dispatch, tokenId, allowParameterEdit = false })` | 125 |  |
| 303 | looksLikeArianrhodChatCommand | `looksLikeArianrhodChatCommand(rawInput)` | 4 |  |
| 313 | handleArianrhodChatCommand | `handleArianrhodChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice })` | 92 |  |
| 408 | resetArianrhodComponentsOnPhaseEnd | `resetArianrhodComponentsOnPhaseEnd(components, phase)` | 7 |  |

## 依存

- import → [[js.parameters.arianrhod-ability-box]], [[js.parameters.arianrhod-action-set-box]], [[js.parameters.paramFactory]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.skill.skill-use]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
