---
source: js/asset-base.js
lines: 75
exports: 4
imported_by: 3
api_sha: 038ecdefc9e7
prose_sha: 038ecdefc9e7
generated: 2026-08-28
tags: [codemap]
---

# js/asset-base.js

<!-- prose:summary -->
「このアプリが画面に出す絵のうち、リポジトリに置いていないもの」の置き場所を1か所で持つ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 39 | fn | setAssetBaseUrl | `setAssetBaseUrl(url)` | 置き場所を設定する。 |
| 53 | fn | assetBaseVersion | `assetBaseVersion()` | 置き場所が今までに何回変わったか。 |
| 58 | fn | hasAssetBaseUrl | `hasAssetBaseUrl()` | 置き場所が設定されているか。 |
| 69 | fn | assetUrl | `assetUrl(relativePath)` | 外部に置いた絵のURLを組み立てる。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 39 | setAssetBaseUrl | `setAssetBaseUrl(url)` | 7 | ✓ |
| 53 | assetBaseVersion | `assetBaseVersion()` | 3 | ✓ |
| 58 | hasAssetBaseUrl | `hasAssetBaseUrl()` | 3 | ✓ |
| 69 | assetUrl | `assetUrl(relativePath)` | 6 | ✓ |

## 依存

- import → なし
- imported by → [[js.card-catalog]], [[js.main]], [[js.stamp-registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
