---
source: js/stamp-layer.js
lines: 190
exports: 2
imported_by: 2
api_sha: 592ee42af932
prose_sha: 592ee42af932
generated: 2026-08-30
tags: [codemap]
---

# js/stamp-layer.js

<!-- prose:summary -->
スタンプの表示レイヤー。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
スタンプの表示レイヤーと、送信の入口（requestStamp）。届いたスタンプ（WebSocketの揮発メッセージ SHOW_STAMP → EventBus の STAMP_RECEIVED）を盤面の右上へ1分だけ出す。状態にもログにも残さない。参加者ごとに1列を割り当て、同じ人の連投はその列の中でずらして重ねる（他人のスタンプ同士は重ねない、という仕様のため）。列に名前を出すのは一番新しい1枚だけで、連投しても同じ名前が縦に並ばない。送信側は requestStamp に集約してあり、[[js.stamp-panel]] のボタンからも [[js.main]] のチャットコマンドからも同じ経路を通る。ここで送信（揮発。上限で間引かれる）と集計（[[js.game-store]] の COUNT_STAMP。上限なし）の両方を行うので、上限に当たった枚は「盤面には出ないが数は増える」。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 162 | fn | requestStamp | `requestStamp(stampId)` | スタンプを送る。 |
| 184 | fn | initStampLayer | `initStampLayer()` |  |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 35 | pickColumnIndex | `pickColumnIndex()` | 7 |  |
| 44 | claimColumn | `claimColumn(participantId)` | 18 |  |
| 66 | refreshColumnNames | `refreshColumnNames(column)` | 6 |  |
| 74 | removeItem | `removeItem(participantId, item)` | 11 |  |
| 88 | buildStampElement | `buildStampElement(stamp, name)` | 37 |  |
| 127 | showStamp | `showStamp({ stampId, participantId, name })` | 22 |  |
| 162 | requestStamp | `requestStamp(stampId)` | 4 | ✓ |
| 173 | countStamp | `countStamp(stampId)` | 10 |  |
| 184 | initStampLayer | `initStampLayer()` | 6 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.board-data-driven]], [[js.local-identity]], [[js.net-sync]], [[js.stamp-registry]]
- imported by → [[js.main]], [[js.stamp-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
