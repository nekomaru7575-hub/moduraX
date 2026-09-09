---
source: js/image-pool.js
lines: 307
exports: 10
imported_by: 1
api_sha: d05d9d973084
prose_sha: d05d9d973084
generated: 2026-09-09
tags: [codemap]
---

# js/image-pool.js

<!-- prose:summary -->
「プール」——アップロードした画像を、実際に使われるまでこのブラウザに溜めておく待機列。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
アップロードした画像を、実際に使われるまでこのブラウザ（IndexedDB `mojulaX-pool`）に溜めておく待機列。出し入れと、この部屋へ上げ済みかの記憶（localStorage）だけを持ち、判定は [[js.store.images]] から借りる。DOMには触らない。中身のSHA-256を鍵にするので、[[js.asset-store]] の hashBlob をそのまま使う。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | const | MAX_POOL_BYTES | `MAX_POOL_BYTES` | プール全体の上限。 |
| 57 | fn | maxPoolEntryBytes | `maxPoolEntryBytes()` | 1件あたりの上限バイト数。 |
| 93 | fn | isImagePoolAvailable | `async isImagePoolAvailable()` | プールが使える環境か。 |
| 110 | fn | normalizePoolEntry | `normalizePoolEntry(raw)` | 保存済みの1件を、画面へ出してよい形へ均す。 |
| 136 | fn | listPool | `async listPool()` | プールの中身を、新しいものから順に返す。 |
| 149 | fn | poolTotalBytes | `async poolTotalBytes()` | プールに溜まっている合計バイト数。 |
| 167 | fn | addToPool | `async addToPool(file, meta = {})` | 画像を1枚プールへ入れる。 |
| 233 | fn | removeFromPool | `async removeFromPool(hash)` | 1件をプールから消す。 |
| 265 | fn | readCommitMemory | `readCommitMemory(roomId = currentRoomId())` | この部屋で上げ済みの記憶を読む。 |
| 284 | fn | rememberCommit | `rememberCommit(hash, { url, key = null }, roomId = currentRoomId())` | この部屋で上げたことを覚える。 |

## トップレベル関数（LOCAL TASKS 候補）（13）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 57 | maxPoolEntryBytes | `maxPoolEntryBytes()` | 3 | ✓ |
| 63 | openDb | `openDb()` | 17 |  |
| 81 | tx | `tx(db, mode)` | 3 |  |
| 85 | wrap | `wrap(request)` | 6 |  |
| 93 | isImagePoolAvailable | `async isImagePoolAvailable()` | 9 | ✓ |
| 110 | normalizePoolEntry | `normalizePoolEntry(raw)` | 21 | ✓ |
| 136 | listPool | `async listPool()` | 11 | ✓ |
| 149 | poolTotalBytes | `async poolTotalBytes()` | 4 | ✓ |
| 167 | addToPool | `async addToPool(file, meta = {})` | 64 | ✓ |
| 233 | removeFromPool | `async removeFromPool(hash)` | 10 | ✓ |
| 257 | commitMemoryKey | `commitMemoryKey(roomId)` | 3 |  |
| 265 | readCommitMemory | `readCommitMemory(roomId = currentRoomId())` | 14 | ✓ |
| 284 | rememberCommit | `rememberCommit(hash, { url, key = null }, roomId = currentRoomId())` | 23 | ✓ |

## 依存

- import → [[js.asset-store]], [[js.image-upload]], [[js.store.images]]
- imported by → [[js.image-selector-dialog]]

## 注意

<!-- prose:notes -->
[[js.asset-store]] とは性質が逆。あちらは他所から取り直せるキャッシュなのでLRUで捨てるが、こちらに居るのは「まだどこにも保存されていない唯一の実体」（上げ終わったものは消す）なので、上限では捨てずに断る。[[js.token-library]] と同じ判断軸。

DBを分けてあるのは、[[js.asset-store]] のDBへストアを足すと DB_VERSION の引き上げが要り、sw.js が同じDBへ独立した写しでアクセスしている都合で絵の配信まで巻き込むため。

どの口も例外を投げず `{ok:false, reason}` か既定値を返す。プライベートウィンドウでIndexedDBが開けないことがあり、そこで画像が1枚も使えなくなるのは退行だから、呼ぶ側がプールを飛ばせる形にしてある。

上げ済みの記憶にデータURLは入れない。実体そのものを文字列で抱えることになり、オリジン全体で約5MBのlocalStorageを溢れさせる。
<!-- /prose:notes -->
