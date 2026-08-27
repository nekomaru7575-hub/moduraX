---
source: js/parameters/gcrest.js
lines: 24
exports: 3
imported_by: 0
api_sha: 6160f0c847e2
prose_sha: 6160f0c847e2
generated: 2026-08-27
tags: [codemap]
---

# js/parameters/gcrest.js

<!-- prose:summary -->
グランクレストのプラグイン記述子（プラグインの書き方の見本）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ルーム変数を1つ持つだけの最小構成で、キャラクター側のパラメータは省略されている。新しいシステムのプラグインを足すときの雛形として読むのがよい。どこからも import されておらず、[[js.parameters.registry]] にも登録されていない。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 4 | const | GCREST_ROOM_PARAMETERS | `GCREST_ROOM_PARAMETERS` |  |
| 8 | fn | buildGcrestRoomParameters | `buildGcrestRoomParameters()` |  |
| 12 | const | GCREST_PLUGIN | `GCREST_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 8 | buildGcrestRoomParameters | `buildGcrestRoomParameters()` | 3 | ✓ |

## 依存

- import → [[js.parameters.paramFactory]]
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
