---
source: js/room-authority.js
lines: 83
exports: 4
imported_by: 5
api_sha: d50dece78adf
prose_sha: d50dece78adf
generated: 2026-08-17
tags: [codemap]
---

# js/room-authority.js

<!-- prose:summary -->
「部屋そのものを左右する操作（部屋の削除、システム/プラグインの変更、音源の追加、 セッションデータの読み込み、ラウンド進行）をしてよいのは誰か」の判定を1か所にまとめる。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「部屋そのものを左右する操作を誰がしてよいか」「そのコマを誰が触ってよいか」「その発言を誰が直してよいか」の判定を1か所に集めたモジュール。canOperateAsGm は部屋の削除・システム変更・音源追加・セッションデータ読み込み・ラウンド進行が対象で、GM が1人もいない部屋では全員に開く。canOperateToken は持ち主本人と GM だけに絞る。canEditChatEntry はチャットログ1件の本文の書き直しで、発言者本人と GM だけに開き、id を持たない発言（過去ログ・システム発言）は誰にも開かない。canOperateAsGm の対象だけはサーバー（[[server.index]] の GM_ONLY_ACTIONS）も同じ規則で判定するが、コマと発言の2つは画面側だけの制限でサーバーは強制しない。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 20 | const | GM_ONLY_REASON | `GM_ONLY_REASON` | 無効化した項目のtitleに入れる共通の理由。 |
| 33 | fn | canOperateAsGm | `canOperateAsGm()` | 部屋レベルの操作をしてよいか。 |
| 56 | fn | canOperateToken | `canOperateToken(token)` | そのコマを操作してよいか（更新・JSON読み込み・削除・バックヤードへの回収、 ラウンド進行でのプロット提出）。 |
| 77 | fn | canEditChatEntry | `canEditChatEntry(entry)` | その発言（チャットログ1件）の本文を書き直してよいか。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | hasAnyGm | `hasAnyGm(participants)` | 3 |  |
| 33 | canOperateAsGm | `canOperateAsGm()` | 9 | ✓ |
| 56 | canOperateToken | `canOperateToken(token)` | 7 | ✓ |
| 77 | canEditChatEntry | `canEditChatEntry(entry)` | 6 | ✓ |

## 依存

- import → [[js.game-store]], [[js.local-identity]], [[js.net-sync]], [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.dice-draft-panel]], [[js.main]], [[js.round-panel]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
canOperateToken・canEditChatEntry の中で canOperateAsGm() を使わないこと。「GM 不在なら全員に開く」規則まで入り込み、GM のいない部屋で他人のコマや発言まで触れるようになる。GM 判定は isGm() で行う。

持ち主が分からないものの扱いは、コマ・情報と発言とで**わざと逆**にしてある。コマ（ownerId 無し）は誰でも触れるが、発言（ownerId 無し）は GM だけ。チャットは件数が桁違いに多く、部屋の過去ログが丸ごと誰でも書き換えられる状態は事故が大きいため。
<!-- /prose:notes -->
