---
source: js/parameters/skill/skill-model.js
lines: 663
exports: 18
imported_by: 12
api_sha: 4be371c9a6c9
prose_sha: 4be371c9a6c9
generated: 2026-09-01
tags: [codemap]
---

# js/parameters/skill/skill-model.js

<!-- prose:summary -->
「キャラが選んで取得するタイプの能力」＝スキルの、システムに依存しないデータモデル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「キャラが取得して使う能力」（DX3のエフェクト、シノビガミの忍法）の、システムに依存しないデータモデル。1件の形（名前・内容・システム固有の欄・回数制限・使用条件・使用時の修正）と、その正規化・使用可否の判定・使用回数の増減・フェーズ終了のリセットを持つ。システム固有の知識は一切持たず、すべてプラグインが `createSkillSpec()` で宣言する。DOMには触れない（サーバーもこのファイルを読む）ので、UIは [[js.parameters.skill.skill-box]]、使用処理は [[js.parameters.skill.skill-use]]、式の評価は [[js.parameters.skill.skill-formula]] にある。

**同じモデルで3つの形を書ける**：能力（`createSkillSpec`）、名前と内容だけの一覧（`createListSpec`。ドラクルージュの逸話、シノビガミの背景）、個数を持ち消費して減る持ち物（`createItemSpec`。シノビガミの忍具。使用と増減は [[js.parameters.skill.item-use]]）。違いは使わない節を落とすかどうかと、`quantity` を宣言するかどうかだけで、保存される形もボックスも共通。
<!-- /prose:role -->

## export（18）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 41 | const | EXPIRE_PHASE_CHOICES | `EXPIRE_PHASE_CHOICES` | バフの効果時間の選択肢。 |
| 60 | fn | resolveExpirePhase | `resolveExpirePhase(stored, fallback = null)` | スキルのexpirePhase（保存値）を、ADD_BUFFへ渡す値へ変換する。 |
| 185 | fn | clampQuantity | `clampQuantity(spec, value)` | 個数を宣言の範囲へ丸める。 |
| 192 | fn | createSkillSpec | `createSkillSpec(definition)` | id: string, noun: string, このシステムでのスキルの呼び名（DX3なら'エフェクト'）。 |
| 276 | fn | createListSpec | `createListSpec(definition)` | 「名前・（システム固有の欄）・内容」だけを並べる一覧の宣言。 |
| 305 | fn | createItemSpec | `createItemSpec(definition)` | 「名前・（システム固有の欄）・効果・個数」を持つアイテムの宣言。 |
| 318 | fn | isChoiceField | `isChoiceField(field)` | 選択肢から選ぶ欄か（'select' と 'toggle'）。 |
| 337 | fn | buildSkillUseCommandPattern | `buildSkillUseCommandPattern(spec)` | チャットコマンドの書式「（呼び名）使用（スキル名）」。 |
| 341 | fn | buildSkillUseCommand | `buildSkillUseCommand(spec, skillName)` |  |
| 422 | fn | normalizeSkill | `normalizeSkill(spec, raw)` | 保存済みの1件を、欠けたフィールドを補った正規形へ揃える。 |
| 511 | fn | normalizeSkillList | `normalizeSkillList(spec, rawList)` | componentsに保存された一覧を正規形の配列にする。 |
| 529 | fn | findSkillByName | `findSkillByName(skills, name)` | 一覧から名前（完全一致）で1件引く。 |
| 537 | fn | analyzeMod | `analyzeMod(spec, skill, mod, { token, getEffectiveParameterValue })` | 修正1件の解析結果（値＋なぜその値になったか）。 |
| 545 | fn | buildLowestModMeta | `buildLowestModMeta(spec, paramId, mods)` | 複数の修正のうち、追加欄の値が最も小さいもの（DX3のクリティカル値下限は 一番低い＝一番緩いものを適用する）を1つのmetaにまとめる。 |
| 563 | fn | checkSkillUsable | `checkSkillUsable(spec, skill, context)` | このスキルを今使えるか。 |
| 599 | fn | collectModProblems | `collectModProblems(spec, skills, context)` | 修正値の式のうち、評価できず0になったものの説明。 |
| 623 | fn | bumpSkillUsage | `bumpSkillUsage(spec, skills, skillNames)` | 指定スキルの使用回数を全期間+1した新しい一覧を返す（上限が無い期間も記録だけはしておく）。 |
| 643 | fn | resetSkillUsageOnPhaseEnd | `resetSkillUsageOnPhaseEnd(spec, rawList, phase)` | フェーズ終了で、その期間の使用回数を0へ戻す。 |

## トップレベル関数（LOCAL TASKS 候補）（24）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 60 | resolveExpirePhase | `resolveExpirePhase(stored, fallback = null)` | 5 | ✓ |
| 185 | clampQuantity | `clampQuantity(spec, value)` | 6 | ✓ |
| 192 | createSkillSpec | `createSkillSpec(definition)` | 67 | ✓ |
| 276 | createListSpec | `createListSpec(definition)` | 13 | ✓ |
| 305 | createItemSpec | `createItemSpec(definition)` | 3 | ✓ |
| 318 | isChoiceField | `isChoiceField(field)` | 3 | ✓ |
| 323 | defaultSelectValue | `defaultSelectValue(field)` | 3 |  |
| 329 | escapeRegExp | `escapeRegExp(text)` | 3 |  |
| 337 | buildSkillUseCommandPattern | `buildSkillUseCommandPattern(spec)` | 3 | ✓ |
| 341 | buildSkillUseCommand | `buildSkillUseCommand(spec, skillName)` | 3 | ✓ |
| 345 | toNumber | `toNumber(value, fallback = 0)` | 4 |  |
| 352 | normalizeLimitMax | `normalizeLimitMax(raw)` | 5 |  |
| 360 | modsFromLegacyCombo | `modsFromLegacyCombo(spec, combo)` | 25 |  |
| 386 | normalizeMod | `normalizeMod(spec, raw)` | 20 |  |
| 407 | normalizeCondition | `normalizeCondition(raw)` | 7 |  |
| 422 | normalizeSkill | `normalizeSkill(spec, raw)` | 74 | ✓ |
| 511 | normalizeSkillList | `normalizeSkillList(spec, rawList)` | 16 | ✓ |
| 529 | findSkillByName | `findSkillByName(skills, name)` | 3 | ✓ |
| 537 | analyzeMod | `analyzeMod(spec, skill, mod, { token, getEffectiveParameterValue })` | 3 | ✓ |
| 545 | buildLowestModMeta | `buildLowestModMeta(spec, paramId, mods)` | 11 | ✓ |
| 563 | checkSkillUsable | `checkSkillUsable(spec, skill, context)` | 31 | ✓ |
| 599 | collectModProblems | `collectModProblems(spec, skills, context)` | 19 | ✓ |
| 623 | bumpSkillUsage | `bumpSkillUsage(spec, skills, skillNames)` | 14 | ✓ |
| 643 | resetSkillUsageOnPhaseEnd | `resetSkillUsageOnPhaseEnd(spec, rawList, phase)` | 20 | ✓ |

## 依存

- import → [[js.parameters.skill.skill-formula]]
- imported by → [[js.dice-draft-panel]], [[js.parameters.arianrhod]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.futarisousa]], [[js.parameters.gcrest]], [[js.parameters.shinobigami]], [[js.parameters.skill.item-use]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-use]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
**「使わない仕組みを落とす」宣言は、UIを隠すだけでなく読み出しでも効く。** `allowMods:false` / `allowConditions:false` のspecは、保存済みの修正・使用条件が残っていても normalizeSkill が捨てる。画面に出ていない修正でバフが飛んだり、見えない条件で使用が止まったりしないようにするため。`modTargets` を空にするだけでは足りない（ボックスの「その他のパラメータ」から全パラメータが選べてしまう）。

選択肢から選ぶ欄（`select` と `toggle`。isChoiceField）は、**選択肢に無い値を既定へ落とす**。存在しない値のまま持っていると、UIでは先頭が選ばれて見えるのに保存値は別物、というずれ方をする。裏を返すと、選択肢の `value` を後から変えると保存済みのデータが既定へ倒れるので、表示ラベルだけを変えたいときは `label` の側を直すこと。

`periods[].fixedMax` を宣言した期間の上限は、読み出しのたびに宣言値へ揃う。保存済みデータや手で書き換えられたJSONでも上限が緩まない。

**`quantity` は宣言した spec のときだけキーが生える。** 宣言していない spec（忍法・背景・逸話）の保存形を変えないため。この宣言の有無が「アイテムかどうか」の唯一の判定で、ボックスも [[js.parameters.skill.item-use]] もこれを見る。

`hasUseCommand:true` は「一覧の下にコピー用ボタンを出す」宣言でしかなく、実際にそのコマンドを受け付けるかどうかは保証しない。`buildSkillUseCommandPattern` でプラグイン側が本当に「（呼び名）使用（名前）」を処理していることを確認してから立てること（現状は忍法だけ。DX3のエフェクト・アリアンロッドのスキル・ドラクルージュの行いも同じ書式で使えるが、ボタンはまだ出していない）。
<!-- /prose:notes -->
