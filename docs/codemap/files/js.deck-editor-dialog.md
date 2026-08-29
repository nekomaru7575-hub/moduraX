---
source: js/deck-editor-dialog.js
lines: 402
exports: 1
imported_by: 1
api_sha: 89cec23fea42
prose_sha: 89cec23fea42
generated: 2026-08-29
tags: [codemap]
---

# js/deck-editor-dialog.js

<!-- prose:summary -->
デッキ（カードの束）の作成／編集ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
デッキの作成／編集ダイアログ。デッキ名・裏面画像と、カードの行（カード名・枚数・カード情報・カード画像）を編集する。タロットのような枚数の多いデッキのために、複数画像を選んで「1画像＝1カード」で流し込む一括追加を持つ（[[js.file-uploader]]のpickFiles）。画像が保存できない環境ではデータURLへ退避するが、それは状態に載らない長さなので、黙って消える前にその場で断る。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 67 | fn | showDeckEditorDialog | `showDeckEditorDialog({ template = null, onConfirm, onCancel = null })` | templateを渡すと編集モード、省略すると新規作成。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 32 | nextRowId | `nextRowId()` | 4 |  |
| 38 | cardNameFromFile | `cardNameFromFile(file)` | 3 |  |
| 43 | uploadCardImage | `async uploadCardImage(file)` | 10 |  |
| 67 | showDeckEditorDialog | `showDeckEditorDialog({ template = null, onConfirm, onCancel = null })` | **335** | ✓ |

## 依存

- import → [[js.card-catalog]], [[js.dialog-host]], [[js.file-uploader]], [[js.image-upload]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
