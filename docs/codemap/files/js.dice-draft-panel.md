---
source: js/dice-draft-panel.js
lines: 601
exports: 1
imported_by: 1
api_sha: 59a4a28117ee
prose_sha: 59a4a28117ee
generated: 2026-08-24
tags: [codemap]
---

# js/dice-draft-panel.js

<!-- prose:summary -->
「ダイスドラフト」：振ってプールに溜めた目を1個ずつドラッグし、スキルの上に乗せて発動する 浮動パネル。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 100 | fn | initDiceDraftPanel | `initDiceDraftPanel()` | ------------------------------------------------------------------ パネル本体 -----------------------------------… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 60 | renderDieFace | `renderDieFace(die)` | 35 |  |
| 100 | initDiceDraftPanel | `initDiceDraftPanel()` | **501** | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.drag-gesture]], [[js.floating-panel]], [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.registry]], [[js.parameters.skill.skill-model]], [[js.room-authority]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
