---
source: js/icons.js
lines: 151
exports: 4
imported_by: 12
api_sha: 0c50efe1cc24
prose_sha: 0c50efe1cc24
generated: 2026-08-26
tags: [codemap]
---

# js/icons.js

<!-- prose:summary -->
画面の操作部品に置くアイコンを、ここでだけ定義する。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 88 | fn | createIcon | `createIcon(name, label = '')` | アイコン1つを作って返す。 |
| 109 | fn | setIcon | `setIcon(el, name, label = '')` | 要素の中身を「アイコンだけ」に差し替える。 |
| 119 | fn | setIconText | `setIconText(el, name, text, label = '')` | 要素の中身を「アイコン＋文字」に差し替える。 |
| 137 | fn | applyStaticIcons | `applyStaticIcons(root = document)` | HTMLに直接書いてあるアイコン置き場を埋める。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 64 | parseIcon | `parseIcon(name)` | 17 |  |
| 88 | createIcon | `createIcon(name, label = '')` | 16 | ✓ |
| 109 | setIcon | `setIcon(el, name, label = '')` | 3 | ✓ |
| 119 | setIconText | `setIconText(el, name, text, label = '')` | 5 | ✓ |
| 137 | applyStaticIcons | `applyStaticIcons(root = document)` | 14 | ✓ |

## 依存

- import → なし
- imported by → [[js.audio-dialog]], [[js.character-builder]], [[js.character-dialog]], [[js.context-menu]], [[js.help.help-panel]], [[js.info-panel]], [[js.main]], [[js.parameters.shinobigami-ougi-box]], [[js.pwa]], [[js.room-index]], [[js.round-panel]], [[js.site-nav]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
