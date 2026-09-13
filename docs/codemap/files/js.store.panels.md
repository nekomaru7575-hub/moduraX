---
source: js/store/panels.js
lines: 177
exports: 10
imported_by: 4
api_sha: 8c234dff01e0
prose_sha: 8c234dff01e0
generated: 2026-09-13
tags: [codemap]
---

# js/store/panels.js

<!-- prose:summary -->
パネルの「クリックしたときの振る舞い」（clickAction）と「簡易マーカー」（marker）の形と、その正規化。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
パネルの項目のうち、外から来た値をそのまま使うと危ないものの検証を集めた場所。clickAction は押すと何かが起きるので normalizeClickAction、marker は色と種類がCSSへ渡るので normalizeMarker で形を絞る（種類はSetで持ちキー参照しない）。hydrate（[[js.game-store]]）は normalizePanels で両方を通し、ADD_PANEL・SET_PANEL_CLICK_ACTION（[[js.store.handlers.board]]）と SET_PANEL_MARKER もここを使う。見た目への変換は [[js.marker-style]]、押したときの実行は [[js.board-data-driven]] が持つ。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 28 | const | CLICK_ACTION_TYPES | `CLICK_ACTION_TYPES` | クリックオプションの種類。 |
| 35 | const | MAX_PANEL_CHAT_TEXT_LENGTH | `MAX_PANEL_CHAT_TEXT_LENGTH` | 発言の文字列の上限。 |
| 49 | fn | normalizeClickAction | `normalizeClickAction(value)` | clickActionを正規化する。 |
| 94 | const | MARKER_SHAPES | `MARKER_SHAPES` | 形状。 |
| 99 | const | MARKER_FILTER_TYPES | `MARKER_FILTER_TYPES` | 下にあるもの（背景・重なり順の低いパネル／カード）へ掛けるフィルター |
| 103 | const | DEFAULT_MARKER_COLOR | `DEFAULT_MARKER_COLOR` |  |
| 105 | const | DEFAULT_MARKER | `DEFAULT_MARKER` |  |
| 125 | fn | normalizeMarker | `normalizeMarker(value)` | markerを正規化する。 |
| 143 | fn | sameMarker | `sameMarker(a, b)` | 2つのmarkerが同じ見た目か（正規化済みの値どうしを比べる） |
| 154 | fn | normalizePanels | `normalizePanels(panels)` | パネルのマップを、clickActionとmarkerだけ正規化して返す。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 49 | normalizeClickAction | `normalizeClickAction(value)` | 35 | ✓ |
| 112 | clampInt | `clampInt(value, min, max, fallback)` | 5 |  |
| 125 | normalizeMarker | `normalizeMarker(value)` | 16 | ✓ |
| 143 | sameMarker | `sameMarker(a, b)` | 6 | ✓ |
| 154 | normalizePanels | `normalizePanels(panels)` | 23 | ✓ |

## 依存

- import → [[js.store.audio]]
- imported by → [[js.board-data-driven]], [[js.game-store]], [[js.panel-dialog]], [[js.store.handlers.board]]

## 注意

<!-- prose:notes -->
シーン経由のパネル（SAVE_SCENE／APPLY_SCENE の freezePanelMap）はここを通らない。marker は描画直前に [[js.board-data-driven]] の applyPanelAppearance がもう一度 normalizeMarker を通して守っている。
<!-- /prose:notes -->
