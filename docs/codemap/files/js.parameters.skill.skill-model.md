---
source: js/parameters/skill/skill-model.js
lines: 485
exports: 14
imported_by: 8
api_sha: 8e2565e69e7b
prose_sha: 8e2565e69e7b
generated: 2026-08-17
tags: [codemap]
---

# js/parameters/skill/skill-model.js

<!-- prose:summary -->
「キャラが選んで取得するタイプの能力」＝スキルの、システムに依存しないデータモデル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（14）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 35 | const | EXPIRE_PHASE_CHOICES | `EXPIRE_PHASE_CHOICES` | バフの効果時間の選択肢。 |
| 54 | fn | resolveExpirePhase | `resolveExpirePhase(stored, fallback = null)` | スキルのexpirePhase（保存値）を、ADD_BUFFへ渡す値へ変換する。 |
| 121 | fn | createSkillSpec | `createSkillSpec(definition)` | id: string, noun: string, このシステムでのスキルの呼び名（DX3なら'エフェクト'）。 |
| 187 | fn | buildSkillUseCommandPattern | `buildSkillUseCommandPattern(spec)` | チャットコマンドの書式「（呼び名）使用（スキル名）」。 |
| 191 | fn | buildSkillUseCommand | `buildSkillUseCommand(spec, skillName)` |  |
| 272 | fn | normalizeSkill | `normalizeSkill(spec, raw)` | 保存済みの1件を、欠けたフィールドを補った正規形へ揃える。 |
| 341 | fn | normalizeSkillList | `normalizeSkillList(spec, rawList)` | componentsに保存された一覧を正規形の配列にする。 |
| 351 | fn | findSkillByName | `findSkillByName(skills, name)` | 一覧から名前（完全一致）で1件引く。 |
| 359 | fn | analyzeMod | `analyzeMod(spec, skill, mod, { token, getEffectiveParameterValue })` | 修正1件の解析結果（値＋なぜその値になったか）。 |
| 367 | fn | buildLowestModMeta | `buildLowestModMeta(spec, paramId, mods)` | 複数の修正のうち、追加欄の値が最も小さいもの（DX3のクリティカル値下限は 一番低い＝一番緩いものを適用する）を1つのmetaにまとめる。 |
| 385 | fn | checkSkillUsable | `checkSkillUsable(spec, skill, context)` | このスキルを今使えるか。 |
| 421 | fn | collectModProblems | `collectModProblems(spec, skills, context)` | 修正値の式のうち、評価できず0になったものの説明。 |
| 445 | fn | bumpSkillUsage | `bumpSkillUsage(spec, skills, skillNames)` | 指定スキルの使用回数を全期間+1した新しい一覧を返す（上限が無い期間も記録だけはしておく）。 |
| 465 | fn | resetSkillUsageOnPhaseEnd | `resetSkillUsageOnPhaseEnd(spec, rawList, phase)` | フェーズ終了で、その期間の使用回数を0へ戻す。 |

## トップレベル関数（LOCAL TASKS 候補）（20）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 54 | resolveExpirePhase | `resolveExpirePhase(stored, fallback = null)` | 5 | ✓ |
| 121 | createSkillSpec | `createSkillSpec(definition)` | 45 | ✓ |
| 173 | defaultSelectValue | `defaultSelectValue(field)` | 3 |  |
| 179 | escapeRegExp | `escapeRegExp(text)` | 3 |  |
| 187 | buildSkillUseCommandPattern | `buildSkillUseCommandPattern(spec)` | 3 | ✓ |
| 191 | buildSkillUseCommand | `buildSkillUseCommand(spec, skillName)` | 3 | ✓ |
| 195 | toNumber | `toNumber(value, fallback = 0)` | 4 |  |
| 202 | normalizeLimitMax | `normalizeLimitMax(raw)` | 5 |  |
| 210 | modsFromLegacyCombo | `modsFromLegacyCombo(spec, combo)` | 25 |  |
| 236 | normalizeMod | `normalizeMod(spec, raw)` | 20 |  |
| 257 | normalizeCondition | `normalizeCondition(raw)` | 7 |  |
| 272 | normalizeSkill | `normalizeSkill(spec, raw)` | 60 | ✓ |
| 341 | normalizeSkillList | `normalizeSkillList(spec, rawList)` | 8 | ✓ |
| 351 | findSkillByName | `findSkillByName(skills, name)` | 3 | ✓ |
| 359 | analyzeMod | `analyzeMod(spec, skill, mod, { token, getEffectiveParameterValue })` | 3 | ✓ |
| 367 | buildLowestModMeta | `buildLowestModMeta(spec, paramId, mods)` | 11 | ✓ |
| 385 | checkSkillUsable | `checkSkillUsable(spec, skill, context)` | 31 | ✓ |
| 421 | collectModProblems | `collectModProblems(spec, skills, context)` | 19 | ✓ |
| 445 | bumpSkillUsage | `bumpSkillUsage(spec, skills, skillNames)` | 14 | ✓ |
| 465 | resetSkillUsageOnPhaseEnd | `resetSkillUsageOnPhaseEnd(spec, rawList, phase)` | 20 | ✓ |

## 依存

- import → [[js.parameters.skill.skill-formula]]
- imported by → [[js.dice-draft-panel]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.shinobigami]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-use]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
