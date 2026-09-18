---
source: js/parameter-command.js
lines: 168
exports: 7
imported_by: 1
api_sha: 8898784fee61
prose_sha: 8898784fee61
generated: 2026-09-18
tags: [codemap]
---

# js/parameter-command.js

<!-- prose:summary -->
[演算子(+/-/=)][パラメータ名](,[演算子][パラメータ名])* ([値]) でパラメータを直接変更する コマンドの解釈。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
チャットの「+HP(3)」「=メモ(集合済み)」「+HP,-t.HP(1D6)」のようなパラメータ変更コマンドを、DOMもstoreも触らずに解釈する。名前の引き当て（参照キャラクター → ルーム変数の順）・ターゲットを指す「t.」の剥がし・かっこの中身の分類（数値／ダイス式／文字列）・変更後の値の計算までを持ち、ダイスを振ること・dispatch・ログの組み立ては [[js.main]] の tryHandleParameterCommand が行う。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | const | TARGET_PARAMETER_PREFIX | `TARGET_PARAMETER_PREFIX` | ターゲットを指す名前の頭。 |
| 29 | fn | stripTargetPrefix | `stripTargetPrefix(name)` | 「t.HP」ならターゲットを指す名前として「HP」を、そうでなければnullを返す。 |
| 40 | fn | toNumericValue | `toNumericValue(value)` | 値を数値として読めればNumberを、読めなければnullを返す。 |
| 53 | fn | classifyAmount | `classifyAmount(raw)` | かっこの中身を、数値・ダイス式・文字列のどれかに分ける。 |
| 62 | fn | parseParameterTargets | `parseParameterTargets(rawTargets)` | "+HP,-MP" のようなカンマ区切りの指定を { operator, name } の配列に分解する。 |
| 89 | fn | resolveParameterCommand | `resolveParameterCommand({ rawInput, character, target = null, roomParameters })` | コマンド文字列を解釈し、対象と値を確定させる。 |
| 163 | fn | computeNextValue | `computeNextValue(operator, before, amount)` | 変更後の値。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 29 | stripTargetPrefix | `stripTargetPrefix(name)` | 5 | ✓ |
| 40 | toNumericValue | `toNumericValue(value)` | 7 | ✓ |
| 53 | classifyAmount | `classifyAmount(raw)` | 6 | ✓ |
| 62 | parseParameterTargets | `parseParameterTargets(rawTargets)` | 7 | ✓ |
| 70 | findParamByName | `findParamByName(parameters, name)` | 3 |  |
| 89 | resolveParameterCommand | `resolveParameterCommand({ rawInput, character, target = null, roomParameters })` | 67 | ✓ |
| 163 | computeNextValue | `computeNextValue(operator, before, amount)` | 5 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
