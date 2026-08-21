---
source: js/parameters/saikoro-fiction/skill-table-box.js
lines: 568
exports: 1
imported_by: 1
api_sha: b9f5e5502a0a
prose_sha: b9f5e5502a0a
generated: 2026-08-21
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table-box.js

<!-- prose:summary -->
サイコロ・フィクション共通の「特技表」ボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
特技表の格子を描画し、習得・ギャップ（分野をまたぐ穴）・失われうる枠（シノビガミの生命力）・マス1つの「使えない印」（シノビガミの変調「マヒ」）・左右を繋ぐかの切り替えと、判定の実行を受け付けるボックス UI。表の中身（特技名・分野名）は一切持たず、渡された spec をそのまま描く。判定モードでは spec.check.modifiers から修正値の入力欄を並べ、その値を onParameterChange 経由でコマのパラメータへ直接書き戻す。データモデルは [[js.parameters.saikoro-fiction.skill-table]]、判定の実行は [[js.parameters.saikoro-fiction.skill-check]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | fn | showSkillTableBox | `showSkillTableBox({ spec, state, title = '特技表', editable = true, onSave, onCheck, getToken = null, getEffectiveParameterValue = null, onParameterChange = null })` | spec: object, createSkillTableSpec() の戻り値 state: {acquired:string[], filledGaps:number[]}, normalizeSkillTab… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | ensureDialog | `ensureDialog()` | 7 |  |
| 46 | showSkillTableBox | `showSkillTableBox({ spec, state, title = '特技表', editable = true, onSave, onCheck, getToken = null, getEffectiveParameterValue = null, onParameterChange = null })` | **522** | ✓ |

## 依存

- import → [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table]]
- imported by → [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
修正値の入力欄はこのダイアログの中だけの状態を持たない。読むのも書くのも常にコマのパラメータで、閉じても残るし他の参加者にも同期される。だから `token` ではなく `getToken` を受け取る：開いた時点のスナップショットを握ると、欄から直した値が同じダイアログの中で反映されない。

書き込みは `input` ではなく `change`（欄を離れた／Enter）で行う。1文字ごとに送ると "-2" の途中の "-"（空欄扱い）で 0 が一度コマへ流れてしまうため。

入力欄はパラメータの**基礎値**で、バフの分は直せない。その差分を欄の下に「バフ +2」として出しているのが、入力値と実際に振られる値が食い違って見えないための唯一の手当て。`onParameterChange` を渡さなければ欄は読み取り専用になるが、バフの表示は残る（他人のコマでも何が乗っているかは読める）。

「使えない印」のボタン（`spec.cellDisable` を宣言した表にだけ出る）は**モードではなく一発モード**。押している間だけ次のクリックの意味が変わり、1つ選ぶと降りて判定モードへ戻る。判定モードを離れるときも必ず降ろす：立ちっぱなしだと、判定を送ったつもりのクリックが黙って印になる。印そのものは判定モードを離れても赤いまま出す（取得の編集中にも、どの特技が潰れているかが読める）。
<!-- /prose:notes -->
