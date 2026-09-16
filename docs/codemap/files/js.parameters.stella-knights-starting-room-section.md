---
source: js/parameters/stella-knights-starting-room-section.js
lines: 139
exports: 1
imported_by: 1
api_sha: 82f5ece399a6
prose_sha: 82f5ece399a6
generated: 2026-09-16
tags: [codemap]
---

# js/parameters/stella-knights-starting-room-section.js

<!-- prose:summary -->
「⋯」→「拡張ルーム設定」に出す、銀剣のステラナイツの「始まりの部屋」の欄。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「拡張ルーム設定」に出す始まりの部屋の欄（DOM）。発動中の規則を番号付きで発動順に並べ（順番で結果が変わるため）、その下に連鎖を全部当てた「振った目の扱い」を出す。a・b のプルダウンと「発動」、行ごとの「解除」を dispatchOp へ渡すだけで、規則と状態は [[js.parameters.stella-knights-starting-room]]、描き直しは [[js.room-extension-dialog]] が持つ。最後に選んだ a・b はモジュール内に控え、描き直しで戻らないようにする。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 40 | fn | renderStartingRoomSection | `renderStartingRoomSection({ container, value, dispatchOp, roundActive })` | container: HTMLElement, value: { rules: {id:string, from:number, to:number}[] }, dispatchOp: (op: string, ar… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | createFaceSelect | `createFaceSelect(initial, labelText)` | 13 |  |
| 40 | renderStartingRoomSection | `renderStartingRoomSection({ container, value, dispatchOp, roundActive })` | 99 | ✓ |

## 依存

- import → [[js.parameters.stella-knights-starting-room]], [[js.store.ids]]
- imported by → [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
