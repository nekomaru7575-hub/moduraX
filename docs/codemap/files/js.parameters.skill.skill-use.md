---
source: js/parameters/skill/skill-use.js
lines: 264
exports: 4
imported_by: 8
api_sha: d604684a61c2
prose_sha: d604684a61c2
generated: 2026-09-10
tags: [codemap]
---

# js/parameters/skill/skill-use.js

<!-- prose:summary -->
スキルの「使用」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
スキルの「使用」を、システムに依存しない形で1本にまとめた場所。使用制限の判定 → 修正値を自身へのバフとして付与 → コスト（DX3の上昇侵蝕率のような、使用時にパラメータへ加算される値）の反映 → 使用回数を進める → ログを出す、までを runSkillUse が通しで行う。1件だけ使う場合も複数をまとめて使う場合（コンボ発動）も同じ関数を通り、違いは引数（`expirePhaseFallback` / `applyCosts` / `tag`）で吸収する。判定と正規化そのものは [[js.parameters.skill.skill-model]] が持ち、ここは手順の組み立てだけ。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | fn | buildUseFailureMessage | `buildUseFailureMessage(spec, blocked)` | 使用できないスキルがあったときにユーザーへ出す文面。 |
| 57 | fn | sumSkillCosts | `sumSkillCosts(spec, skills)` | 使用時に払うコスト（specのfields[].onUseで宣言された欄）を、パラメータごとに合計する。 |
| 92 | fn | applySkillCosts | `applySkillCosts({ costs, token, tokenId, dispatch })` | コストをパラメータの基礎値へ加算する。 |
| 170 | fn | runSkillUse | `runSkillUse({ spec, targetSkills, allSkills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, logTitle, logDetail = '', logSystem, chatCommand, onLog = null, expirePhaseFallback = null, tag = null, applyCosts = true, buffNameFallback = '' })` | スキルを使用する。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 27 | buildUseFailureMessage | `buildUseFailureMessage(spec, blocked)` | 6 | ✓ |
| 39 | costLabelFromField | `costLabelFromField(spec, field, skill)` | 6 |  |
| 57 | sumSkillCosts | `sumSkillCosts(spec, skills)` | 28 | ✓ |
| 92 | applySkillCosts | `applySkillCosts({ costs, token, tokenId, dispatch })` | 10 | ✓ |
| 111 | groupBuffs | `groupBuffs(spec, skills, context, expirePhaseFallback)` | 29 |  |
| 170 | runSkillUse | `runSkillUse({ spec, targetSkills, allSkills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId, onSaveSkills, logTitle, logDetail = '', logSystem, chatCommand, onLog = null, expirePhaseFallback = null, tag = null, applyCosts = true, buffNameFallback = '' })` | 94 | ✓ |

## 依存

- import → [[js.parameters.skill.skill-model]]
- imported by → [[js.parameters.arianrhod-action-set-box]], [[js.parameters.arianrhod]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3]], [[js.parameters.futarisousa]], [[js.parameters.gcrest]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
store 操作（`dispatch` / `getToken` など）は import せず引数で受け取る。ここから [[js.game-store]] を import すると game-store → [[js.parameters.registry]] → プラグイン → ここ の循環 import になるため。

コストは「今払うか」を呼び出し側が決める。コンボは発動時ではなくダメージロール後に払うので `applyCosts: false` で呼ばれる。ここを既定の true のままにすると二重に払う。

使えないスキルがあったときは黙って何も起きないようにしない（buildUseFailureMessage が「なぜ使えないか」まで文にする）。押したのに反応が無いようにしか見えないため。
<!-- /prose:notes -->
