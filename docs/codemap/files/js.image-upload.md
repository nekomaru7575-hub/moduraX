---
source: js/image-upload.js
lines: 254
exports: 7
imported_by: 8
api_sha: 7b81155a1ba8
prose_sha: 7b81155a1ba8
generated: 2026-09-09
tags: [codemap]
---

# js/image-upload.js

<!-- prose:summary -->
画像をサーバー経由でR2へ上げ、公開URLを受け取る。P2P卓ではR2を通さず、このブラウザへしまう（js/asset-store.js）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
画像をサーバー経由で Cloudflare R2 へ上げ、公開 URL を受け取る。アップロード可否の判定とサイズ上限もここが持つ。サーバー側の実体は [[server.r2]]。「選ぶ」と「しまう」は分かれていて、ファイルを選ばせてから上げる pickAndUploadImage（コマ・スタンプ・デッキが使う）と、手元のBlobを上げるだけの commitImageBlob（[[js.image-selector-dialog]] が使う）の2つの口がある。分岐（R2 / P2P卓 / データURL退避）はどちらも同じ。
<!-- /prose:role -->

## export（7）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 29 | fn | currentRoomId | `currentRoomId()` | 現在の部屋ID。 |
| 74 | fn | isImageUploadAvailable | `async isImageUploadAvailable()` | アップロードが使える環境か。 |
| 89 | fn | imageUploadMaxBytes | `imageUploadMaxBytes()` | 1枚あたりの上限バイト数（取得できていなければnull）。 |
| 110 | fn | adoptImageIntoRoom | `async adoptImageIntoRoom(image, purpose)` | JSONから取り込んだ画像を、この部屋の持ち物にする。 |
| 182 | fn | uploadImageFile | `async uploadImageFile(file, purpose)` | 画像をアップロードして公開URLとキーを受け取る。 |
| 219 | fn | commitImageBlob | `async commitImageBlob(blob, purpose)` | 手元のBlobを、この環境で表示に使える文字列にする。 |
| 249 | fn | pickAndUploadImage | `async pickAndUploadImage({ purpose })` | 画像を選ばせて、R2へ上げたうえで表示に使える文字列を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 29 | currentRoomId | `currentRoomId()` | 3 | ✓ |
| 50 | fetchUpload | `async fetchUpload(url, options)` | 18 |  |
| 74 | isImageUploadAvailable | `async isImageUploadAvailable()` | 13 | ✓ |
| 89 | imageUploadMaxBytes | `imageUploadMaxBytes()` | 4 | ✓ |
| 110 | adoptImageIntoRoom | `async adoptImageIntoRoom(image, purpose)` | 64 | ✓ |
| 182 | uploadImageFile | `async uploadImageFile(file, purpose)` | 23 | ✓ |
| 219 | commitImageBlob | `async commitImageBlob(blob, purpose)` | 15 | ✓ |
| 249 | pickAndUploadImage | `async pickAndUploadImage({ purpose })` | 5 | ✓ |

## 依存

- import → [[js.asset-store]], [[js.asset-sync]], [[js.file-uploader]], [[js.local-identity]], [[js.net-transport]], [[js.room-entry]]
- imported by → [[js.board-data-driven]], [[js.character-dialog]], [[js.deck-editor-dialog]], [[js.deck-file]], [[js.image-pool]], [[js.image-selector-dialog]], [[js.room-stamp-dialog]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
