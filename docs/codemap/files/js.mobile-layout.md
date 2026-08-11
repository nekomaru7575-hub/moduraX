---
source: js/mobile-layout.js
lines: 216
exports: 1
imported_by: 1
api_sha: 927a067b39ff
prose_sha: 927a067b39ff
generated: 2026-08-11
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
| 58 | fn | initMobileLayout | `initMobileLayout({ panels = [] } = {})` | panels: 中央スペースへはめ込む浮動パネル。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 34 | countLogEntries | `countLogEntries(state)` | 3 |  |
| 38 | loadActiveViewId | `loadActiveViewId()` | 7 |  |
| 46 | saveActiveViewId | `saveActiveViewId(viewId)` | 7 |  |
| 58 | initMobileLayout | `initMobileLayout({ panels = [] } = {})` | 158 | ✓ |

## 依存

- import → [[js.EventBus]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
