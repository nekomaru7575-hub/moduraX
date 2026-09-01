---
source: js/html-escape.js
lines: 38
exports: 2
imported_by: 3
api_sha: 5e6788af49d6
prose_sha: 5e6788af49d6
generated: 2026-09-01
tags: [codemap]
---

# js/html-escape.js

<!-- prose:summary -->
文字列をHTMLへ埋め込む前の始末。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | fn | escapeHtml | `escapeHtml(text)` | HTMLの本文にも属性値にも安全に置ける形へ直す。 |
| 35 | fn | safeCssColor | `safeCssColor(color, fallback)` | style属性へ入れてよい色だけを通す。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 15 | escapeHtml | `escapeHtml(text)` | 8 | ✓ |
| 35 | safeCssColor | `safeCssColor(color, fallback)` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.log-export]], [[js.main]], [[js.parameters.dx3]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
