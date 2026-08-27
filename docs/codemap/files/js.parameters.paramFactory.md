---
source: js/parameters/paramFactory.js
lines: 38
exports: 1
imported_by: 8
api_sha: f1876c947914
prose_sha: f1876c947914
generated: 2026-08-26
tags: [codemap]
---

# js/parameters/paramFactory.js

<!-- prose:summary -->
パラメータ定義配列を、Store用のparamオブジェクトに変換する共通処理。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パラメータ定義の配列を、ストアが扱う形（key をキーにしたオブジェクト）へ変換する共通処理。すべてのプラグインがここを通る。定義に書ける印は locked / editable / visible / roundOnly の4つで、ここに無いキーは落ちる（新しい印を足すときは必ずこの写しにも通すこと）。roundOnly は「戦闘中だけ一覧に出す」で、判定するのは [[js.character-panel]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | buildParameters | `buildParameters(source, definitions, defaults = {})` | key:string, label:string, value:number, locked?:boolean, editable?:boolean, visible?:boolean, roundOnly?:boo… |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | buildParameters | `buildParameters(source, definitions, defaults = {})` | 21 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.arianrhod]], [[js.parameters.core]], [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.futarisousa]], [[js.parameters.gcrest]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
