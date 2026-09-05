---
source: js/asset-store.js
lines: 473
exports: 19
imported_by: 9
api_sha: d3c98bc5f4df
prose_sha: d3c98bc5f4df
generated: 2026-09-05
tags: [codemap]
---

# js/asset-store.js

<!-- prose:summary -->
P2P卓で使う、画像・音源の実体の置き場（IndexedDB）。中身のSHA-256を名前にし、状態には /asset/<hash> の参照だけを載せる。状態を歩いて集める・差し替える道具もここ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（19）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | const | ASSET_PATH_PREFIX | `ASSET_PATH_PREFIX` |  |
| 35 | const | MAX_ASSET_BYTES | `MAX_ASSET_BYTES` | 1件あたりの上限。 |
| 78 | fn | hashBlob | `async hashBlob(blob)` | 中身から名前を作る。 |
| 88 | fn | assetRef | `assetRef(hash)` | 状態に書ける参照の形にする。 |
| 97 | fn | assetRefHash | `assetRefHash(value)` | 参照からハッシュを取り出す。 |
| 109 | fn | putAsset | `async putAsset(blob, knownHash)` | 実体をしまう。 |
| 138 | fn | getAsset | `async getAsset(hash)` | 実体を取り出す。 |
| 150 | fn | hasAsset | `async hasAsset(hash)` | 持っているか。 |
| 194 | fn | collectAssetHashes | `collectAssetHashes(state)` | 状態の中に出てくる参照を全部集める。 |
| 224 | fn | listMissingAssetHashes | `async listMissingAssetHashes(state)` | 状態が使っている参照のうち、まだ持っていないものを返す。 |
| 248 | fn | embedAssetsInState | `async embedAssetsInState(state, limitBytes)` | 状態に出てくる参照を、持っている実体のデータURLへ置き換えて自己完結にする。 |
| 281 | fn | replaceAssetRefs | `replaceAssetRefs(value, map)` | 状態の中の参照を差し替えた、新しい状態を作る。 |
| 299 | fn | assetAsDataUrl | `async assetAsDataUrl(hash)` | 実体をデータURLにする。 |
| 320 | fn | blobToBase64 | `async blobToBase64(blob)` | 実体をbase64にする。 |
| 337 | fn | base64ToBlob | `base64ToBlob(base64, type)` | base64を実体に戻す。 |
| 359 | fn | putVerifiedAsset | `async putVerifiedAsset(hash, blob)` | 受け取った実体を、名乗られたハッシュと突き合わせてからしまう。 |
| 383 | fn | dataUrlToBlob | `dataUrlToBlob(dataUrl)` | データURLを実体（Blob）にする。 |
| 419 | fn | adoptDataUrlsInState | `async adoptDataUrlsInState(state)` | 状態に埋まっているデータURLを、この置き場の実体へ移し替える。 |
| 462 | fn | adoptDataUrl | `async adoptDataUrl(value)` | データURLを実体としてしまい、参照を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（22）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 44 | openDb | `openDb()` | 17 |  |
| 62 | tx | `tx(db, mode)` | 3 |  |
| 66 | wrap | `wrap(request)` | 6 |  |
| 78 | hashBlob | `async hashBlob(blob)` | 4 | ✓ |
| 88 | assetRef | `assetRef(hash)` | 3 | ✓ |
| 97 | assetRefHash | `assetRefHash(value)` | 5 | ✓ |
| 109 | putAsset | `async putAsset(blob, knownHash)` | 23 | ✓ |
| 138 | getAsset | `async getAsset(hash)` | 10 | ✓ |
| 150 | hasAsset | `async hasAsset(hash)` | 6 | ✓ |
| 157 | touchAsset | `async touchAsset(hash)` | 8 |  |
| 168 | evictIfNeeded | `async evictIfNeeded()` | 15 |  |
| 194 | collectAssetHashes | `collectAssetHashes(state)` | 24 | ✓ |
| 224 | listMissingAssetHashes | `async listMissingAssetHashes(state)` | 8 | ✓ |
| 248 | embedAssetsInState | `async embedAssetsInState(state, limitBytes)` | 24 | ✓ |
| 281 | replaceAssetRefs | `replaceAssetRefs(value, map)` | 12 | ✓ |
| 299 | assetAsDataUrl | `async assetAsDataUrl(hash)` | 10 | ✓ |
| 320 | blobToBase64 | `async blobToBase64(blob)` | 10 | ✓ |
| 337 | base64ToBlob | `base64ToBlob(base64, type)` | 10 | ✓ |
| 359 | putVerifiedAsset | `async putVerifiedAsset(hash, blob)` | 11 | ✓ |
| 383 | dataUrlToBlob | `dataUrlToBlob(dataUrl)` | 18 | ✓ |
| 419 | adoptDataUrlsInState | `async adoptDataUrlsInState(state)` | 36 | ✓ |
| 462 | adoptDataUrl | `async adoptDataUrl(value)` | 11 | ✓ |

## 依存

- import → なし
- imported by → [[js.asset-sync]], [[js.audio-dialog]], [[js.host-persistence]], [[js.image-upload]], [[js.main]], [[js.net-host]], [[js.net-sync]], [[js.room-index]], [[js.token-library-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
