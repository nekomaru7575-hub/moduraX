---
source: js/room-authority.js
lines: 42
exports: 2
imported_by: 3
api_sha: af9de3741cdf
prose_sha: af9de3741cdf
generated: 2026-08-07
tags: [codemap]
---

# js/room-authority.js

<!-- prose:summary -->
「部屋そのものを左右する操作（部屋の削除、システム/プラグインの変更、音源の追加、 セッションデータの読み込み、ラウンド進行）をしてよいのは誰か」の判定を1か所にまとめる。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「部屋そのものを左右する操作を誰がしてよいか」の判定を1か所に集めたモジュール。部屋の削除、システム変更、音源追加、セッションデータ読み込み、ラウンド進行がここの対象。個々の呼び出し側で権限判定を書かないための集約点なので、権限まわりの変更はまずここを見る。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 20 | const | GM_ONLY_REASON | `GM_ONLY_REASON` | 無効化した項目のtitleに入れる共通の理由。 |
| 33 | fn | canOperateAsGm | `canOperateAsGm()` | 部屋レベルの操作をしてよいか。 |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 24 | hasAnyGm | `hasAnyGm(participants)` | 3 |

## 依存

- import → [[js.game-store]], [[js.local-identity]], [[js.net-sync]], [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.main]], [[js.round-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
