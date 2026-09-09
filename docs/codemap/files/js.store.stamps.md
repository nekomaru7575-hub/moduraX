---
source: js/store/stamps.js
lines: 171
exports: 12
imported_by: 9
api_sha: 696cff058238
prose_sha: b873d8a7d79b
generated: 2026-09-09
tags: [codemap]
---

# js/store/stamps.js

<!-- prose:summary -->
部屋ごとに登録するスタンプ（room.stamps）の形と上限。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋に登録するスタンプ（room.stamps）の"何を受け付けるか"を1か所に集めた規則。reducer（js/store/handlers/room.js）とhydrate（js/game-store.js）と画面（js/room-stamp-dialog.js）が同じ判定を通すための置き場で、上限・ID・URLの許可リストを持つ。

スタンプで唯一URLを状態に持つのがこの機能なので、ここが緩むと「全員のブラウザに任意のURLを読ませる」ことになる。データURLと相対パスを拒む理由はコード側のコメントにある。
<!-- /prose:role -->

## export（12）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | ROOM_STAMP_NAMESPACE | `ROOM_STAMP_NAMESPACE` | 公開IDの名前空間。 |
| 28 | fn | roomStampPublicId | `roomStampPublicId(localId)` | ローカルidから公開IDを作る。 |
| 36 | const | ROOM_STAMP_TOTAL_SOURCE | `ROOM_STAMP_TOTAL_SOURCE` | 「集計する」を選んだスタンプの合計を入れるルーム変数の出自。 |
| 42 | fn | roomStampTotalParamId | `roomStampTotalParamId(stampPublicId)` | そのスタンプの合計を入れるルーム変数のID。 |
| 48 | fn | roomStampTotalLabel | `roomStampTotalLabel(label)` | ルーム変数に出す名前。 |
| 57 | const | MAX_ROOM_STAMPS | `MAX_ROOM_STAMPS` | 1部屋あたりの登録数。 |
| 60 | const | MAX_ROOM_STAMP_LABEL_LENGTH | `MAX_ROOM_STAMP_LABEL_LENGTH` | ボタンの下と集計の見出しに出る名前。 |
| 64 | const | MAX_ROOM_STAMP_URL_LENGTH | `MAX_ROOM_STAMP_URL_LENGTH` | 画像URL。 |
| 67 | const | MAX_ROOM_STAMP_LOCAL_ID_LENGTH | `MAX_ROOM_STAMP_LOCAL_ID_LENGTH` | ローカルid（js/store/ids.jsのgenerateRoomStampIdが作る形）。 |
| 100 | fn | isAllowedRoomStampUrl | `isAllowedRoomStampUrl(url)` | スタンプの画像URLとして受け入れてよい形か。 |
| 117 | fn | normalizeRoomStamp | `normalizeRoomStamp(raw)` | payload 1件を、状態に載せてよい形へ均す。 |
| 149 | fn | normalizeRoomStampMap | `normalizeRoomStampMap(stamps)` | 保存済み・取り込み済みの room.stamps を均す。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | roomStampPublicId | `roomStampPublicId(localId)` | 3 | ✓ |
| 42 | roomStampTotalParamId | `roomStampTotalParamId(stampPublicId)` | 4 | ✓ |
| 48 | roomStampTotalLabel | `roomStampTotalLabel(label)` | 3 | ✓ |
| 100 | isAllowedRoomStampUrl | `isAllowedRoomStampUrl(url)` | 5 | ✓ |
| 117 | normalizeRoomStamp | `normalizeRoomStamp(raw)` | 25 | ✓ |
| 149 | normalizeRoomStampMap | `normalizeRoomStampMap(stamps)` | 22 | ✓ |

## 依存

- import → なし
- imported by → [[js.game-store]], [[js.main]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.stamp-registry]], [[js.store.handlers.room]], [[js.store.images]], [[js.store.room]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
