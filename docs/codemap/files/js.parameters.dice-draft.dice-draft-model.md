---
source: js/parameters/dice-draft/dice-draft-model.js
lines: 630
exports: 21
imported_by: 6
api_sha: ff7f24c43280
prose_sha: ff7f24c43280
generated: 2026-09-17
tags: [codemap]
---

# js/parameters/dice-draft/dice-draft-model.js

<!-- prose:summary -->
ダイスドラフト（振った目を1個ずつ取っておき、スキルへ割り当てて使う仕組み）のデータモデル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ダイスドラフトの保存形（token.components.diceDraft ＝ pool と placements）と、何を置けるか・いつ発動できるかの規則を純関数で持つ。DOMもstoreも触らない：server/index.js から import 連鎖で読まれるため。ドラッグ・ダイスの絵・store操作は [[js.check-view.dice-draft-view]]、プールへ足す／目を変えるコマンドは [[js.parameters.dice-draft.dice-draft-pool]] が持つ（目の書き換えそのもの changePoolDice はここ）。「自動で置く」の規則（supportsAutoPlace / autoPlaceDice。対応する数字が決まっている match 規則だけ）、目標値の欄の読み取り（parseSumTarget）と修正値（readTargetModifier）もここにある。コマごとに使わせない・中身を伏せる宣言（`unavailableReason` / `canViewSkillDetails`）を読むのも diceDraftUnavailableReason / canViewDiceDraftSkillDetails のここだけで、振る・dice.*・発動の入口とパネルが同じ答えを出す。
<!-- /prose:role -->

## export（21）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | const | POOL_SAFETY_MAX | `POOL_SAFETY_MAX` | 壊れた（あるいは意図的に膨らませた）保存データで状態が肥大しないよう、読み出し時に切る。 |
| 22 | fn | createEmptyDraft | `createEmptyDraft()` | 空のドラフト。 |
| 32 | fn | createDie | `createDie(sides, value)` | ダイス1個を作る。 |
| 59 | fn | normalizeDraft | `normalizeDraft(raw, knownSkillNames = null)` | 保存済みのドラフトを正規化する。 |
| 97 | fn | countDice | `countDice(draft)` | そのドラフトが持っているダイスの総数（プール＋配置済み）。 |
| 104 | fn | placedDice | `placedDice(draft, skillName)` | そのスキルに乗っているダイス。 |
| 157 | fn | createDiceDraftSpec | `createDiceDraftSpec(definition)` | ダイスドラフトの宣言。 |
| 192 | fn | diceDraftUnavailableReason | `diceDraftUnavailableReason(spec, token)` | そのコマがドラフトを使えない理由。 |
| 204 | fn | canViewDiceDraftSkillDetails | `canViewDiceDraftSkillDetails(spec, token, participantId)` | パネルでスキルの中身（状態の1行・判定値の欄）を見せてよいか。 |
| 253 | fn | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 一覧の絞り込み（skillTabs）を1つ選んで、そこに出すスキルだけを返す。 |
| 269 | fn | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 目標値へ足す修正の実効値（ドラクルージュの「目標値修正(TB)」）。 |
| 284 | fn | parseSumTarget | `parseSumTarget(raw)` | 目標値の欄を読む。 |
| 311 | fn | acceptsDie | `acceptsDie(spec, skill, die)` | その目をそのスキルへ置いてよいか。 |
| 355 | fn | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 今そのスキルに乗っているダイスで発動できるか。 |
| 453 | fn | addDiceToPool | `addDiceToPool(draft, dice)` | プールへダイスを足す。 |
| 485 | fn | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | プールにある目 from のダイスを count 個だけ to へ変える。 |
| 537 | fn | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | ダイスを1個動かす。 |
| 565 | fn | supportsAutoPlace | `supportsAutoPlace(spec)` | 「自動で置く」を使える規則か。 |
| 585 | fn | autoPlaceDice | `autoPlaceDice(spec, skills, draft)` | プールのダイスを、対応する数字のスキルへまとめて置く。 |
| 613 | fn | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 発動時。 |
| 627 | fn | clearDraft | `clearDraft()` | プールも配置も全部捨てる。 |

## トップレベル関数（LOCAL TASKS 候補）（25）

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
| 157 | createDiceDraftSpec | `createDiceDraftSpec(definition)` | 27 | ✓ |
| 192 | diceDraftUnavailableReason | `diceDraftUnavailableReason(spec, token)` | 5 | ✓ |
| 204 | canViewDiceDraftSkillDetails | `canViewDiceDraftSkillDetails(spec, token, participantId)` | 4 | ✓ |
| 216 | acceptsAnyDie | `acceptsAnyDie(requirement, skill)` | 5 |  |
| 223 | readNumberField | `readNumberField(skill, fieldKey)` | 6 |  |
| 253 | filterSkillsByTab | `filterSkillsByTab(skills, tab)` | 4 | ✓ |
| 269 | readTargetModifier | `readTargetModifier(spec, token, getEffectiveParameterValue)` | 7 | ✓ |
| 284 | parseSumTarget | `parseSumTarget(raw)` | 16 | ✓ |
| 302 | applyTargetModifier | `applyTargetModifier(value, modifier, floor)` | 4 |  |
| 311 | acceptsDie | `acceptsDie(spec, skill, die)` | 17 | ✓ |
| 355 | evaluatePlacement | `evaluatePlacement(spec, skill, dice = [], { targetValue = null, targetModifier = 0 } = {})` | 92 | ✓ |
| 453 | addDiceToPool | `addDiceToPool(draft, dice)` | 14 | ✓ |
| 485 | changePoolDice | `changePoolDice(draft, from, to, count = 1)` | 20 | ✓ |
| 507 | extractDie | `extractDie(draft, dieId)` | 24 |  |
| 537 | moveDie | `moveDie(draft, dieId, toSkillName, { spec = null, skill = null } = {})` | 22 | ✓ |
| 565 | supportsAutoPlace | `supportsAutoPlace(spec)` | 3 | ✓ |
| 585 | autoPlaceDice | `autoPlaceDice(spec, skills, draft)` | 22 | ✓ |
| 613 | consumePlacement | `consumePlacement(draft, skillName, count = Infinity)` | 12 | ✓ |
| 627 | clearDraft | `clearDraft()` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.check-view.dice-draft-view]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
ダイス1個は pool かいずれか1つのスキルの下の、どちらか一方にだけ存在する（不変条件）。読み出し時に POOL_SAFETY_MAX などで切るので、保存データを膨らませても状態は肥大しない。
<!-- /prose:notes -->
