---
source: js/stamp-registry.js
lines: 188
exports: 5
imported_by: 6
api_sha: ab6e49a988af
prose_sha: e8f7d415d1a8
generated: 2026-09-04
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
| 133 | fn | listStamps | `listStamps(room)` | その部屋で使えるスタンプの一覧（Coreの分＋適用中プラグインの分＋部屋に登録された分）。 |
| 149 | fn | findStamp | `findStamp(stampId, room)` | IDからスタンプを引く。 |
| 155 | fn | isKnownStampId | `isKnownStampId(stampId, room)` | サーバーが受け取ったIDを検証するための判定。 |
| 166 | fn | findStampByName | `findStampByName(rawName, room)` | チャットコマンド「スタンプ(拍手)」の引数からスタンプを引く。 |
| 185 | fn | listStampLabels | `listStampLabels(room)` | 「使えるスタンプ: OK／No／…」の案内文に使う。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 59 | isPlainPathSegment | `isPlainPathSegment(name)` | 4 |  |
| 78 | normalizeStamp | `normalizeStamp(stamp, { idPrefix = '', dirSegment = '' } = {})` | 14 |  |
| 104 | listStaticStamps | `listStaticStamps(pluginId)` | 18 |  |
| 133 | listStamps | `listStamps(room)` | 14 | ✓ |
| 149 | findStamp | `findStamp(stampId, room)` | 4 | ✓ |
| 155 | isKnownStampId | `isKnownStampId(stampId, room)` | 3 | ✓ |
| 166 | findStampByName | `findStampByName(rawName, room)` | 17 | ✓ |
| 185 | listStampLabels | `listStampLabels(room)` | 3 | ✓ |

## 依存

- import → [[js.asset-base]], [[js.parameters.registry]], [[js.stamp-catalog]], [[js.store.stamps]]
- imported by → [[js.main]], [[js.net-host]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.store.handlers.participants]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
