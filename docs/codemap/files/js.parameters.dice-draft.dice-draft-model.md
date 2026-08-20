---
source: js/parameters/dice-draft/dice-draft-model.js
lines: 519
exports: 16
imported_by: 6
api_sha: ad6be29f2d73
prose_sha: ad6be29f2d73
generated: 2026-08-20
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
| 150 | fn | createDiceDraftSpec | `createDiceDraftSpec(definition)` | ダイスドラフトの宣言。 |
| 207 | fn | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 一覧の絞り込み（skillTabs）を1つ選んで、そこに出すスキルだけを返す。 |
| 223 | fn | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 目標値へ足す修正の実効値（ドラクルージュの「目標値修正(TB)」）。 |
| 276 | fn | acceptsDie | `acceptsDie(spec, skill, die)` | その目をそのスキルへ置いてよいか。 |
| 313 | fn | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 今そのスキルに乗っているダイスで発動できるか。 |
| 390 | fn | addDiceToPool | `addDiceToPool(draft, dice)` | プールへダイスを足す。 |
| 422 | fn | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | プールにある目 from のダイスを count 個だけ to へ変える。 |
| 474 | fn | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | ダイスを1個動かす。 |
| 502 | fn | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 発動時。 |
| 516 | fn | clearDraft | `clearDraft()` | プールも配置も全部捨てる。 |

## トップレベル関数（LOCAL TASKS 候補）（20）

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
| 150 | createDiceDraftSpec | `createDiceDraftSpec(definition)` | 25 | ✓ |
| 181 | readNumberField | `readNumberField(skill, fieldKey)` | 6 |  |
| 207 | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 4 | ✓ |
| 223 | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 7 | ✓ |
| 235 | parseSumTarget | `parseSumTarget(raw)` | 18 |  |
| 262 | applyTargetModifier | `applyTargetModifier(options, modifier, floor)` | 9 |  |
| 276 | acceptsDie | `acceptsDie(spec, skill, die)` | 15 | ✓ |
| 313 | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 71 | ✓ |
| 390 | addDiceToPool | `addDiceToPool(draft, dice)` | 14 | ✓ |
| 422 | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | 20 | ✓ |
| 444 | extractDie | `extractDie(draft, dieId)` | 24 |  |
| 474 | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | 22 | ✓ |
| 502 | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 12 | ✓ |
| 516 | clearDraft | `clearDraft()` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.dice-draft-panel]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
