---
source: js/parameters/dice-draft/dice-draft-model.js
lines: 587
exports: 19
imported_by: 6
api_sha: 58fe9088b049
prose_sha: 58fe9088b049
generated: 2026-09-14
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-model.js

<!-- prose:summary -->
ダイスドラフト（振った目を1個ずつ取っておき、スキルへ割り当てて使う仕組み）のデータモデル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ダイスドラフトの保存形（token.components.diceDraft ＝ pool と placements）と、何を置けるか・いつ発動できるかの規則を純関数で持つ。DOMもstoreも触らない：server/index.js から import 連鎖で読まれるため。ドラッグ・ダイスの絵・store操作は [[js.check-view.dice-draft-view]]、プールへ足すコマンドは [[js.parameters.dice-draft.dice-draft-pool]] が持つ。目標値の欄の読み取り（parseSumTarget）と修正値（readTargetModifier）もここにある。コマごとに使わせない・中身を伏せる宣言（`unavailableReason` / `canViewSkillDetails`）を読むのも diceDraftUnavailableReason / canViewDiceDraftSkillDetails のここだけで、振る・dice.*・発動の入口とパネルが同じ答えを出す。
<!-- /prose:role -->

## export（19）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | const | POOL_SAFETY_MAX | `POOL_SAFETY_MAX` | 壊れた（あるいは意図的に膨らませた）保存データで状態が肥大しないよう、読み出し時に切る。 |
| 22 | fn | createEmptyDraft | `createEmptyDraft()` | 空のドラフト。 |
| 32 | fn | createDie | `createDie(sides, value)` | ダイス1個を作る。 |
| 59 | fn | normalizeDraft | `normalizeDraft(raw, knownSkillNames = null)` | 保存済みのドラフトを正規化する。 |
| 97 | fn | countDice | `countDice(draft)` | そのドラフトが持っているダイスの総数（プール＋配置済み）。 |
| 104 | fn | placedDice | `placedDice(draft, skillName)` | そのスキルに乗っているダイス。 |
| 161 | fn | createDiceDraftSpec | `createDiceDraftSpec(definition)` | ダイスドラフトの宣言。 |
| 197 | fn | diceDraftUnavailableReason | `diceDraftUnavailableReason(spec, token)` | そのコマがドラフトを使えない理由。 |
| 209 | fn | canViewDiceDraftSkillDetails | `canViewDiceDraftSkillDetails(spec, token, participantId)` | パネルでスキルの中身（状態の1行・判定値の欄）を見せてよいか。 |
| 258 | fn | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 一覧の絞り込み（skillTabs）を1つ選んで、そこに出すスキルだけを返す。 |
| 274 | fn | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 目標値へ足す修正の実効値（ドラクルージュの「目標値修正(TB)」）。 |
| 289 | fn | parseSumTarget | `parseSumTarget(raw)` | 目標値の欄を読む。 |
| 316 | fn | acceptsDie | `acceptsDie(spec, skill, die)` | その目をそのスキルへ置いてよいか。 |
| 360 | fn | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 今そのスキルに乗っているダイスで発動できるか。 |
| 458 | fn | addDiceToPool | `addDiceToPool(draft, dice)` | プールへダイスを足す。 |
| 490 | fn | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | プールにある目 from のダイスを count 個だけ to へ変える。 |
| 542 | fn | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | ダイスを1個動かす。 |
| 570 | fn | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 発動時。 |
| 584 | fn | clearDraft | `clearDraft()` | プールも配置も全部捨てる。 |

## トップレベル関数（LOCAL TASKS 候補）（23）

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
| 161 | createDiceDraftSpec | `createDiceDraftSpec(definition)` | 28 | ✓ |
| 197 | diceDraftUnavailableReason | `diceDraftUnavailableReason(spec, token)` | 5 | ✓ |
| 209 | canViewDiceDraftSkillDetails | `canViewDiceDraftSkillDetails(spec, token, participantId)` | 4 | ✓ |
| 221 | acceptsAnyDie | `acceptsAnyDie(requirement, skill)` | 5 |  |
| 228 | readNumberField | `readNumberField(skill, fieldKey)` | 6 |  |
| 258 | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 4 | ✓ |
| 274 | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 7 | ✓ |
| 289 | parseSumTarget | `parseSumTarget(raw)` | 16 | ✓ |
| 307 | applyTargetModifier | `applyTargetModifier(value, modifier, floor)` | 4 |  |
| 316 | acceptsDie | `acceptsDie(spec, skill, die)` | 17 | ✓ |
| 360 | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 92 | ✓ |
| 458 | addDiceToPool | `addDiceToPool(draft, dice)` | 14 | ✓ |
| 490 | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | 20 | ✓ |
| 512 | extractDie | `extractDie(draft, dieId)` | 24 |  |
| 542 | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | 22 | ✓ |
| 570 | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 12 | ✓ |
| 584 | clearDraft | `clearDraft()` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.check-view.dice-draft-view]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
ダイス1個は pool かいずれか1つのスキルの下の、どちらか一方にだけ存在する（不変条件）。読み出し時に POOL_SAFETY_MAX などで切るので、保存データを膨らませても状態は肥大しない。
<!-- /prose:notes -->
