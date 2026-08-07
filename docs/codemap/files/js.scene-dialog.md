---
source: js/scene-dialog.js
lines: 182
exports: 1
imported_by: 1
api_sha: f82e8c96c234
prose_sha: f82e8c96c234
generated: 2026-08-07
tags: [codemap]
---

# js/scene-dialog.js

<!-- prose:summary -->
シーンの作成・編集ダイアログ（一覧はscene-list-dialog.js）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
シーン（背景・BGM・説明文の組）の作成・編集ダイアログ。一覧は [[js.scene-list-dialog]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 46 | fn | showSceneDialog | `showSceneDialog({ scene = null, tracks = [], onConfirm, onOverwriteBoard = null, onCancel = null })` | sceneを渡すとその内容を初期表示した編集モードになる。 |

## トップレベル関数・非export（2）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 14 | ensureDialog | `ensureDialog()` | 7 |
| 22 | buildFormGroup | `buildFormGroup(labelText, input)` | 9 |

## 依存

- import → [[js.game-store]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
