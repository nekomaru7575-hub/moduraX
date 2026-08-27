---
source: js/stamp-registry.js
lines: 134
exports: 5
imported_by: 5
api_sha: e8f7d415d1a8
prose_sha: e8f7d415d1a8
generated: 2026-08-27
tags: [codemap]
---

# js/stamp-registry.js

<!-- prose:summary -->
「この部屋で使えるスタンプ」を1か所で決める。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「この部屋で使えるスタンプ」を決める唯一の場所。Coreの表（[[js.stamp-catalog]]）と、適用中プラグインが記述子の `stamps` で宣言した表（[[js.parameters.registry]] の listPluginStamps）を束ね、ID→`{id, label, url}` の解決・名前からの逆引き・サーバー側の検証（isKnownStampId）を提供する。プラグインのスタンプはIDを `プラグインid:id` と名前空間化し、画像URLは `image/stamps/<プラグインid>/<file>` としてここが組み立てる（フォルダ名はidそのまま。小文字化していた頃は、大文字小文字を区別しないWindowsでだけ正しく見えて本番のLinuxで404になる事故を起こした）。プラグインにパスを書かせないのは、「送受信するのはIDだけ・URLは受け取った側が組み立てる」というスタンプの約束をプラグイン経由で破らせないため。サーバー（server/index.js）と画面（[[js.stamp-panel]]・[[js.stamp-layer]]・[[js.main]]）が同じ判定を使うよう、DOM/windowには触れない。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 77 | fn | listStamps | `listStamps(pluginId)` | その部屋で使えるスタンプの一覧（Coreの分＋適用中プラグインの分）。 |
| 97 | fn | findStamp | `findStamp(stampId, pluginId)` | IDからスタンプを引く。 |
| 103 | fn | isKnownStampId | `isKnownStampId(stampId, pluginId)` | サーバーが受け取ったIDを検証するための判定。 |
| 113 | fn | findStampByName | `findStampByName(rawName, pluginId)` | チャットコマンド「スタンプ(拍手)」の引数からスタンプを引く。 |
| 131 | fn | listStampLabels | `listStampLabels(pluginId)` | 「使えるスタンプ: OK／No／…」の案内文に使う。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 33 | isPlainPathSegment | `isPlainPathSegment(name)` | 4 |  |
| 52 | normalizeStamp | `normalizeStamp(stamp, { idPrefix = '', dirSegment = '' } = {})` | 14 |  |
| 77 | listStamps | `listStamps(pluginId)` | 18 | ✓ |
| 97 | findStamp | `findStamp(stampId, pluginId)` | 4 | ✓ |
| 103 | isKnownStampId | `isKnownStampId(stampId, pluginId)` | 3 | ✓ |
| 113 | findStampByName | `findStampByName(rawName, pluginId)` | 16 | ✓ |
| 131 | listStampLabels | `listStampLabels(pluginId)` | 3 | ✓ |

## 依存

- import → [[js.asset-base]], [[js.parameters.registry]], [[js.stamp-catalog]]
- imported by → [[js.game-store]], [[js.main]], [[js.stamp-layer]], [[js.stamp-panel]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
