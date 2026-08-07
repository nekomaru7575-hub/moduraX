---
source: js/parameters/paramFactory.js
lines: 31
exports: 1
imported_by: 3
api_sha: f1876c947914
prose_sha: f1876c947914
generated: 2026-08-07
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

## トップレベル関数・非export（0）

なし。

## 依存

- import → なし
- imported by → [[js.parameters.core]], [[js.parameters.dx3]], [[js.parameters.gcrest]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
