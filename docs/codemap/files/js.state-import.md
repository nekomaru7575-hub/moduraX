---
source: js/state-import.js
lines: 187
exports: 2
imported_by: 4
api_sha: 252d8b773c56
prose_sha: 252d8b773c56
generated: 2026-09-09
tags: [codemap]
---

# js/state-import.js

<!-- prose:summary -->
「部屋の全データ読み込み」で取り込んだ状態を、この部屋で使える形へ均す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
外部から取り込んだ部屋の状態を、この部屋で使える形へ均す。取り込み時にしか通らない正規化をここに閉じ込めてあり、クライアント（[[js.net-sync]]）とサーバー（[[server.index]]）の両方から同じ関数が呼ばれる。均す対象は参加者・情報欄に加えて、読み込んだ利用者のバックヤードのコマの所有者付け替えも含む。この所有者判定は [[js.character-panel]] の `listMyBackyardTokens` と同じ規則（参加者IDが分かればownerId、分からなければブラウザ単位のID）に揃えている。部屋を新しく作るときの突き合わせ（部屋名はフォーム入力で上書きし、プラグインとダイスシステムはファイル側を優先する）も `buildRoomStateFromImport` としてここに置いてある——P2P卓ではこの読み込みをブラウザ側（[[js.room-index]]）が行うため、同じ規則が2か所に要るようになった。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 125 | fn | adoptImportedState | `adoptImportedState( importedState, { participants = {}, myBackyardOwnerId = null, myBackyardOwnerLocalId = null } = {} )` | 取り込んだ状態を、この部屋で使える形へ均す。 |
| 165 | fn | buildRoomStateFromImport | `buildRoomStateFromImport( importedState, { name, activePlugin, bcdiceSystem, validPluginIds } )` | 部屋を新しく作るときの取り込み。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 52 | adoptInfoEntry | `adoptInfoEntry(entry)` | 19 |  |
| 79 | restoreMyBackyardTokens | `restoreMyBackyardTokens(tokens, backyardTokenIds, ownerId, localUserId)` | 18 |  |
| 101 | forgetCardViewers | `forgetCardViewers(cards)` | 9 |  |
| 125 | adoptImportedState | `adoptImportedState( importedState, { participants = {}, myBackyardOwnerId = null, myBackyardOwnerLocalId = null } = {} )` | 15 | ✓ |
| 165 | buildRoomStateFromImport | `buildRoomStateFromImport( importedState, { name, activePlugin, bcdiceSystem, validPluginIds } )` | 22 | ✓ |

## 依存

- import → [[js.game-store]]
- imported by → [[js.net-host]], [[js.net-sync]], [[js.room-index]], [[server.index]]

## 注意

<!-- prose:notes -->
サーバーとクライアントの両方から通るため、`adoptImportedState` は何度通しても同じ結果になる（冪等）ことが前提。`myBackyardTokenIds` などファイル由来の値は信用せず、`tokens` への読み書きは own property チェックを通す（プロトタイプ汚染回避）。新しいフィールドの正規化を足すときもこの2点を崩さないこと。
<!-- /prose:notes -->
