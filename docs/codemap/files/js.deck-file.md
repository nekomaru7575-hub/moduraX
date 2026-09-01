---
source: js/deck-file.js
lines: 84
exports: 5
imported_by: 1
api_sha: d02023573ec9
prose_sha: d02023573ec9
generated: 2026-09-01
tags: [codemap]
---

# js/deck-file.js

<!-- prose:summary -->
デッキの定義（room.deckTemplates の1件）をJSONファイルへ書き出す／読み込む。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
デッキ定義1件のJSON書き出し／読み込み。[[js.character-snapshot]]と同じ流儀で、形式マーカー・組み立て・読み取りを1ファイルに集約してある（書き出し側と読み込み側の形がズレる事故を防ぐため）。取り込むときは画像を[[js.image-upload]]のadoptImageIntoRoomでこの部屋へ複製し直す。元の部屋のR2を指したままだと、その部屋を消した時点で全部404になるため。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | const | DECK_FILE_FORMAT | `DECK_FILE_FORMAT` | 他のJSON（コマのスナップショット・部屋の全データ・外部シート）と取り違えないための印。 |
| 20 | fn | isDeckFile | `isDeckFile(json)` |  |
| 29 | fn | buildDeckFile | `buildDeckFile(template)` | 書き出す中身。 |
| 44 | fn | deckFileName | `deckFileName(name)` | ファイル名に使えない文字を落とす。 |
| 61 | fn | readDeckFile | `async readDeckFile(text, generateRowId)` | 読み込んだテキストをデッキの定義（SAVE_DECK_TEMPLATE のpayloadに渡せる形）へ均す。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 20 | isDeckFile | `isDeckFile(json)` | 3 | ✓ |
| 29 | buildDeckFile | `buildDeckFile(template)` | 13 | ✓ |
| 44 | deckFileName | `deckFileName(name)` | 4 | ✓ |
| 61 | readDeckFile | `async readDeckFile(text, generateRowId)` | 23 | ✓ |

## 依存

- import → [[js.image-upload]], [[js.untrusted-json]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
