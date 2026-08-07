---
source: js/parameters/dx3-formula.js
lines: 194
exports: 5
imported_by: 2
api_sha: f5a52be2b5ad
prose_sha: f5a52be2b5ad
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/dx3-formula.js

<!-- prose:summary -->
エフェクトの「コンボ時修正」欄（文字列）を数値へ解決する。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
エフェクトの「コンボ時修正」欄に書かれた式（パラメータ名と四則演算）を数値へ解決する純粋モジュール。DOM に触れず、評価は自前の限定的な算術パーサで行う（`eval` は使わない）。解決理由も返すので、なぜその値になったかを UI に出せる。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | normalizeComboModFormula | `normalizeComboModFormula(mod)` | コンボ時修正1項目の保存形を式の文字列へ揃える。 |
| 124 | fn | evaluateArithmeticExpression | `evaluateArithmeticExpression(text)` | 数値・+ - * / ・丸括弧のみからなる文字列を安全に評価する。 |
| 142 | fn | listFormulaNames | `listFormulaNames(parameters)` | 式で参照できる名前の一覧（診断メッセージ・入力補助用）。 |
| 158 | fn | analyzeComboModFormula | `analyzeComboModFormula(rawMod, { effect, token, getEffectiveParameterValue })` | コンボ時修正1項目を数値へ解決し、あわせて「なぜその値になったか」を返す。 |
| 191 | fn | resolveComboModFormula | `resolveComboModFormula(rawMod, context)` | エフェクトのコンボ時修正1項目（新形式の文字列、または旧形式{mode,value}）を、 使用者にとっての実際の数値へ解決する。 |

## トップレベル関数・非export（8）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 34 | normalizeNotation | `normalizeNotation(text)` | 3 |
| 43 | normalizeName | `normalizeName(name)` | 3 |
| 49 | tokenize | `tokenize(text)` | 13 |
| 64 | parseExpression | `parseExpression(tokens, pos)` | 10 |
| 76 | parseTerm | `parseTerm(tokens, pos)` | 10 |
| 88 | parseFactor | `parseFactor(tokens, pos)` | 17 |
| 107 | tryEvaluate | `tryEvaluate(text)` | 14 |
| 129 | findParameterEntryByName | `findParameterEntryByName(parameters, name)` | 7 |

## 依存

- import → なし
- imported by → [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-effect-box]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
