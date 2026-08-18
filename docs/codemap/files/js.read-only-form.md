---
source: js/read-only-form.js
lines: 26
exports: 1
imported_by: 8
api_sha: ffcb4929db95
prose_sha: ffcb4929db95
generated: 2026-08-18
tags: [codemap]
---

# js/read-only-form.js

<!-- prose:summary -->
「見えるが触れない」表示にするための小さなユーティリティ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
フォーム内の入力要素をまとめて無効化し、「見えるが触れない」表示にする小さなユーティリティ。他人のキャラクターを閲覧するときに各ボックスから呼ばれる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | fn | lockFormControls | `lockFormControls(root, { keep = [] } = {})` | rootの下のinput/select/textarea/buttonをまとめて無効化する。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | lockFormControls | `lockFormControls(root, { keep = [] } = {})` | 7 | ✓ |

## 依存

- import → なし
- imported by → [[js.character-dialog]], [[js.parameters.dracurouge-bond-box]], [[js.parameters.dracurouge]], [[js.parameters.dx3-combo-box]], [[js.parameters.dx3-lois-box]], [[js.parameters.dx3]], [[js.parameters.shinobigami-ougi-box]], [[js.parameters.skill.skill-box]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
