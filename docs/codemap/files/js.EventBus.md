---
source: js/EventBus.js
lines: 16
exports: 1
imported_by: 17
api_sha: b4ae73ec975f
prose_sha: b4ae73ec975f
generated: 2026-09-02
tags: [codemap]
---

# js/EventBus.js

<!-- prose:summary -->
購読と発火だけを持つ最小のイベントバス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
オブジェクトリテラル1つで、`subscribe` と `emit` しかない。購読解除・一度きり購読・ハンドラのエラー握り潰しはいずれも無いので、購読側が例外を投げると `emit` の後続ハンドラが呼ばれない。9ファイルが依存する土台のため、ここへの変更は影響範囲が広い。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 3 | const | EventBus | `EventBus` | js/EventBus.js |

## トップレベル関数（LOCAL TASKS 候補）（0）

なし（`function 名(...) {}` 宣言がトップレベルに無い）。

## 依存

- import → なし
- imported by → [[js.audio-player]], [[js.board-data-driven]], [[js.character-panel]], [[js.dice-animation]], [[js.dice-draft-panel]], [[js.game-store]], [[js.host-persistence]], [[js.info-panel]], [[js.main]], [[js.mobile-layout]], [[js.net-sync]], [[js.round-panel]], [[js.stamp-layer]], [[js.stamp-panel]], [[js.store.handlers.characters]], [[js.store.handlers.chat]], [[js.store.handlers.room]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
