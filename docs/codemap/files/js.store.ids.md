---
source: js/store/ids.js
lines: 86
exports: 10
imported_by: 1
api_sha: 7a49ac4321ae
prose_sha: 7a49ac4321ae
generated: 2026-09-10
tags: [codemap]
---

# js/store/ids.js

<!-- prose:summary -->
盤面のオブジェクト（コマ・パネル・カード・デッキ・バフ・プロット枠・情報）のIDを作る。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
盤面のオブジェクト（コマ・パネル・カード・デッキ・デッキ定義・部屋スタンプ・バフ・プロット枠・情報）のIDを作るだけの場所。どれも「時刻＋モジュール内の連番」で、同じミリ秒に続けて作っても衝突しない。IDの形を決める以外のことは持たず、上限も正規化も各スライス（[[js.store.cards]]・[[js.store.stamps]] など）の仕事。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 11 | fn | generateTokenId | `generateTokenId()` |  |
| 18 | fn | generatePanelId | `generatePanelId()` |  |
| 25 | fn | generateCardId | `generateCardId()` |  |
| 32 | fn | generateDeckId | `generateDeckId()` |  |
| 40 | fn | generateDeckTemplateId | `generateDeckTemplateId()` | デッキの定義（room.deckTemplates）のid。 |
| 50 | fn | generateRoomStampId | `generateRoomStampId()` | 部屋に登録するスタンプ（room.stamps）のid。 |
| 57 | fn | generateBuffId | `generateBuffId()` |  |
| 68 | fn | generatePlotSlotId | `generatePlotSlotId()` | 1つのコマに増やしたプロット選択（round.plotExtras）のid。 |
| 75 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 82 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |

## トップレベル関数（LOCAL TASKS 候補）（10）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 11 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 18 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 25 | generateCardId | `generateCardId()` | 4 | ✓ |
| 32 | generateDeckId | `generateDeckId()` | 4 | ✓ |
| 40 | generateDeckTemplateId | `generateDeckTemplateId()` | 4 | ✓ |
| 50 | generateRoomStampId | `generateRoomStampId()` | 4 | ✓ |
| 57 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 68 | generatePlotSlotId | `generatePlotSlotId()` | 4 | ✓ |
| 75 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 82 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |

## 依存

- import → なし
- imported by → [[js.game-store]]

## 注意

<!-- prose:notes -->
採番はアクションを起こす側（画面）で行い、payload に載せて配る約束。reducer の中で採番すると、同じアクションを実行した各クライアントで別々のIDになる。

部屋スタンプだけは、ここが作るのは**ローカルid**で、状態に載る公開ID（`room:` を冠したもの）は [[js.store.stamps]] が付ける。細工したクライアントにCoreやプラグインのIDを名乗らせないため。
<!-- /prose:notes -->
