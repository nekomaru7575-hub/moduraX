---
source: js/store/stamps.js
lines: 171
exports: 12
imported_by: 9
api_sha: 696cff058238
prose_sha: 696cff058238
generated: 2026-09-09
tags: [codemap]
---

# js/store/stamps.js

<!-- prose:summary -->
部屋ごとに登録するスタンプ（room.stamps）の形と上限。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋に登録するスタンプ（room.stamps）の「何を受け付けるか」を1か所に集めた規則。reducer（js/store/handlers/room.js）と hydrate（[[js.game-store]]）と画面（[[js.room-stamp-dialog]]）が同じ判定を通すための置き場で、登録数・名前・ローカルid・画像URLの上限と許可リストを持つ。公開IDの名前空間（`room:`）を冠するのもここ。「集計する」を選んだスタンプは、押された合計がルーム変数として出る——その変数のIDと表示名の作り方（roomStampTotalParamId / roomStampTotalLabel）もここが決め、集計そのものは [[js.store.room]] の withRoomStampTotals が行う。一覧の組み立ては [[js.stamp-registry]] の仕事で、ここからは import しない（依存は registry → ここ の一方向）。
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
スタンプで唯一URLを状態に持つのがこの機能なので、ここが緩むと「全員のブラウザに任意のURLを読ませる」ことになる。`isAllowedRoomStampUrl` は許可リスト方式で `https://` と `/asset/<64桁hex>` の2形しか通さない。データURLを拒むのは数MBのblobがroomに載って以後すべてのアクションで書き直されるから、相対パスを拒むのは状態に書いた任意のパスを全員の img.src へ向けられるから（詳しい理由はコード側のコメント）。

`/asset/<hash>` の正規表現は [[js.asset-store]] と sw.js に続く3つ目の写し。IndexedDBを触るモジュールをサーバーの import 網へ引き込まないために手元に置いてあり、食い違わないことは test/asset-store.test.js が見張っている。

URLは切り詰めない。中途半端に短くしたURLは別のものを指すので、長すぎるものは丸ごと拒む。
<!-- /prose:notes -->
