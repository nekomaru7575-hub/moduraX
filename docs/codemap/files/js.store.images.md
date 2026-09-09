---
source: js/store/images.js
lines: 205
exports: 6
imported_by: 9
api_sha: fbf0da9f544a
prose_sha: fbf0da9f544a
generated: 2026-09-09
tags: [codemap]
---

# js/store/images.js

<!-- prose:summary -->
画像URLの検分と列挙。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
画像URLについての判定と列挙を、純関数だけで集めた場所。DOMもIndexedDBも通信も知らない。状態に載せてよい形か（normalizeImageRef）、この部屋はどの画像を使っているか（collectImageUrls）、この用途に使えるか（imageUsableFor）、同じ画像を上げ直さずに済むか（pickReusableCommit・canReuseCommitFor）を答える。溜め置きの実体は [[js.image-pool]]、画面は [[js.image-selector-dialog]]、実際に上げるのは [[js.image-upload]] で、ここはどれも持たない。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | fn | normalizeImageRef | `normalizeImageRef(value)` | 画像の指し先として状態に載せてよい値へ均す。 |
| 57 | fn | poolMimeAllowed | `poolMimeAllowed(type)` | プールへ入れてよいMIMEタイプか。 |
| 95 | fn | collectImageUrls | `collectImageUrls(state)` | 状態の中で使われている画像の指し先を全部集める。 |
| 132 | fn | imageUsableFor | `imageUsableFor(url, purpose)` | この用途にその画像を使えるか。 |
| 166 | fn | canReuseCommitFor | `canReuseCommitFor(purpose)` | この用途で、上げ済みの実体を使い回してよいか。 |
| 192 | fn | pickReusableCommit | `pickReusableCommit(memory, urlsInState, hash)` | 同じ中身の画像を、この部屋で既に上げてあるなら、その指し先を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 34 | normalizeImageRef | `normalizeImageRef(value)` | 4 | ✓ |
| 57 | poolMimeAllowed | `poolMimeAllowed(type)` | 4 | ✓ |
| 81 | extraImageKeysFor | `extraImageKeysFor(key, inherited)` | 3 |  |
| 95 | collectImageUrls | `collectImageUrls(state)` | 27 | ✓ |
| 132 | imageUsableFor | `imageUsableFor(url, purpose)` | 18 | ✓ |
| 166 | canReuseCommitFor | `canReuseCommitFor(purpose)` | 3 | ✓ |
| 192 | pickReusableCommit | `pickReusableCommit(memory, urlsInState, hash)` | 13 | ✓ |

## 依存

- import → [[js.store.cards]], [[js.store.stamps]]
- imported by → [[js.board-data-driven]], [[js.game-store]], [[js.image-pool]], [[js.image-selector-dialog]], [[js.main]], [[js.store.handlers.board]], [[js.store.handlers.characters]], [[js.store.handlers.room]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
IndexedDBもDOMもモックしない方針（[[js.asset-store]] のテスト冒頭）の下でも確かめたい判定を、ここへ寄せてある。判定を [[js.image-pool]] 側へ書き足すとテストで撃てなくなる。

collectImageUrls は状態の形を数え上げず、項目の名前（`image` で終わるもの）で見分ける。入れ物を増やしても追随するが、`image` で終わらない名前の項目は拾わない——今その例外は部屋スタンプの `url` だけで、IMAGE_KEYS_BY_CONTAINER に対で登録してある。音源の `url` を拾わないための作り。
<!-- /prose:notes -->
