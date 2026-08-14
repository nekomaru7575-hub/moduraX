---
source: js/buff-dialog.js
lines: 261
exports: 2
imported_by: 2
api_sha: 8592ca5e68a7
prose_sha: 8592ca5e68a7
generated: 2026-08-14
tags: [codemap]
---

# js/buff-dialog.js

<!-- prose:summary -->
コマ（トークン）へのバフ/デバフの付与・一覧表示ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマへのバフ／デバフの付与ダイアログと、付いているバフの一覧ダイアログ。バフの効果時間はラウンドのフェーズ（[[js.game-store]] の `BUFF_PHASE_LABELS`）で表現される。システム固有の追加項目は [[js.parameters.registry]] のプラグインが差し込む。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 38 | fn | showAddBuffDialog | `showAddBuffDialog({ parameters = {}, activePluginId = null, onConfirm })` | parameters: Record<string, {key:string,label:string,value:number}>, activePluginId?: string\|null, onConfirm:… |
| 195 | fn | showBuffListDialog | `showBuffListDialog({ getBuffs, getParameters, activePluginId = null, onRemove })` | getBuffs: () => Array<{id:string,name:string,paramId:string\|null,delta:number,expirePhase:string\|null,meta:o… |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 23 | ensureAddDialog | `ensureAddDialog()` | 7 |  |
| 38 | showAddBuffDialog | `showAddBuffDialog({ parameters = {}, activePluginId = null, onConfirm })` | 124 | ✓ |
| 165 | ensureListDialog | `ensureListDialog()` | 7 |  |
| 173 | formatBuffLine | `formatBuffLine(buff, parameters, activePluginId)` | 11 |  |
| 195 | showBuffListDialog | `showBuffListDialog({ getBuffs, getParameters, activePluginId = null, onRemove })` | 66 | ✓ |

## 依存

- import → [[js.game-store]], [[js.parameters.registry]]
- imported by → [[js.board-data-driven]], [[js.character-dialog]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
