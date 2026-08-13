---
source: js/parameters/paramFactory.js
lines: 31
exports: 1
imported_by: 5
api_sha: f1876c947914
prose_sha: f1876c947914
generated: 2026-08-13
tags: [codemap]
---

# js/parameters/paramFactory.js

<!-- prose:summary -->
パラメータ定義配列を、Store用のparamオブジェクトに変換する共通処理。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パラメータ定義の配列を、ストアが扱う形（key をキーにしたオブジェクト）へ変換する共通処理。すべてのプラグインがここを通る。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 12 | fn | buildParameters | `buildParameters(source, definitions, defaults = {})` | このsource全体に適用するデフォルト値。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 12 | buildParameters | `buildParameters(source, definitions, defaults = {})` | 20 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.core]], [[js.parameters.dx3]], [[js.parameters.gcrest]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
