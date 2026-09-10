---
source: js/parameters/saikoro-fiction/skill-table-box.js
lines: 607
exports: 2
imported_by: 2
api_sha: e549f73c64e0
prose_sha: e549f73c64e0
generated: 2026-09-10
tags: [codemap]
---

# js/parameters/saikoro-fiction/skill-table-box.js

<!-- prose:summary -->
サイコロ・フィクション共通の「特技表」ボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
特技表の格子を組む UI。表の中身（特技名・分野名）は一切持たず、渡された spec をそのまま描く。データモデルは [[js.parameters.saikoro-fiction.skill-table]]、判定の実行は [[js.parameters.saikoro-fiction.skill-check]]。

出し先が2つあるので、DOM を組む `buildSkillTableView()` と、それを `<dialog>` で包む `showSkillTableBox()` に分かれている。何を出すかは `purpose` で切り替える：`'edit'`（キャラクター更新ダイアログ）は取得・ギャップ・左右／上下を繋ぐか・失われうる枠の**個数**、`'check'`（拡張判定UIのパネル、[[js.check-view.skill-table-view]]）は判定・spec.check.modifiers から並べる修正値の入力欄・枠の**喪失**・マス1つの「使えない印」（シノビガミの変調「マヒ」）。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 57 | fn | buildSkillTableView | `buildSkillTableView({ spec, readState, purpose = 'edit', title = '特技表', editable = true, onSave, onCheck, getToken = null, getEffectiveParameterValue = null, onParameterChange = null })` | 特技表の DOM を組む。 |
| 577 | fn | showSkillTableBox | `showSkillTableBox(options)` | 特技表をモーダルダイアログで開く。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 57 | buildSkillTableView | `buildSkillTableView({ spec, readState, purpose = 'edit', title = '特技表', editable = true, onSave, onCheck, getToken = null, getEffectiveParameterValue = null, onParameterChange = null })` | **514** | ✓ |
| 577 | showSkillTableBox | `showSkillTableBox(options)` | 30 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.parameters.saikoro-fiction.skill-check]], [[js.parameters.saikoro-fiction.skill-table]]
- imported by → [[js.check-view.skill-table-view]], [[js.parameters.shinobigami]]

## 注意

<!-- prose:notes -->
**判定と設定を1つのダイアログのモードで切り替える作りは畳んだ。** 判定は卓の最中に何度も使うもので、モーダルに閉じ込めると1回振るたびに開き直すうえ、開いている間はチャットも盤面も触れなかった。代わりに出し先そのものを分け、`purpose` で描き分ける。この境界を崩さないこと。

**状態は書き込む直前に読み直す**（`readState` / `commit`）。設定のダイアログと判定のパネルは同時に開けて、どちらも同じ `components.skillTable` を書く。開いた時点のスナップショットへトグルを当てて丸ごと書き戻すと、片方の変更がもう片方の次のトグルで消える（パネルで「マヒ」を付けた直後にダイアログで特技を1つ取得すると、マヒが消える）。

修正値の入力欄はこの画面の中だけの状態を持たない。読むのも書くのも常にコマのパラメータで、閉じても残るし他の参加者にも同期される。だから `token` ではなく `getToken` を受け取る：開いた時点のスナップショットを握ると、欄から直した値が同じ画面の中で反映されない。

書き込みは `input` ではなく `change`（欄を離れた／Enter）で行う。1文字ごとに送ると "-2" の途中の "-"（空欄扱い）で 0 が一度コマへ流れてしまうため。

入力欄はパラメータの**基礎値**で、バフの分は直せない。その差分を欄の下に「バフ +2」として出しているのが、入力値と実際に振られる値が食い違って見えないための唯一の手当て。`onParameterChange` を渡さなければ欄は読み取り専用になるが、バフの表示は残る（他人のコマでも何が乗っているかは読める）。

「使えない印」のボタンは**一発モード**。押している間だけ次のクリックの意味が変わり、1つ選ぶと降りて判定へ戻る。立ちっぱなしだと、判定を送ったつもりのクリックが黙って印になる。印そのものは設定側でも赤いまま出す（取得の編集中にも、どの特技が潰れているかが読める）。
<!-- /prose:notes -->
