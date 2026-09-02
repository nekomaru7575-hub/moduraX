---
source: js/parameters/core.js
lines: 23
exports: 4
imported_by: 4
api_sha: 7e101fa59465
prose_sha: 7e101fa59465
generated: 2026-09-02
tags: [codemap]
---

# js/parameters/core.js

<!-- prose:summary -->
どのシステムでも共通の、コマのパラメータ（HP・イニシアチブ）とルーム変数（現在のラウンド）の定義。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
プラグインが無くても必ず付くものを、コマのパラメータ（CORE_DEFAULT_PARAMETERS）と部屋のルーム変数（CORE_DEFAULT_ROOM_PARAMETERS）の2組に分けて宣言する。実際のオブジェクト化は [[js.parameters.paramFactory]] に委ねる。イニシアチブは locked かつ非表示で、ラウンド進行が内部的に使う。「現在のラウンド」は locked かつ editable:false で、値を実際に動かすのは [[js.game-store]]（withCoreRoomParameters）側であり、ここは定義と初期値0を置くだけ。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 4 | const | CORE_DEFAULT_PARAMETERS | `CORE_DEFAULT_PARAMETERS` |  |
| 9 | fn | buildDefaultParameters | `buildDefaultParameters()` |  |
| 17 | const | CORE_DEFAULT_ROOM_PARAMETERS | `CORE_DEFAULT_ROOM_PARAMETERS` | どのシステムでも共通のルーム変数。 |
| 21 | fn | buildDefaultRoomParameters | `buildDefaultRoomParameters()` |  |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 9 | buildDefaultParameters | `buildDefaultParameters()` | 3 | ✓ |
| 21 | buildDefaultRoomParameters | `buildDefaultRoomParameters()` | 3 | ✓ |

## 依存

- import → [[js.parameters.paramFactory]]
- imported by → [[js.character-dialog]], [[js.game-store]], [[js.store.handlers.characters]], [[js.store.room]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
