---
source: js/parameters/skill/item-use.js
lines: 160
exports: 5
imported_by: 3
api_sha: 5f2ecb3f9d12
prose_sha: 5f2ecb3f9d12
generated: 2026-09-10
tags: [codemap]
---

# js/parameters/skill/item-use.js

<!-- prose:summary -->
アイテム（createItemSpecで宣言した、個数を持つ持ち物）の使用と増減。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
アイテム（`createItemSpec` で宣言した、個数を持つ持ち物）の使用と増減。`item.use(名前)` / `item.gain(名前, n)` の構文・処理・チャットログをまとめて持つ。この2つは特定のシステムの能力ではなく持ち物そのものへの操作なので、`item` を宣言したプラグインには [[js.parameters.registry]] が自動で生やす（ダイスドラフトの `dice.change` / `dice.add` と同じ配り方。プラグイン側に書く処理は無い）。[[js.parameters.skill.skill-box]] の「使用」ボタンも `runItemUse` を通るので、ボタンとコマンドで結果が変わらない。DOM も [[js.game-store]] も触らない（`dispatch` は引数で受け取る）。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 36 | fn | looksLikeItemCommand | `looksLikeItemCommand(rawInput)` | 入力がアイテムのコマンド構文に見えるか（適用外の部屋で理由を出すために使う） |
| 55 | fn | readItems | `readItems(spec, components)` | components から正規形のアイテム一覧を取り出す。 |
| 73 | fn | runItemUse | `runItemUse({ spec, items, item, token, dispatch, chatCommand })` | アイテムを1つ使う。 |
| 91 | fn | runItemGain | `runItemGain({ spec, items, item, amount, token, dispatch, chatCommand })` | アイテムの個数を増減する（nは負数可）。 |
| 120 | fn | handleItemChatCommand | `handleItemChatCommand(rawInput, { spec, token, dispatch })` | item.use / item.gain を実行する。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 36 | looksLikeItemCommand | `looksLikeItemCommand(rawInput)` | 3 | ✓ |
| 40 | logToChat | `logToChat(dispatch, spec, token, chatCommand, resultText)` | 13 |  |
| 55 | readItems | `readItems(spec, components)` | 3 | ✓ |
| 61 | saveQuantity | `saveQuantity(spec, items, item, nextQuantity, { tokenId, dispatch })` | 6 |  |
| 73 | runItemUse | `runItemUse({ spec, items, item, token, dispatch, chatCommand })` | 13 | ✓ |
| 91 | runItemGain | `runItemGain({ spec, items, item, amount, token, dispatch, chatCommand })` | 11 | ✓ |
| 105 | pickItem | `pickItem(spec, items, name)` | 8 |  |
| 120 | handleItemChatCommand | `handleItemChatCommand(rawInput, { spec, token, dispatch })` | 40 | ✓ |

## 依存

- import → [[js.parameters.skill.skill-model]]
- imported by → [[js.main]], [[js.parameters.registry]], [[js.parameters.skill.skill-box]]

## 注意

<!-- prose:notes -->
ボックスの `＋` `−` はここを通らず、チャットへも流さない。数え直しのたびに卓のログが埋まるため。`item.gain` がログを残すのは、誰かが宣言して打ったものだから（GMの「兵糧丸を2つ渡す」）。

`looksLikeItemCommand` は書き損じ（`item.gain(兵糧丸)` のように個数が無い等）まで拾う緩い形。厳密な2つの正規表現で判定すると、書き損じが素通りしてただの発言になってしまう。
<!-- /prose:notes -->
