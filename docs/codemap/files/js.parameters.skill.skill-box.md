---
source: js/parameters/skill/skill-box.js
lines: 562
exports: 1
imported_by: 4
api_sha: cb1570ce8c3b
prose_sha: cb1570ce8c3b
generated: 2026-08-18
tags: [codemap]
---

# js/parameters/skill/skill-box.js

<!-- prose:summary -->
スキル一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 70 | fn | showSkillBox | `showSkillBox({ spec, skills = [], parameters = {}, readOnly = false, onSave })` | spec: object, createSkillSpecの戻り値 skills: Array<object>, 保存済みの一覧（旧形式でもよい。ここで正規化して表示する） parameters?: Record<s… |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | buildSelectField | `buildSelectField(field, value)` | 26 |  |
| 45 | ensureDialog | `ensureDialog()` | 7 |  |
| 53 | createElement | `createElement(tag, className, text)` | 6 |  |
| 70 | showSkillBox | `showSkillBox({ spec, skills = [], parameters = {}, readOnly = false, onSave })` | **492** | ✓ |

## 依存

- import → [[js.parameters.skill.skill-formula]], [[js.parameters.skill.skill-model]], [[js.read-only-form]]
- imported by → [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
