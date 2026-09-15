---
source: js/room-roll.js
lines: 31
exports: 2
imported_by: 2
api_sha: 11e5f2147deb
prose_sha: 11e5f2147deb
generated: 2026-09-15
tags: [codemap]
---

# js/room-roll.js

<!-- prose:summary -->
部屋の中で振るダイスの入口。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の中でダイスを振る唯一の入口。[[js.BCdice]] で振ったあと、適用中のシステムの transformRollResult（[[js.parameters.registry]] の applyPluginRollTransform）に結果を渡し、部屋に掛かっている効果（ステラナイツの始まりの部屋）で書き換えさせる。[[js.main]] のチャットロール・パラメータ変更・バフの値・オリジナル表と、プラグインへ渡す rollBCDice（charge など）、[[js.check-panel]] の拡張判定UIがここを通る。効果は振った時点の状態のものを当てる。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 20 | fn | rollRoomDice | `async rollRoomDice(state, system, command)` |  |
| 28 | fn | createRoomRoller | `createRoomRoller(store)` | store を受け取り、rollBCDice と同じ呼び方ができる関数を返す（プラグインへ渡す口） |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 20 | rollRoomDice | `async rollRoomDice(state, system, command)` | 6 | ✓ |
| 28 | createRoomRoller | `createRoomRoller(store)` | 3 | ✓ |

## 依存

- import → [[js.BCdice]], [[js.parameters.registry]]
- imported by → [[js.check-panel]], [[js.main]]

## 注意

<!-- prose:notes -->
js/BCdice.js を直接呼ぶ経路を部屋の中に足すと、そのロールだけ始まりの部屋が効かなくなる。部屋の外（コマ作成ツール）とシステム専用のボックス（DX3 のコンボ等）は今も直接呼んでいる。
<!-- /prose:notes -->
