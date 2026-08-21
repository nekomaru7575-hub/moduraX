---
source: js/parameters/arianrhod-ability-box.js
lines: 126
exports: 1
imported_by: 1
api_sha: 3bc3a015fb42
prose_sha: 3bc3a015fb42
generated: 2026-08-21
tags: [codemap]
---

# js/parameters/arianrhod-ability-box.js

<!-- prose:summary -->
アリアンロッドの「能力ボーナス」7種とレベル（CL）をまとめて表示・編集するボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
能力ボーナス7種とレベル（CL）の表示・編集ボックス。どちらも editable:false のパラメータで、更新ダイアログからは手入力できない（SET_PARAMETER が弾く）ため、部屋の外のコマ作成ツール（allowParameterEdit:true）でだけ入力欄になり、書き込みは IMPORT_CHARACTER_DATA で行う。DX3 の能力値・技能値のボックス（[[js.parameters.dx3-ability-box]]）と同じ扱い。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | fn | showArianrhodAbilityBox | `showArianrhodAbilityBox({ parameters = {}, rows = [], editable = false, onSave })` | parameters: Record<string, {label:string, value:number}>, rows: Array<{paramId:string, label:string}>, 表示する行… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | ensureDialog | `ensureDialog()` | 7 |  |
| 34 | showArianrhodAbilityBox | `showArianrhodAbilityBox({ parameters = {}, rows = [], editable = false, onSave })` | 92 | ✓ |

## 依存

- import → なし
- imported by → [[js.parameters.arianrhod]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
