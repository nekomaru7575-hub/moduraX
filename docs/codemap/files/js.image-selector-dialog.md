---
source: js/image-selector-dialog.js
lines: 445
exports: 1
imported_by: 1
api_sha: 65eee4cd2c31
prose_sha: 65eee4cd2c31
generated: 2026-09-09
tags: [codemap]
---

# js/image-selector-dialog.js

<!-- prose:summary -->
画像を選ぶ画面。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
アップローダ（ファイルを選んで溜める）とセレクタ（溜めたもの・この部屋で使っているものから選ぶ）を1枚に収めた画面。置き場へ送る（[[js.image-upload]] の commitImageBlob）のはここだけで、呼び出し元へ返すのは常に確定した文字列URLとキー。溜め置きは [[js.image-pool]]、用途ごとの可否は [[js.store.images]] に委ねる。呼び出し元は [[js.image-field]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 65 | fn | showImageSelectorDialog | `async showImageSelectorDialog({ purpose, usedImages = new Set(), title = '画像を選ぶ' })` | 画像を選ばせて、置き場へ送ったうえで確定した指し先を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | formatBytes | `formatBytes(bytes)` | 4 |  |
| 65 | showImageSelectorDialog | `async showImageSelectorDialog({ purpose, usedImages = new Set(), title = '画像を選ぶ' })` | **380** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.file-uploader]], [[js.image-dimensions]], [[js.image-pool]], [[js.image-upload]], [[js.room-authority]], [[js.store.images]]
- imported by → [[js.image-field]]

## 注意

<!-- prose:notes -->
プールの参照（`{kind:'pool', …}`）を外へ出さない。コマとパネルの image には検証が無いので、漏れると「持っている本人だけ絵が見える」状態が全員へ配られる。

blob: のURLを作るのはこのファイルだけで、後始末（revoke）もここに閉じている。`<dialog>` の close イベントはこの環境で発火しないため、確定・キャンセル・Esc の3経路が同じ finish() を通るように書いてある。リークは画面に何も出ないので、責任を散らさないこと。

断り方（上限超過・種類違い・GM限定・保存の失敗）はすべてこの画面の帯に出す。alert は使わない。
<!-- /prose:notes -->
