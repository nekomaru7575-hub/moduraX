---
source: js/file-uploader.js
lines: 113
exports: 4
imported_by: 7
api_sha: b4dcd29cfefc
prose_sha: b4dcd29cfefc
generated: 2026-08-26
tags: [codemap]
---

# js/file-uploader.js

<!-- prose:summary -->
汎用のファイル選択・読み込みユーティリティ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ファイル選択ダイアログを開いて File・DataURL・テキストとして読み込む汎用ユーティリティ。複数選択（pickFiles）はデッキ作成の一括追加のためにある。サーバーへの送信は行わず、そこから先は[[js.image-upload]]などが受け持つ。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | fn | readFileAsDataUrl | `readFileAsDataUrl(file)` | 既に手元にあるFileをDataURLへ読み込む。 |
| 33 | fn | pickFile | `pickFile({ accept = '*/*' } = {})` | ネイティブのファイル選択ダイアログを開き、選択されたFileをそのまま返す。 |
| 61 | fn | pickFiles | `pickFiles({ accept = '*/*' } = {})` | 同じくファイル選択ダイアログを開くが、複数まとめて選べる版。 |
| 87 | fn | pickFileAsText | `pickFileAsText({ accept = 'application/json' } = {})` | ネイティブのファイル選択ダイアログを開き、選択されたファイルをテキストとして読み込む。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | readFileAsDataUrl | `readFileAsDataUrl(file)` | 8 | ✓ |
| 33 | pickFile | `pickFile({ accept = '*/*' } = {})` | 17 | ✓ |
| 61 | pickFiles | `pickFiles({ accept = '*/*' } = {})` | 18 | ✓ |
| 87 | pickFileAsText | `pickFileAsText({ accept = 'application/json' } = {})` | 26 | ✓ |

## 依存

- import → なし
- imported by → [[js.audio-dialog]], [[js.board-data-driven]], [[js.character-builder]], [[js.chat-palette]], [[js.deck-editor-dialog]], [[js.image-upload]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
