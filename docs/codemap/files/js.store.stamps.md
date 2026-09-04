---
source: js/store/stamps.js
lines: 143
exports: 9
imported_by: 7
api_sha: b873d8a7d79b
prose_sha: b873d8a7d79b
generated: 2026-09-04
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

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | const | ROOM_STAMP_NAMESPACE | `ROOM_STAMP_NAMESPACE` | 公開IDの名前空間。 |
| 28 | fn | roomStampPublicId | `roomStampPublicId(localId)` | ローカルidから公開IDを作る。 |
| 37 | const | MAX_ROOM_STAMPS | `MAX_ROOM_STAMPS` | 1部屋あたりの登録数。 |
| 40 | const | MAX_ROOM_STAMP_LABEL_LENGTH | `MAX_ROOM_STAMP_LABEL_LENGTH` | ボタンの下と集計の見出しに出る名前。 |
| 44 | const | MAX_ROOM_STAMP_URL_LENGTH | `MAX_ROOM_STAMP_URL_LENGTH` | 画像URL。 |
| 47 | const | MAX_ROOM_STAMP_LOCAL_ID_LENGTH | `MAX_ROOM_STAMP_LOCAL_ID_LENGTH` | ローカルid（js/store/ids.jsのgenerateRoomStampIdが作る形）。 |
| 80 | fn | isAllowedRoomStampUrl | `isAllowedRoomStampUrl(url)` | スタンプの画像URLとして受け入れてよい形か。 |
| 93 | fn | normalizeRoomStamp | `normalizeRoomStamp(raw)` | payload 1件を、状態に載せてよい形へ均す。 |
| 121 | fn | normalizeRoomStampMap | `normalizeRoomStampMap(stamps)` | 保存済み・取り込み済みの room.stamps を均す。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | roomStampPublicId | `roomStampPublicId(localId)` | 3 | ✓ |
| 80 | isAllowedRoomStampUrl | `isAllowedRoomStampUrl(url)` | 5 | ✓ |
| 93 | normalizeRoomStamp | `normalizeRoomStamp(raw)` | 21 | ✓ |
| 121 | normalizeRoomStampMap | `normalizeRoomStampMap(stamps)` | 22 | ✓ |

## 依存

- import → なし
- imported by → [[js.game-store]], [[js.main]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.stamp-registry]], [[js.store.handlers.room]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
