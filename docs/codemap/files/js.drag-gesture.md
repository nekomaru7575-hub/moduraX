---
source: js/drag-gesture.js
lines: 231
exports: 2
imported_by: 3
api_sha: a9b5d3f67438
prose_sha: a9b5d3f67438
generated: 2026-08-24
tags: [codemap]
---

# js/drag-gesture.js

<!-- prose:summary -->
ドラッグと長押しの共通ヘルパー。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
Pointer Events を使ったドラッグと長押しの入口を1つにまとめたヘルパー。要素に `bindDragGesture` を貼ると、マウス・タッチ・ペンのどれでも同じコールバック（onStart / onMove / onEnd / onLongPress）が呼ばれる。長押しはタッチ・ペンのときだけ見る（マウスには右クリックがあるため）。ポインタの捕捉、移動量による長押しの取り消し、Android が長押しの後に上げてくる contextmenu の握り潰しもここが持つ。何を動かすか・どんなメニューを出すかは一切知らず、それは呼び出し元（[[js.board-data-driven]] の盤面、[[js.floating-panel]]、[[js.dice-draft-panel]]）の仕事。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 29 | const | LONG_PRESS_ONLY | `LONG_PRESS_ONLY` | onStartがこれを返すと、ドラッグは始めずに長押しだけを見る。 |
| 52 | fn | bindDragGesture | `bindDragGesture(element, { onStart, onMove, onEnd, onLongPress, capture = false, stopPropagation = false } = {})` | onStart?: (event: PointerEvent) => any, ドラッグを始めてよければ任意の値（＝以降のコールバックへ渡す文脈）を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 52 | bindDragGesture | `bindDragGesture(element, { onStart, onMove, onEnd, onLongPress, capture = false, stopPropagation = false } = {})` | 179 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.dice-draft-panel]], [[js.floating-panel]]

## 注意

<!-- prose:notes -->
`onStart` が false / null / undefined を返すと、ドラッグだけでなく**長押しも一緒に切れる**。「動かせないが、メニューは出したい」ものはここで `LONG_PRESS_ONLY` を返すこと。固定したパネル・カード・デッキが false を返していたせいで、タッチからメニューへ到達できない不具合になっていた（右クリックの無い端末では長押しが唯一の入口）。

`LONG_PRESS_ONLY` のときは preventDefault も stopPropagation も setPointerCapture もしないので、pointerdown はそのまま親へ流れる（固定パネルの上のドラッグが盤面パンになるのはこれ）。代わりに pointermove / pointerup をこの要素では受け取れないため、listener は document に貼っている。

pointerdown を親へ流す以上、親の側でも長押しが走る。同じ指から2つのメニューが出ないよう、親（盤面のパン）は自分の `onLongPress` で「自前のメニューを持つオブジェクトの上か」を見て降りる。
<!-- /prose:notes -->
