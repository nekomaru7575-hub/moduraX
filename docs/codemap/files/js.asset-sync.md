---
source: js/asset-sync.js
lines: 187
exports: 5
imported_by: 4
api_sha: 716740a6303b
prose_sha: 716740a6303b
generated: 2026-09-01
tags: [codemap]
---

# js/asset-sync.js

<!-- prose:summary -->
P2P卓で、画像・音源の実体をピアの間で行き来させる。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 41 | fn | initAssetSync | `initAssetSync({ host, send })` | この画面での役どころを決める。 |
| 59 | fn | publishAsset | `async publishAsset(blob)` | 実体をこの部屋のものとしてしまい、状態に書ける参照を返す。 |
| 78 | fn | ensureAssetsFor | `ensureAssetsFor(state)` | 状態が使っている実体のうち、持っていないものをまとめて取りに行く。 |
| 125 | fn | handleAssetMessage | `handleAssetMessage(message)` | 実体にまつわるメッセージを処理する。 |
| 154 | fn | handleAssetMessageAsHost | `handleAssetMessageAsHost(message, reply)` | ホスト役として、参加者からの要求と受け取りを処理する。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 41 | initAssetSync | `initAssetSync({ host, send })` | 7 | ✓ |
| 59 | publishAsset | `async publishAsset(blob)` | 9 | ✓ |
| 78 | ensureAssetsFor | `ensureAssetsFor(state)` | 6 | ✓ |
| 90 | requestAsset | `requestAsset(hash)` | 21 |  |
| 112 | settle | `settle(hash, ok)` | 7 |  |
| 125 | handleAssetMessage | `handleAssetMessage(message)` | 21 | ✓ |
| 154 | handleAssetMessageAsHost | `handleAssetMessageAsHost(message, reply)` | 33 | ✓ |

## 依存

- import → [[js.asset-store]]
- imported by → [[js.audio-dialog]], [[js.image-upload]], [[js.net-host]], [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
