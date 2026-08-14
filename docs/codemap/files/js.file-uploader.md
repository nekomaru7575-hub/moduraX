---
source: js/file-uploader.js
lines: 84
exports: 3
imported_by: 5
api_sha: 932165771673
prose_sha: 932165771673
generated: 2026-08-14
tags: [codemap]
---

# js/file-uploader.js

<!-- prose:summary -->
汎用のファイル選択・読み込みユーティリティ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ファイル選択ダイアログを開いて DataURL またはテキストとして読み込む汎用ユーティリティ。サーバーへの送信は行わず、そこから先は [[js.image-upload]] などが受け持つ。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | fn | readFileAsDataUrl | `readFileAsDataUrl(file)` | 既に手元にあるFileをDataURLへ読み込む。 |
| 33 | fn | pickFile | `pickFile({ accept = '*/*' } = {})` | ネイティブのファイル選択ダイアログを開き、選択されたFileをそのまま返す。 |
| 58 | fn | pickFileAsText | `pickFileAsText({ accept = 'application/json' } = {})` | ネイティブのファイル選択ダイアログを開き、選択されたファイルをテキストとして読み込む。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | readFileAsDataUrl | `readFileAsDataUrl(file)` | 8 | ✓ |
| 33 | pickFile | `pickFile({ accept = '*/*' } = {})` | 17 | ✓ |
| 58 | pickFileAsText | `pickFileAsText({ accept = 'application/json' } = {})` | 26 | ✓ |

## 依存

- import → なし
- imported by → [[js.audio-dialog]], [[js.board-data-driven]], [[js.character-builder]], [[js.chat-palette]], [[js.image-upload]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
