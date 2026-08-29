---
source: js/parameters/sheet-source.js
lines: 58
exports: 3
imported_by: 4
api_sha: f52c4dbe8c19
prose_sha: f52c4dbe8c19
generated: 2026-08-29
tags: [codemap]
---

# js/parameters/sheet-source.js

<!-- prose:summary -->
「キャラクターシートのURLから取り込む」ときの受け付け先の宣言と、シートの値を読む小道具。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 29 | fn | createAppspotSheetSource | `createAppspotSheetSource({ label, pathSegment })` | character-sheets.appspot.com のシートを受け付ける宣言を作る。 |
| 45 | fn | sheetText | `sheetText(value)` | シートの文字列欄を読む。 |
| 53 | fn | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | シートの数値欄を、取り込み先のパラメータへ入れる。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 29 | createAppspotSheetSource | `createAppspotSheetSource({ label, pathSegment })` | 12 | ✓ |
| 45 | sheetText | `sheetText(value)` | 3 | ✓ |
| 53 | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | 5 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.dracurouge]], [[js.parameters.futarisousa]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
