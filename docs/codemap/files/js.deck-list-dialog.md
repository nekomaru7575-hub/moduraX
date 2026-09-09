---
source: js/deck-list-dialog.js
lines: 183
exports: 1
imported_by: 1
api_sha: 637983c73a2b
prose_sha: 637983c73a2b
generated: 2026-09-09
tags: [codemap]
---

# js/deck-list-dialog.js

<!-- prose:summary -->
デッキ一覧。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
デッキ一覧。ルームメニューから開き、配置・作成・編集・削除・JSONの出し入れの導線だけを持つ（入力画面は[[js.deck-editor-dialog]]）。組み込みの簡易トランプ（[[js.card-catalog]]）と、この部屋で作ったデッキ（room.deckTemplates）を分けて並べる。[[js.original-table-list-dialog]]と同じ役割分担・同じ即時反映の作法。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 70 | fn | showDeckListDialog | `showDeckListDialog({ builtIns, templates, onPlaceBuiltIn, onCopyBuiltIn, onPlace, onEdit, onExport, onRemove, onCreate, onImport })` | 追加・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 15 | sectionHeading | `sectionHeading(text)` | 6 |  |
| 23 | buildRow | `buildRow({ label, title, onPlace, actions })` | 28 |  |
| 70 | showDeckListDialog | `showDeckListDialog({ builtIns, templates, onPlaceBuiltIn, onCopyBuiltIn, onPlace, onEdit, onExport, onRemove, onCreate, onImport })` | 113 | ✓ |

## 依存

- import → [[js.dialog-host]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
