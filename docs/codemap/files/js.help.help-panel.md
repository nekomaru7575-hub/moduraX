---
source: js/help/help-panel.js
lines: 188
exports: 1
imported_by: 1
api_sha: 0089ce42a2a4
prose_sha: 0089ce42a2a4
generated: 2026-08-18
tags: [codemap]
---

# js/help/help-panel.js

<!-- prose:summary -->
「？ヘルプ」タブの中身。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 51 | fn | createHelpPanel | `createHelpPanel({ container, getActivePlugin })` | ヘルプの対話パネルを1つ作る。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 22 | pickGreeting | `pickGreeting()` | 9 |  |
| 33 | fillBubble | `fillBubble(bubble, body)` | 9 |  |
| 51 | createHelpPanel | `createHelpPanel({ container, getActivePlugin })` | 137 | ✓ |

## 依存

- import → [[js.help.help-content]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
