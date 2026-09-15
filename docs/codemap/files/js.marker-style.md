---
source: js/marker-style.js
lines: 147
exports: 3
imported_by: 2
api_sha: a4e53f532430
prose_sha: a4e53f532430
generated: 2026-09-15
tags: [codemap]
---

# js/marker-style.js

<!-- prose:summary -->
簡易マーカー（色と形だけで描くパネル。js/store/panels.jsのnormalizeMarker）の見た目を、 1つの要素へ当てる。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 44 | const | MARKER_SHAPE_LABELS | `MARKER_SHAPE_LABELS` | 形状の表示名（ダイアログの選択肢） |
| 54 | const | MARKER_FILTER_LABELS | `MARKER_FILTER_LABELS` | フィルターの表示名（ダイアログの選択肢）。 |
| 127 | fn | applyMarkerStyle | `applyMarkerStyle(el, marker)` | 要素へマーカーの見た目を当てる。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 66 | mosaicBlockSize | `mosaicBlockSize(strength)` | 5 |  |
| 77 | ensureMosaicFilter | `ensureMosaicFilter(size)` | 36 |  |
| 114 | hexToRgba | `hexToRgba(hex, opacity)` | 6 |  |
| 127 | applyMarkerStyle | `applyMarkerStyle(el, marker)` | 20 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.panel-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
