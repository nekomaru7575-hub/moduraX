---
source: js/parameters/stella-knights-stage-box.js
lines: 314
exports: 1
imported_by: 1
api_sha: 6061db7800e3
prose_sha: 6061db7800e3
generated: 2026-09-18
tags: [codemap]
---

# js/parameters/stella-knights-stage-box.js

<!-- prose:summary -->
舞台のルーチン一覧を編集するボックス（セット／アクション／EXのうち1種別ぶん）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
拡張ルーム設定のボタンから、モーダルを重ねて開く編集画面。1種別ぶんの行の一覧・
（セットだけ）ループ設定・「＋ 追加」を持つ。3つのボタンが**同じホストを種別ちがいで開く**
ので、同時に開くのは1つだけ。呼び出し元は [[js.parameters.stella-knights-stage-section]]。

**store を触らない。** 最新の値は `getValue()`、変更は `dispatchOp()` で、どちらも
拡張ルーム設定から渡ってくる（[[js.room-extension-dialog]]）。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 246 | fn | showStageBox | `showStageBox({ kind, getValue, dispatchOp, onClose = null })` | 1種別ぶんのルーチン一覧を編集するボックスを開く。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 38 | rememberFocus | `rememberFocus(element)` | 10 |  |
| 49 | restoreFocus | `restoreFocus(container)` | 9 |  |
| 59 | labelled | `labelled(text, className = 'dialog-form-note')` | 6 |  |
| 66 | button | `button(text, onClick, { className = 'dialog-remove-row', title = '', disabled = false } = {})` | 10 |  |
| 77 | textField | `textField({ value, placeholder, maxLength, focusKey, multiline = false })` | 12 |  |
| 92 | renderRoutineRow | `renderRoutineRow(list, stage, kind, routine, index, { dispatchOp, redraw })` | 76 |  |
| 171 | renderLoop | `renderLoop(container, stage, { redraw })` | 62 |  |
| 246 | showStageBox | `showStageBox({ kind, getValue, dispatchOp, onClose = null })` | 68 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.parameters.stella-knights-stage]], [[js.store.ids]]
- imported by → [[js.parameters.stella-knights-stage-section]]

## 注意

<!-- prose:notes -->
**共通のスキル枠組み（[[js.parameters.skill.skill-box]]）には乗せていない。** あちらは
「配列を渡して onSave(配列) で丸ごと受け取る」形だが、舞台は UPDATE_ROOM_EXTENSION の
操作（op）で送る。丸ごと書き戻すと「2人が同時に触っても片方が消えない」という
拡張ルーム設定の前提（[[js.parameters.registry]]）を壊す。ループ設定と「次はこれ」の印も
spec に居場所がない。判断の筋は [[js.parameters.shinobigami-ougi-box]] と同じ。

**組み直すのは並びや印が変わる操作だけ**（追加・削除・並べ替え・ここから・ループ設定）。
名前と効果の編集で組み直すと、打ち終えた直後にフォーカスとカーソル位置を奪う。入力欄には
既に打った値が入っているので、そこでは組み直さなくてよい。

開いている間は外からの変化が映らない。モーダルなのでラウンド進行も進められず、実際に
起きるのは「GMが2人で同じ舞台を同時に編集した」ときだけ。op で送っているのでデータは
壊れず、開き直せば揃う。
<!-- /prose:notes -->
