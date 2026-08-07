---
source: js/scene-list-dialog.js
lines: 131
exports: 1
imported_by: 1
api_sha: 137f1a39e9b2
prose_sha: 137f1a39e9b2
generated: 2026-08-07
tags: [codemap]
---

# js/scene-list-dialog.js

<!-- prose:summary -->
登録済みのシーン（room.scenes）の一覧ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
登録済みシーンの一覧ダイアログ。選んで適用または編集へ渡す。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 37 | fn | showSceneListDialog | `showSceneListDialog({ scenes, onApply, onEdit, onCreate, onRemove })` | 作成・削除は「適用」を挟まず即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 17 | ensureDialog | `ensureDialog()` | 7 |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
