---
source: js/store/info.js
lines: 139
exports: 9
imported_by: 2
api_sha: 2e002c9b17a9
prose_sha: 2e002c9b17a9
generated: 2026-09-10
tags: [codemap]
---

# js/store/info.js

<!-- prose:summary -->
「情報」（タイトル＋区画の共有メモ）の形を整える処理と、伏せ字（masks）の扱い。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | const | MAX_INFO_MASKS_PER_SECTION | `MAX_INFO_MASKS_PER_SECTION` | 情報（infoEntries）の「伏せた語」(masks)の上限。 |
| 16 | const | MAX_INFO_MASK_TEXT_LENGTH | `MAX_INFO_MASK_TEXT_LENGTH` |  |
| 18 | const | MAX_INFO_MASK_CHAR_LENGTH | `MAX_INFO_MASK_CHAR_LENGTH` | 伏せ字。 |
| 19 | const | DEFAULT_INFO_MASK_CHAR | `DEFAULT_INFO_MASK_CHAR` |  |
| 24 | fn | clampMaskChar | `clampMaskChar(value)` | 伏せ字を「人が1文字と見る単位」で切る。 |
| 41 | fn | listMaskMarkers | `listMaskMarkers(body)` | 本文中の伏せ字の目印 {{n}} を頭から拾い、[{ id, start, end }] を出現順に返す。 |
| 56 | fn | normalizeInfoMasks | `normalizeInfoMasks(masks, body)` | 伏せた語の一覧を整える。 |
| 90 | fn | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null, masks = null })` | 情報（infoEntries）のsection1件を作る／整える。 |
| 105 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | clampMaskChar | `clampMaskChar(value)` | 11 | ✓ |
| 41 | listMaskMarkers | `listMaskMarkers(body)` | 10 | ✓ |
| 56 | normalizeInfoMasks | `normalizeInfoMasks(masks, body)` | 29 | ✓ |
| 90 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null, masks = null })` | 10 | ✓ |
| 105 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |

## 依存

- import → [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.info]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
