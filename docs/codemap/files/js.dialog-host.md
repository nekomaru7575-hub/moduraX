---
source: js/dialog-host.js
lines: 80
exports: 2
imported_by: 37
api_sha: dae529f9b791
prose_sha: dae529f9b791
generated: 2026-09-04
tags: [codemap]
---

# js/dialog-host.js

<!-- prose:summary -->
モーダルダイアログの入れ物（<dialog>要素）を1つだけ用意して使い回すための小道具。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 26 | fn | createDialogHost | `createDialogHost(extraClass = '')` | この画面ぶんの <dialog> を返す関数を作る。 |
| 60 | fn | appendConfirmRow | `appendConfirmRow(parent, { confirmLabel, cancelLabel = 'キャンセル', onCancel })` | ダイアログの一番下に置く「キャンセル／確定」の1行を作って足す。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 26 | createDialogHost | `createDialogHost(extraClass = '')` | 19 | ✓ |
| 60 | appendConfirmRow | `appendConfirmRow(parent, { confirmLabel, cancelLabel = 'キャンセル', onCancel })` | 20 | ✓ |

## 依存

- import → なし
- imported by → [[js.audience-picker]], [[js.audio-dialog]], [[js.background-dialog]], [[js.buff-dialog]], [[js.character-dialog]], [[js.chat-tab-dialog]], [[js.deck-dialog]], [[js.deck-editor-dialog]], [[js.deck-list-dialog]], [[js.identity-dialog]], [[js.info-entry-dialog]], [[js.log-clear-dialog]], [[js.log-edit-dialog]], [[js.log-export-dialog]], [[js.original-table-dialog]], [[js.original-table-list-dialog]], [[js.panel-dialog]], [[js.parameters.arianrhod-ability-box]], [[js.parameters.arianrhod-action-set-box]], [[js.parameters.dracurouge-bond-box]], [[js.parameters.dx3-ability-box]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-lois-box]], [[js.parameters.futarisousa-skill-box]], [[js.parameters.gcrest-ability-box]], [[js.parameters.gcrest-unit-box]], [[js.parameters.saikoro-fiction.skill-table-box]], [[js.parameters.shinobigami-ougi-box]], [[js.parameters.skill.skill-box]], [[js.room-delete-dialog]], [[js.room-entry-dialog]], [[js.room-parameters-dialog]], [[js.room-stamp-dialog]], [[js.room-stamp-list-dialog]], [[js.round-setup-dialog]], [[js.scene-dialog]], [[js.scene-list-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
