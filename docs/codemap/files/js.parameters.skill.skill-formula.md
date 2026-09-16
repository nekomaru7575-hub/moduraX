---
source: js/parameters/skill/skill-formula.js
lines: 302
exports: 9
imported_by: 2
api_sha: 0f94c17441d9
prose_sha: 0f94c17441d9
generated: 2026-09-16
tags: [codemap]
---

# js/parameters/skill/skill-formula.js

<!-- prose:summary -->
スキル（キャラが選んで取得する能力。DX3のエフェクト、シノビガミの忍法等）の各所に書ける 「式」を数値・真偽値へ解決する。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | fn | normalizeFormula | `normalizeFormula(mod)` | 修正値1項目の保存形を式の文字列へ揃える。 |
| 136 | fn | evaluateArithmeticExpression | `evaluateArithmeticExpression(text)` | 数値・+ - * / ・丸括弧のみからなる文字列を安全に評価する。 |
| 161 | fn | isFieldAvailable | `isFieldAvailable(field, fields)` | その欄がこのスキルで意味を持つか（シノビガミの「間合は攻撃忍法だけ」）。 |
| 192 | fn | listFormulaNames | `listFormulaNames(spec, parameters)` | 式で参照できる名前の一覧（診断メッセージ・入力補助用）。 |
| 214 | fn | analyzeFormula | `analyzeFormula(rawFormula, { spec = null, skill = null, token, getEffectiveParameterValue })` | 式1本を数値へ解決し、あわせて「なぜその値になったか」を返す。 |
| 251 | fn | resolveFormula | `resolveFormula(rawFormula, context)` | 式1本を、使用者にとっての実際の数値へ解決する。 |
| 257 | const | COMPARATORS | `COMPARATORS` | 使用条件（「〇〇が△以下」等）で使える比較子。 |
| 268 | fn | comparatorLabel | `comparatorLabel(key)` |  |
| 281 | fn | evaluateCondition | `evaluateCondition(condition, context)` | 使用条件1件（左辺の式・比較子・右辺の式）を判定する。 |

## トップレベル関数（LOCAL TASKS 候補）（17）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 27 | normalizeFormula | `normalizeFormula(mod)` | 12 | ✓ |
| 46 | normalizeNotation | `normalizeNotation(text)` | 3 |  |
| 55 | normalizeName | `normalizeName(name)` | 3 |  |
| 61 | tokenize | `tokenize(text)` | 13 |  |
| 76 | parseExpression | `parseExpression(tokens, pos)` | 10 |  |
| 88 | parseTerm | `parseTerm(tokens, pos)` | 10 |  |
| 100 | parseFactor | `parseFactor(tokens, pos)` | 17 |  |
| 119 | tryEvaluate | `tryEvaluate(text)` | 14 |  |
| 136 | evaluateArithmeticExpression | `evaluateArithmeticExpression(text)` | 3 | ✓ |
| 141 | findParameterEntryByName | `findParameterEntryByName(parameters, name)` | 7 |  |
| 161 | isFieldAvailable | `isFieldAvailable(field, fields)` | 4 | ✓ |
| 169 | buildSkillFieldLookup | `buildSkillFieldLookup(spec, skill)` | 16 |  |
| 192 | listFormulaNames | `listFormulaNames(spec, parameters)` | 9 | ✓ |
| 214 | analyzeFormula | `analyzeFormula(rawFormula, { spec = null, skill = null, token, getEffectiveParameterValue })` | 30 | ✓ |
| 251 | resolveFormula | `resolveFormula(rawFormula, context)` | 3 | ✓ |
| 268 | comparatorLabel | `comparatorLabel(key)` | 3 | ✓ |
| 281 | evaluateCondition | `evaluateCondition(condition, context)` | 21 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
