---
source: js/parameters/dice-draft/dice-draft-model.js
lines: 541
exports: 16
imported_by: 6
api_sha: ad6be29f2d73
prose_sha: ad6be29f2d73
generated: 2026-09-04
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-model.js

<!-- prose:summary -->
ダイスドラフト（振った目を1個ずつ取っておき、スキルへ割り当てて使う仕組み）のデータモデル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（16）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | const | POOL_SAFETY_MAX | `POOL_SAFETY_MAX` | 壊れた（あるいは意図的に膨らませた）保存データで状態が肥大しないよう、読み出し時に切る。 |
| 22 | fn | createEmptyDraft | `createEmptyDraft()` | 空のドラフト。 |
| 32 | fn | createDie | `createDie(sides, value)` | ダイス1個を作る。 |
| 59 | fn | normalizeDraft | `normalizeDraft(raw, knownSkillNames = null)` | 保存済みのドラフトを正規化する。 |
| 97 | fn | countDice | `countDice(draft)` | そのドラフトが持っているダイスの総数（プール＋配置済み）。 |
| 104 | fn | placedDice | `placedDice(draft, skillName)` | そのスキルに乗っているダイス。 |
| 153 | fn | createDiceDraftSpec | `createDiceDraftSpec(definition)` | ダイスドラフトの宣言。 |
| 219 | fn | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 一覧の絞り込み（skillTabs）を1つ選んで、そこに出すスキルだけを返す。 |
| 235 | fn | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 目標値へ足す修正の実効値（ドラクルージュの「目標値修正(TB)」）。 |
| 288 | fn | acceptsDie | `acceptsDie(spec, skill, die)` | その目をそのスキルへ置いてよいか。 |
| 327 | fn | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 今そのスキルに乗っているダイスで発動できるか。 |
| 412 | fn | addDiceToPool | `addDiceToPool(draft, dice)` | プールへダイスを足す。 |
| 444 | fn | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | プールにある目 from のダイスを count 個だけ to へ変える。 |
| 496 | fn | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | ダイスを1個動かす。 |
| 524 | fn | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 発動時。 |
| 538 | fn | clearDraft | `clearDraft()` | プールも配置も全部捨てる。 |

## トップレベル関数（LOCAL TASKS 候補）（21）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 22 | createEmptyDraft | `createEmptyDraft()` | 3 | ✓ |
| 32 | createDie | `createDie(sides, value)` | 8 | ✓ |
| 41 | normalizeDie | `normalizeDie(raw)` | 7 |  |
| 59 | normalizeDraft | `normalizeDraft(raw, knownSkillNames = null)` | 36 | ✓ |
| 97 | countDice | `countDice(draft)` | 5 | ✓ |
| 104 | placedDice | `placedDice(draft, skillName)` | 3 | ✓ |
| 153 | createDiceDraftSpec | `createDiceDraftSpec(definition)` | 25 | ✓ |
| 186 | acceptsAnyDie | `acceptsAnyDie(requirement, skill)` | 5 |  |
| 193 | readNumberField | `readNumberField(skill, fieldKey)` | 6 |  |
| 219 | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 4 | ✓ |
| 235 | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 7 | ✓ |
| 247 | parseSumTarget | `parseSumTarget(raw)` | 18 |  |
| 274 | applyTargetModifier | `applyTargetModifier(options, modifier, floor)` | 9 |  |
| 288 | acceptsDie | `acceptsDie(spec, skill, die)` | 17 | ✓ |
| 327 | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 79 | ✓ |
| 412 | addDiceToPool | `addDiceToPool(draft, dice)` | 14 | ✓ |
| 444 | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | 20 | ✓ |
| 466 | extractDie | `extractDie(draft, dieId)` | 24 |  |
| 496 | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | 22 | ✓ |
| 524 | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 12 | ✓ |
| 538 | clearDraft | `clearDraft()` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.dice-draft-panel]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
