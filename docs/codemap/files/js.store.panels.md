---
source: js/store/panels.js
lines: 107
exports: 4
imported_by: 3
api_sha: ee9bebecf7c7
prose_sha: ee9bebecf7c7
generated: 2026-09-09
tags: [codemap]
---

# js/store/panels.js

<!-- prose:summary -->
パネルの「クリックしたときの振る舞い」（clickAction）の形と、その正規化。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 26 | const | CLICK_ACTION_TYPES | `CLICK_ACTION_TYPES` | クリックオプションの種類。 |
| 33 | const | MAX_PANEL_CHAT_TEXT_LENGTH | `MAX_PANEL_CHAT_TEXT_LENGTH` | 発言の文字列の上限。 |
| 47 | fn | normalizeClickAction | `normalizeClickAction(value)` | clickActionを正規化する。 |
| 87 | fn | normalizePanelClickActions | `normalizePanelClickActions(panels)` | パネルのマップを、clickActionだけ正規化して返す。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | normalizeClickAction | `normalizeClickAction(value)` | 35 | ✓ |
| 87 | normalizePanelClickActions | `normalizePanelClickActions(panels)` | 20 | ✓ |

## 依存

- import → [[js.store.audio]]
- imported by → [[js.board-data-driven]], [[js.game-store]], [[js.store.handlers.board]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
