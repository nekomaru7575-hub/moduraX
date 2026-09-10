---
source: js/check-panel.js
lines: 240
exports: 1
imported_by: 1
api_sha: 4661efefbe14
prose_sha: 4661efefbe14
generated: 2026-09-10
tags: [codemap]
---

# js/check-panel.js

<!-- prose:summary -->
「拡張判定UI」：その部屋のシステムが宣言した判定の画面を1枚の浮動パネルに出す器。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
拡張判定UIの器。浮動パネルを1枚だけ持ち、その部屋のシステムが宣言した判定UIを中に出す。器が持つのは「どのシステムでも同じもの」だけ——パネルの枠、対象コマのセレクタ、注意書き（判定UIが無い／コマ未選択／他人のコマ）、そして「材料の参照が変わったときだけ組み直す」判断。中身の組み立ては [[js.check-view.index]] の表から選んだビューに委ね、**ビューの中身は一切解釈しない**。どのビューを出すかは [[js.parameters.registry]] の getPluginCheckView が決める。対象コマは [[js.main]] のチャット欄の参照キャラクターと双方向に連動する（onCharacterChange で押し返し、setCharacter で受ける）。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 35 | fn | initCheckPanel | `initCheckPanel({ onCharacterChange = null } = {})` | onCharacterChange … パネルで対象コマを選び直した時。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 35 | initCheckPanel | `initCheckPanel({ onCharacterChange = null } = {})` | **205** | ✓ |

## 依存

- import → [[js.BCdice]], [[js.EventBus]], [[js.board-data-driven]], [[js.check-view.index]], [[js.floating-panel]], [[js.parameters.registry]], [[js.room-authority]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
**選ぶ場所は2つでも、指しているコマは常に1つ。** パネルのセレクタとチャット欄の参照キャラクターは双方向に連動させてある。片方だけを動かせるようにすると、「特技判定(...)を撃ったコマ」と「パネルに出ているコマ」が食い違う。setCharacter は同じ値なら即 return するので、往復ループにはならない。

**器は container を消さない。** 組み直すのか作り置きを使い回すのかはビューが決める（ダイスドラフトはダイス1個ごとにドラッグを貼り直すので毎回組み直し、特技表は修正値の入力欄からフォーカスを飛ばさないために使い回す）。ビューを作り直すのは判定UIの種類が変わったときだけ：ビューは「保存しない見た目の状態」（狙う目標値・幕の絞り込み）を持っているので、毎回作り直すとそれが飛ぶ。

`storageKey` は `'diceDraftPanelRect'` のまま。ここには位置・大きさに加えて**表示状態**も入っているので、名前を変えると今このパネルを開いて使っている卓のパネルが一度閉じる。
<!-- /prose:notes -->
