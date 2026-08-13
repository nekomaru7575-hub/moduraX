---
source: js/parameters/core.js
lines: 11
exports: 2
imported_by: 2
api_sha: ed58d9bb087e
prose_sha: ed58d9bb087e
generated: 2026-08-13
tags: [codemap]
---

# js/parameters/core.js

<!-- prose:summary -->
どのシステムでも共通のデフォルトパラメータ（HP・イニシアチブ）の定義。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
プラグインが無くても必ず付くパラメータをここで定義する。実際のオブジェクト化は [[js.parameters.paramFactory]] に委ねる。イニシアチブは locked かつ非表示で、ラウンド進行が内部的に使う。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 4 | const | CORE_DEFAULT_PARAMETERS | `CORE_DEFAULT_PARAMETERS` |  |
| 9 | fn | buildDefaultParameters | `buildDefaultParameters()` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 9 | buildDefaultParameters | `buildDefaultParameters()` | 3 | ✓ |

## 依存

- import → [[js.parameters.paramFactory]]
- imported by → [[js.character-dialog]], [[js.game-store]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
