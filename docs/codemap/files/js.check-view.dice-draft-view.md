---
source: js/check-view/dice-draft-view.js
lines: 526
exports: 1
imported_by: 1
api_sha: 05b9b1af510f
prose_sha: 05b9b1af510f
generated: 2026-09-10
tags: [codemap]
---

# js/check-view/dice-draft-view.js

<!-- prose:summary -->
拡張判定UIの「ダイスドラフト」ビュー：振ってプールに溜めた目を1個ずつドラッグし、 スキルの上に乗せて発動する（ドラクルージュ、銀剣のステラナイツ）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
拡張判定UIの「ダイスドラフト」ビュー。かつて js/dice-draft-panel.js が持っていた描画部分がそのまま移ってきたもので、パネルの枠・対象コマの選択・注意書きは器（[[js.check-panel]]）へ譲った。プールとスキル枠を描き、ダイスのドラッグ（[[js.drag-gesture]]）と発動（[[js.parameters.dice-draft.dice-draft-use]]）を繋ぐ。何が置けるか・いつ発動できるかは [[js.parameters.dice-draft.dice-draft-model]] の acceptsDie / evaluatePlacement だけを呼んで決め、**規則そのものは解釈しない**。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 98 | fn | createDiceDraftView | `createDiceDraftView()` | 1つのパネルに1つだけ作る。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 54 | renderDieFace | `renderDieFace(die)` | 35 |  |
| 98 | createDiceDraftView | `createDiceDraftView()` | **428** | ✓ |

## 依存

- import → [[js.drag-gesture]], [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.dice-draft.dice-draft-use]], [[js.parameters.skill.skill-model]]
- imported by → [[js.check-view.index]]

## 注意

<!-- prose:notes -->
**renderKey から buffs を落とさないこと。** `ADD_BUFF` は parameters を書き換えないので、見ていないと目標値の修正（ドラクルージュのTB）を足しても表示が古いまま残る。

ドラッグ中は `ctx.setBusy(true)` で器の描き直しを止める。止めないと掴んでいる要素が消える。

見出しは `spec.label` ではなく「ダイスドラフト」で固定。`spec.label`（ステラナイツなら「出目」）はチャットログの発言種別に使う呼び名であって、パネルの名前ではない。
<!-- /prose:notes -->
