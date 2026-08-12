---
source: js/stamp-registry.js
lines: 107
exports: 5
imported_by: 4
api_sha: e8f7d415d1a8
prose_sha: e8f7d415d1a8
generated: 2026-08-12
tags: [codemap]
---

# js/stamp-registry.js

<!-- prose:summary -->
「この部屋で使えるスタンプ」を1か所で決める。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「この部屋で使えるスタンプ」を決める唯一の場所。Coreの表（[[js.stamp-catalog]]）と、適用中プラグインが記述子の `stamps` で宣言した表（[[js.parameters.registry]] の listPluginStamps）を束ね、ID→`{id, label, url}` の解決・名前からの逆引き・サーバー側の検証（isKnownStampId）を提供する。プラグインのスタンプはIDを `プラグインid:id` と名前空間化し、画像URLは `image/stamps/<プラグインid小文字>/<file>` としてここが組み立てる。プラグインにパスを書かせないのは、「送受信するのはIDだけ・URLは受け取った側が組み立てる」というスタンプの約束をプラグイン経由で破らせないため。サーバー（server/index.js）と画面（[[js.stamp-panel]]・[[js.stamp-layer]]・[[js.main]]）が同じ判定を使うよう、DOM/windowには触れない。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 52 | fn | listStamps | `listStamps(pluginId)` | その部屋で使えるスタンプの一覧（Coreの分＋適用中プラグインの分）。 |
| 70 | fn | findStamp | `findStamp(stampId, pluginId)` | IDからスタンプを引く。 |
| 76 | fn | isKnownStampId | `isKnownStampId(stampId, pluginId)` | サーバーが受け取ったIDを検証するための判定。 |
| 86 | fn | findStampByName | `findStampByName(rawName, pluginId)` | チャットコマンド「スタンプ(拍手)」の引数からスタンプを引く。 |
| 104 | fn | listStampLabels | `listStampLabels(pluginId)` | 「使えるスタンプ: OK／No／…」の案内文に使う。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 25 | isPlainFileName | `isPlainFileName(file)` | 4 |  |
| 31 | normalizeStamp | `normalizeStamp(stamp, { idPrefix = '', dirSegment = '' } = {})` | 10 |  |
| 52 | listStamps | `listStamps(pluginId)` | 16 | ✓ |
| 70 | findStamp | `findStamp(stampId, pluginId)` | 4 | ✓ |
| 76 | isKnownStampId | `isKnownStampId(stampId, pluginId)` | 3 | ✓ |
| 86 | findStampByName | `findStampByName(rawName, pluginId)` | 16 | ✓ |
| 104 | listStampLabels | `listStampLabels(pluginId)` | 3 | ✓ |

## 依存

- import → [[js.parameters.registry]], [[js.stamp-catalog]]
- imported by → [[js.main]], [[js.stamp-layer]], [[js.stamp-panel]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
