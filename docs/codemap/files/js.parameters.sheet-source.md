---
source: js/parameters/sheet-source.js
lines: 83
exports: 4
imported_by: 5
api_sha: fab39d80a72d
prose_sha: fab39d80a72d
generated: 2026-09-02
tags: [codemap]
---

# js/parameters/sheet-source.js

<!-- prose:summary -->
「キャラクターシートのURLから取り込む」ときの受け付け先の宣言と、シートの値を読む小道具。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「URLから取り込む」の受け付け先の宣言（createAppspotSheetSource）と、シートの値を読む小道具を持つ。小道具はURL経路とファイル経路の両方から使う：sheetText は未記入を空文字へ、assignSheetNumber は読めない値のキーを生やさない（既定値が残る）、sheetRichText は効果欄のHTML実体参照と <br> を元へ戻す。復号した文字列は textContent と input.value にしか渡らない前提なので、innerHTML へ流す実装を足すなら [[js.html-escape]] の escapeHtml を通すこと。DOMに触れない（server/index.js が [[js.parameters.registry]] 経由で import する）。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 29 | fn | createAppspotSheetSource | `createAppspotSheetSource({ label, pathSegment })` | character-sheets.appspot.com のシートを受け付ける宣言を作る。 |
| 45 | fn | sheetText | `sheetText(value)` | シートの文字列欄を読む。 |
| 53 | fn | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | シートの数値欄を、取り込み先のパラメータへ入れる。 |
| 73 | fn | sheetRichText | `sheetRichText(value)` | シートの「効果」のような、書式の入った文字列欄を読む。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 29 | createAppspotSheetSource | `createAppspotSheetSource({ label, pathSegment })` | 12 | ✓ |
| 45 | sheetText | `sheetText(value)` | 3 | ✓ |
| 53 | assignSheetNumber | `assignSheetNumber(target, paramId, raw)` | 5 | ✓ |
| 73 | sheetRichText | `sheetRichText(value)` | 10 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.dracurouge]], [[js.parameters.futarisousa]], [[js.parameters.gcrest]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
