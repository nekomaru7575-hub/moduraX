---
source: js/image-selector-dialog.js
lines: 495
exports: 2
imported_by: 3
api_sha: f99e8bc316a6
prose_sha: f99e8bc316a6
generated: 2026-09-10
tags: [codemap]
---

# js/image-selector-dialog.js

<!-- prose:summary -->
画像を選ぶ画面。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
アップローダ（ファイルを選んで溜める）とセレクタ（溜めたもの・この部屋で使っているものから選ぶ）を1枚に収めた画面。2つの開き方がある——用途を決めて選ばせる `showImageSelectorDialog`（コマ・パネル・背景の「画像を選択」から。[[js.image-field]] と [[js.character-dialog]] が呼ぶ）と、選ぶ相手を決めずに溜める・消すだけの `showImageStockDialog`（部屋の「+」から。[[js.main]] が呼ぶ）。中身は同じで、後者は確定ボタンの無い形で開く。置き場へ送る（[[js.image-upload]] の commitImageBlob）のは前者だけで、呼び出し元へ返すのは常に確定した文字列URLとキー。溜め置きは [[js.image-pool]]、用途ごとの可否は [[js.store.images]] に委ねる。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 62 | fn | showImageStockDialog | `showImageStockDialog({ usedImages = new Set() } = {})` | 画像を溜めておくだけの画面（部屋の「+」から開く）。 |
| 81 | fn | showImageSelectorDialog | `async showImageSelectorDialog({ purpose = null, usedImages = new Set(), title = '画像を選ぶ', mode = 'pick' })` | 画像を選ばせて、置き場へ送ったうえで確定した指し先を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 47 | formatBytes | `formatBytes(bytes)` | 4 |  |
| 62 | showImageStockDialog | `showImageStockDialog({ usedImages = new Set() } = {})` | 3 | ✓ |
| 81 | showImageSelectorDialog | `async showImageSelectorDialog({ purpose = null, usedImages = new Set(), title = '画像を選ぶ', mode = 'pick' })` | **414** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.file-uploader]], [[js.image-dimensions]], [[js.image-pool]], [[js.image-upload]], [[js.room-authority]], [[js.store.images]]
- imported by → [[js.character-dialog]], [[js.image-field]], [[js.main]]

## 注意

<!-- prose:notes -->
プールの参照（`{kind:'pool', …}`）を外へ出さない。コマとパネルの image には検証が無いので、漏れると「持っている本人だけ絵が見える」状態が全員へ配られる。

blob: のURLを作るのはこのファイルだけで、後始末（revoke）もここに閉じている。`<dialog>` の close イベントはこの環境で発火しないため、確定・キャンセル・Esc の3経路が同じ finish() を通るように書いてある。リークは画面に何も出ないので、責任を散らさないこと。

溜め置きモードではGMを見ない。溜めるのはこのブラウザの中だけで、GMの門が要るのは置き場へ送るとき（背景・スタンプ）だから。門そのものはサーバーが持っており、ここでの無効化は案内でしかない。

断り方（上限超過・種類違い・GM限定・保存の失敗）はすべてこの画面の帯に出す。alert は使わない。
<!-- /prose:notes -->
