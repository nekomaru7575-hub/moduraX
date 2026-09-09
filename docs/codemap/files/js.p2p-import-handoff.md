---
source: js/p2p-import-handoff.js
lines: 94
exports: 4
imported_by: 2
api_sha: 30b0d2065643
prose_sha: 30b0d2065643
generated: 2026-09-09
tags: [codemap]
---

# js/p2p-import-handoff.js

<!-- prose:summary -->
P2P卓を「ファイルから作る」ときに、読み込んだ状態を部屋一覧ページから盤面ページへ渡す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
通常の卓では、読み込んだファイルをそのまま `POST /api/rooms` の `importedState` に載せてサーバーへ送る。これがサーバーで一番大きなボディを読む経路で、512MBの天井を決めているのはここ（`server/memory-budget.js` の実測：ボディ93MB → ピークRSS 513MB）。P2P卓は画像も音源もブラウザに置くと決めた以上この経路を通す理由が無いので、[[js.room-index]] は空の部屋だけ作らせ、中身をこのモジュール経由で盤面ページ（[[js.net-sync]] の `initAsHost`）へ渡す。渡す前に画像・音源は [[js.asset-store]] の `adoptDataUrlsInState` で実体へ移してあり、残るのは文字だけ。sessionStorage を使うのは、同じタブの遷移をまたげて・1回渡したら用済みで・タブを閉じれば消えるため。**溢れたら `stashPendingImport` が false を返し、呼び出し側は従来どおりサーバーへ送る**——遅い道が残っているだけで壊れはしない。部屋IDを別のキーに分けてあるのは、IDが決まるのが状態を書いた後だから（1つにまとめると数百KBの文字列を組み立て直すことになる）。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | fn | stashPendingImport | `stashPendingImport(state)` | 渡す状態を控える。 |
| 50 | fn | commitPendingImport | `commitPendingImport(roomId)` | 控えてある状態の宛先を確定する。 |
| 64 | fn | takePendingImport | `takePendingImport(roomId)` | この部屋あての控えを取り出す。 |
| 86 | fn | clearPendingImport | `clearPendingImport()` | 控えを捨てる。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 34 | stashPendingImport | `stashPendingImport(state)` | 11 | ✓ |
| 50 | commitPendingImport | `commitPendingImport(roomId)` | 7 | ✓ |
| 64 | takePendingImport | `takePendingImport(roomId)` | 20 | ✓ |
| 86 | clearPendingImport | `clearPendingImport()` | 8 | ✓ |

## 依存

- import → [[js.untrusted-json]]
- imported by → [[js.net-sync]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
