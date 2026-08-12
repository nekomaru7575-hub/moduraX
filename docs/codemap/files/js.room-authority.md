---
source: js/room-authority.js
lines: 63
exports: 3
imported_by: 3
api_sha: 2269f260bec3
prose_sha: 2269f260bec3
generated: 2026-08-12
tags: [codemap]
---

# js/room-authority.js

<!-- prose:summary -->
「部屋そのものを左右する操作（部屋の削除、システム/プラグインの変更、音源の追加、 セッションデータの読み込み、ラウンド進行）をしてよいのは誰か」の判定を1か所にまとめる。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「部屋そのものを左右する操作を誰がしてよいか」と「そのコマを誰が触ってよいか」の判定を1か所に集めたモジュール。canOperateAsGm は部屋の削除・システム変更・音源追加・セッションデータ読み込み・ラウンド進行が対象で、GM が1人もいない部屋では全員に開く。canOperateToken は持ち主本人と GM だけに絞る。画面側の見せ方を決めるだけで、実際の可否はサーバー（[[server.index]] の GM_ONLY_ACTIONS）も同じ規則で判定する。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 20 | const | GM_ONLY_REASON | `GM_ONLY_REASON` | 無効化した項目のtitleに入れる共通の理由。 |
| 33 | fn | canOperateAsGm | `canOperateAsGm()` | 部屋レベルの操作をしてよいか。 |
| 56 | fn | canOperateToken | `canOperateToken(token)` | そのコマを操作してよいか（更新・JSON読み込み・削除・バックヤードへの回収、 ラウンド進行でのプロット提出）。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | hasAnyGm | `hasAnyGm(participants)` | 3 |  |
| 33 | canOperateAsGm | `canOperateAsGm()` | 9 | ✓ |
| 56 | canOperateToken | `canOperateToken(token)` | 7 | ✓ |

## 依存

- import → [[js.game-store]], [[js.local-identity]], [[js.net-sync]], [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.main]], [[js.round-panel]]

## 注意

<!-- prose:notes -->
canOperateToken の中で canOperateAsGm() を使わないこと。「GM 不在なら全員に開く」規則まで入り込み、GM のいない部屋で他人のコマまで触れるようになる。
<!-- /prose:notes -->
