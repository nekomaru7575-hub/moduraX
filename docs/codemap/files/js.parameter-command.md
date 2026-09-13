---
source: js/parameter-command.js
lines: 129
exports: 5
imported_by: 1
api_sha: c87c51f41106
prose_sha: c87c51f41106
generated: 2026-09-13
tags: [codemap]
---

# js/parameter-command.js

<!-- prose:summary -->
[演算子(+/-/=)][パラメータ名](,[演算子][パラメータ名])* ([値]) でパラメータを直接変更する コマンドの解釈。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | fn | toNumericValue | `toNumericValue(value)` | 値を数値として読めればNumberを、読めなければnullを返す。 |
| 35 | fn | classifyAmount | `classifyAmount(raw)` | かっこの中身を、数値・ダイス式・文字列のどれかに分ける。 |
| 44 | fn | parseParameterTargets | `parseParameterTargets(rawTargets)` | "+HP,-MP" のようなカンマ区切りの指定を { operator, name } の配列に分解する。 |
| 68 | fn | resolveParameterCommand | `resolveParameterCommand({ rawInput, character, roomParameters })` | コマンド文字列を解釈し、対象と値を確定させる。 |
| 124 | fn | computeNextValue | `computeNextValue(operator, before, amount)` | 変更後の値。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 22 | toNumericValue | `toNumericValue(value)` | 7 | ✓ |
| 35 | classifyAmount | `classifyAmount(raw)` | 6 | ✓ |
| 44 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 | ✓ |
| 52 | findParamByName | `findParamByName(parameters, name)` | 3 |  |
| 68 | resolveParameterCommand | `resolveParameterCommand({ rawInput, character, roomParameters })` | 49 | ✓ |
| 124 | computeNextValue | `computeNextValue(operator, before, amount)` | 5 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
