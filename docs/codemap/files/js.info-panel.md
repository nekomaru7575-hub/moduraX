---
source: js/info-panel.js
lines: 357
exports: 1
imported_by: 1
api_sha: 345c82bc610b
prose_sha: 345c82bc610b
generated: 2026-08-07
tags: [codemap]
---

# js/info-panel.js

<!-- prose:summary -->
「情報」：タイトルと内容の組を、浮動パネルのタブとして並べる共有メモ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
共有メモ「情報」の浮動パネル。タブごとに公開範囲を持ち、[[js.visibility]] の判定で見える相手を絞る。枠は [[js.floating-panel]]、1件の編集は [[js.info-entry-dialog]] に委ねる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 68 | fn | initInfoPanel | `initInfoPanel()` |  |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 46 | entryLabel | `entryLabel(entry)` | 3 |  |
| 52 | visibleSections | `visibleSections(entry, myId)` | 3 |  |
| 56 | visibleEntries | `visibleEntries(state, myId)` | 3 |  |
| 62 | canEditEntry | `canEditEntry(entry, myId, amGm)` | 5 |  |
| 68 | initInfoPanel | `initInfoPanel()` | **289** | ✓ |

## 依存

- import → [[js.EventBus]], [[js.audience-picker]], [[js.board-data-driven]], [[js.context-menu]], [[js.floating-panel]], [[js.game-store]], [[js.info-entry-dialog]], [[js.local-identity]], [[js.visibility]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
