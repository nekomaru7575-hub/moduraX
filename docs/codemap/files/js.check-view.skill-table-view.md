---
source: js/check-view/skill-table-view.js
lines: 95
exports: 1
imported_by: 1
api_sha: 1596984f6e85
prose_sha: 1596984f6e85
generated: 2026-09-10
tags: [codemap]
---

# js/check-view/skill-table-view.js

<!-- prose:summary -->
拡張判定UIの「特技表判定」ビュー：サイコロ・フィクション系（シノビガミ／インセイン等）の 分野×出目の表を出し、マスをクリックして判定を振る。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
拡張判定UIの「特技表判定」ビュー。表を組むのは [[js.parameters.saikoro-fiction.skill-table-box]] の buildSkillTableView で、キャラクター更新ダイアログ（表の設定）と同じ実装。ここはそれを `purpose: 'check'` で呼び、判定の実行・状態の保存・修正値の書き戻しを器のコンテキストへ繋ぐだけの薄い層。PC/エネミーのような「コマによって表が変わる」出し分けは、プラグインの宣言（tableFor / stateFor）に閉じている。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | fn | createSkillTableView | `createSkillTableView()` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | createSkillTableView | `createSkillTableView()` | 79 | ✓ |

## 依存

- import → [[js.parameters.saikoro-fiction.skill-table-box]]
- imported by → [[js.check-view.index]]

## 注意

<!-- prose:notes -->
**同じコマ・同じ表を見ている間は組み直さない。** 修正値の入力欄はコマのパラメータを直接書き換えるので、値を1つ直すたびに parameters の参照が変わって器から render が呼ばれる。そのたびに DOM を作り直すと、次の欄へ移った瞬間にフォーカスが飛ぶ。buildSkillTableView が持つ refresh()（状態と修正値の読み直し）だけを呼ぶ。

状態を読むのは `getToken()` を通した**今の**コマ。開いた時点のスナップショットを握ると、更新ダイアログと同時に開いているときに互いの変更を踏み潰す。
<!-- /prose:notes -->
