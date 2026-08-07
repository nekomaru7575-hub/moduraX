---
source: js/parameters/shinobigami.js
lines: 188
exports: 3
imported_by: 1
api_sha: 1277bef0c5dd
prose_sha: 1277bef0c5dd
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/shinobigami.js

<!-- prose:summary -->
シノビガミのプラグイン記述子。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シノビガミのプラグイン記述子。特技表データ（[[js.parameters.shinobigami-skills]]）を、サイコロ・フィクション共通の表モデルとボックス UI に流し込んで組み立てる。システム固有なのは特技名と分野の並びだけで、判定処理は共通側にある。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | const | SKILL_TABLE_COMPONENT_KEY | `SKILL_TABLE_COMPONENT_KEY` | キャラクターの components に特技表を保存するときのキー。 |
| 42 | const | SHINOBIGAMI_SKILL_TABLE | `SHINOBIGAMI_SKILL_TABLE` |  |
| 177 | const | SHINOBIGAMI_PLUGIN | `SHINOBIGAMI_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 35 | buildShinobigamiCheckCommand | `buildShinobigamiCheckCommand({ options, targetNumber })` | 6 |  |
| 57 | readSkillTableState | `readSkillTableState(components)` | 3 |  |
| 65 | renderShinobigamiCharacterPanel | `renderShinobigamiCharacterPanel({ container, mode, canEdit = true, components, onComponentChange, getComponents, getToken, dispatch, rollBCDice })` | 69 |  |
| 137 | looksLikeShinobigamiChatCommand | `looksLikeShinobigamiChatCommand(rawInput)` | 3 |  |
| 147 | handleShinobigamiChatCommand | `handleShinobigamiChatCommand(rawInput, { token, dispatch, rollBCDice })` | 29 |  |

## 依存

- import → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.saikoro-fiction.skill-table]], [[js.parameters.shinobigami-skills]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
