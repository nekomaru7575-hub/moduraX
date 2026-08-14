---
source: js/image-upload.js
lines: 164
exports: 5
imported_by: 4
api_sha: 7b008ae3d053
prose_sha: 7b008ae3d053
generated: 2026-08-14
tags: [codemap]
---

# js/image-upload.js

<!-- prose:summary -->
背景画像をサーバー経由でR2へ上げ、公開URLを受け取る。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
画像をサーバー経由で Cloudflare R2 へ上げ、公開 URL を受け取る。アップロード可否の判定とサイズ上限もここが持つ。サーバー側の実体は [[server.r2]]。背景・コマ・パネルの各ダイアログから共通で呼ばれる。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | fn | isImageUploadAvailable | `async isImageUploadAvailable()` | アップロードが使える環境か。 |
| 43 | fn | imageUploadMaxBytes | `imageUploadMaxBytes()` | サーバーが許す1枚あたりの上限バイト数（取得できていなければnull）。 |
| 63 | fn | adoptImageIntoRoom | `async adoptImageIntoRoom(image, purpose)` | JSONから取り込んだ画像を、この部屋の持ち物にする。 |
| 116 | fn | uploadImageFile | `async uploadImageFile(file, purpose)` | 画像をアップロードして公開URLとキーを受け取る。 |
| 146 | fn | pickAndUploadImage | `async pickAndUploadImage({ purpose })` | 画像を選ばせて、R2へ上げたうえで表示に使える文字列を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | currentRoomId | `currentRoomId()` | 3 |  |
| 31 | isImageUploadAvailable | `async isImageUploadAvailable()` | 10 | ✓ |
| 43 | imageUploadMaxBytes | `imageUploadMaxBytes()` | 3 | ✓ |
| 63 | adoptImageIntoRoom | `async adoptImageIntoRoom(image, purpose)` | 45 | ✓ |
| 116 | uploadImageFile | `async uploadImageFile(file, purpose)` | 18 | ✓ |
| 146 | pickAndUploadImage | `async pickAndUploadImage({ purpose })` | 18 | ✓ |

## 依存

- import → [[js.file-uploader]], [[js.local-identity]], [[js.room-entry]]
- imported by → [[js.background-dialog]], [[js.board-data-driven]], [[js.character-dialog]], [[js.panel-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
