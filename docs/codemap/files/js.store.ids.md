---
source: js/store/ids.js
lines: 76
exports: 9
imported_by: 1
api_sha: c04667983462
prose_sha: c04667983462
generated: 2026-08-30
tags: [codemap]
---

# js/store/ids.js

<!-- prose:summary -->
盤面のオブジェクト（コマ・パネル・カード・デッキ・バフ・プロット枠・情報）のIDを作る。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 11 | fn | generateTokenId | `generateTokenId()` |  |
| 18 | fn | generatePanelId | `generatePanelId()` |  |
| 25 | fn | generateCardId | `generateCardId()` |  |
| 32 | fn | generateDeckId | `generateDeckId()` |  |
| 40 | fn | generateDeckTemplateId | `generateDeckTemplateId()` | デッキの定義（room.deckTemplates）のid。 |
| 47 | fn | generateBuffId | `generateBuffId()` |  |
| 58 | fn | generatePlotSlotId | `generatePlotSlotId()` | 1つのコマに増やしたプロット選択（round.plotExtras）のid。 |
| 65 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 72 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 11 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 18 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 25 | generateCardId | `generateCardId()` | 4 | ✓ |
| 32 | generateDeckId | `generateDeckId()` | 4 | ✓ |
| 40 | generateDeckTemplateId | `generateDeckTemplateId()` | 4 | ✓ |
| 47 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 58 | generatePlotSlotId | `generatePlotSlotId()` | 4 | ✓ |
| 65 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 72 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |

## 依存

- import → なし
- imported by → [[js.game-store]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
