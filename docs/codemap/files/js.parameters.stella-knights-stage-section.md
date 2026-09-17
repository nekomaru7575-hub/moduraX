---
source: js/parameters/stella-knights-stage-section.js
lines: 339
exports: 1
imported_by: 1
api_sha: be07cf397e86
prose_sha: be07cf397e86
generated: 2026-09-17
tags: [codemap]
---

# js/parameters/stella-knights-stage-section.js

<!-- prose:summary -->
「⋯」→「拡張ルーム設定」に出す、銀剣のステラナイツの「舞台」の欄（GMだけに出る）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 307 | fn | renderStageSection | `renderStageSection({ container, value, dispatchOp, roundActive })` | container: HTMLElement, value: object, dispatchOp: (op: string, args: object) => void, roundActive: boolean,… |

## トップレベル関数（LOCAL TASKS 候補）（10）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | rememberFocus | `rememberFocus(element)` | 10 |  |
| 35 | restoreFocus | `restoreFocus(container)` | 9 |  |
| 45 | labelled | `labelled(text, className = 'dialog-form-note')` | 6 |  |
| 52 | button | `button(text, onClick, { className = 'dialog-remove-row', title = '', disabled = false } = {})` | 10 |  |
| 63 | textField | `textField({ value, placeholder, maxLength, focusKey, multiline = false })` | 12 |  |
| 78 | renderProgress | `renderProgress(container, stage, dispatchOp)` | 43 |  |
| 124 | renderRoutineRow | `renderRoutineRow(list, stage, kind, routine, index, dispatchOp)` | 73 |  |
| 200 | renderLoop | `renderLoop(container, stage, dispatchOp)` | 61 |  |
| 270 | renderKind | `renderKind(container, stage, kind, dispatchOp)` | 27 |  |
| 307 | renderStageSection | `renderStageSection({ container, value, dispatchOp, roundActive })` | 32 | ✓ |

## 依存

- import → [[js.parameters.stella-knights-stage]], [[js.store.ids]]
- imported by → [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
