---
source: js/room-extension-dialog.js
lines: 125
exports: 1
imported_by: 1
api_sha: 484a2e6270ea
prose_sha: 484a2e6270ea
generated: 2026-09-18
tags: [codemap]
---

# js/room-extension-dialog.js

<!-- prose:summary -->
「拡張ルーム設定」ダイアログ（「⋯」ルームメニューから開く）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「⋯」→「拡張ルーム設定」のダイアログ。適用中のシステムが宣言した roomExtensions を見出し付きで並べ、中身の描画は各宣言の renderSection に任せる。操作はその場で UPDATE_ROOM_EXTENSION として1件ずつ dispatch する（確定ボタンで溜めない）。開いている間は STATE_CHANGED で拡張ルーム設定とラウンド進行の有無が変わったときだけ描き直し、他の人の発動・解除を映す。メニュー項目を出すかの判定は [[js.main]] 側。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 94 | fn | showRoomExtensionDialog | `showRoomExtensionDialog({ store })` |  |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | render | `render()` | 60 |  |
| 94 | showRoomExtensionDialog | `showRoomExtensionDialog({ store })` | 31 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.dialog-host]], [[js.parameters.registry]], [[js.room-authority]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
