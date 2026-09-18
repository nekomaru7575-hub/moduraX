---
source: js/parameters/stella-knights-stage-section.js
lines: 140
exports: 1
imported_by: 1
api_sha: 83da39f14449
prose_sha: 83da39f14449
generated: 2026-09-18
tags: [codemap]
---

# js/parameters/stella-knights-stage-section.js

<!-- prose:summary -->
「拡張ルーム設定」に出す舞台の欄。卓の最中に見る進行の現在地と、列ごとのボックスを開くボタン。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「⋯」→「拡張ルーム設定」の「舞台」の節を描く（GMだけに出る）。置くのは**卓の最中に一番見るもの**
だけ——舞台名、次に何が発動するか、進行を前後させる操作、そしてセット／アクション／EXの3列を
開くボタン（件数つき）。ルーチンの登録と編集は [[js.parameters.stella-knights-stage-box]] へ出した。

状態の形も進行の規則も持たない（[[js.parameters.stella-knights-stage]]）。ここがするのは
描くことと、操作を dispatchOp へ渡すことだけ。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 115 | fn | renderStageSection | `renderStageSection({ container, value, getValue, dispatchOp, roundActive })` | container: HTMLElement, value: object, getValue: () => object, dispatchOp: (op: string, args: object) => voi… |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | labelled | `labelled(text, className = 'dialog-form-note')` | 6 |  |
| 25 | button | `button(text, onClick, { className = 'dialog-remove-row', title = '' } = {})` | 9 |  |
| 37 | renderProgress | `renderProgress(container, stage, dispatchOp)` | 43 |  |
| 83 | renderKindButtons | `renderKindButtons(container, stage, { getValue, dispatchOp })` | 21 |  |
| 115 | renderStageSection | `renderStageSection({ container, value, getValue, dispatchOp, roundActive })` | 25 | ✓ |

## 依存

- import → [[js.parameters.stella-knights-stage-box]], [[js.parameters.stella-knights-stage]]
- imported by → [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
3列を1枚に並べていた頃は、空でも約560px、各列3件で約1800pxあり、目的の列へ着くまで毎回
スクロールしていた。ボックスへ切り出して約260pxに収めてある。**ここへ欄を足すときは、
「卓の最中に見るか」で判断すること**（登録・編集はボックス側）。

件数バッジはボックスを閉じたときに引き直す（onClose）。開いている間は変わらないので、
数え直す必要がない。
<!-- /prose:notes -->
