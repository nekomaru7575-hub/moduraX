---
source: js/mobile-layout.js
lines: 283
exports: 1
imported_by: 1
api_sha: 927a067b39ff
prose_sha: 927a067b39ff
generated: 2026-08-20
tags: [codemap]
---

# js/mobile-layout.js

<!-- prose:summary -->
狭幅（スマホ）向けの縦積みレイアウト。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 66 | fn | initMobileLayout | `initMobileLayout({ panels = [] } = {})` | panels: 中央スペースへはめ込む浮動パネル。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 41 | countLogEntries | `countLogEntries(state)` | 3 |  |
| 45 | loadActiveViewId | `loadActiveViewId()` | 7 |  |
| 53 | saveActiveViewId | `saveActiveViewId(viewId)` | 7 |  |
| 66 | initMobileLayout | `initMobileLayout({ panels = [] } = {})` | **217** | ✓ |

## 依存

- import → [[js.EventBus]], [[js.context-menu]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
