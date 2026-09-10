---
source: js/image-field.js
lines: 110
exports: 1
imported_by: 2
api_sha: ec318702da7b
prose_sha: ec318702da7b
generated: 2026-09-10
tags: [codemap]
---

# js/image-field.js

<!-- prose:summary -->
ダイアログに貼る「ラベル＋プレビュー＋選択/削除ボタン」の1組。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ダイアログに貼る「ラベル＋プレビュー＋選択/削除ボタン」の1組。[[js.background-dialog]] と [[js.panel-dialog]] に一字一句同じ写しがあったのをまとめたもの。押されたら [[js.image-selector-dialog]] を開き、返ってきた確定URLとキーを預かるだけで、上げる手続きは持たない。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 40 | fn | buildImageField | `buildImageField({ label, purpose, initialImage = null, initialKey = null, usedImages = new Set(), selectorTitle = '画像を選ぶ', clearLabel = '画像を削除', onClear = null, onPicked = null })` | label: string, purpose: 'background'\|'token'\|'panel'\|'card'\|'stamp', initialImage?: string \| null, initialKe… |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 40 | buildImageField | `buildImageField({ label, purpose, initialImage = null, initialKey = null, usedImages = new Set(), selectorTitle = '画像を選ぶ', clearLabel = '画像を削除', onClear = null, onPicked = null })` | 70 | ✓ |

## 依存

- import → [[js.image-selector-dialog]]
- imported by → [[js.background-dialog]], [[js.panel-dialog]]

## 注意

<!-- prose:notes -->
[[js.character-dialog]] のトリミング付き（buildImagePicker）は含めない。あちらは「選ぶ」ではなく「切る」で、applyImageCropStyle を盤面と共有して見たままを担保している。cropをここへ持ち込むと、cropの無い側にも分岐が入る。

[[js.room-stamp-dialog]] と [[js.deck-editor-dialog]] にも同じ型の写しが残っている（まだ移していない）。
<!-- /prose:notes -->
