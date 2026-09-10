---
source: js/parameters/futarisousa-skill-box.js
lines: 137
exports: 5
imported_by: 1
api_sha: 7b76717f6561
prose_sha: 7b76717f6561
generated: 2026-09-10
tags: [codemap]
---

# js/parameters/futarisousa-skill-box.js

<!-- prose:summary -->
フタリソウサの「技能」を表示・編集するボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
フタリソウサの「技能」を編集する専用ボックス。洞察・鑑識・人間・肉体の4分野が固定ラベルで並び、その横が自由記述のテキスト欄。行が増減しないので、[[js.parameters.dx3-lois-box]] のような追加／削除／件数の上限は持たず、[[js.parameters.arianrhod-ability-box]] の固定ラベルの表を写してある。保存先は components だけで、パラメータもキャラクター一覧の行も持たない。一覧側は [[js.parameters.futarisousa]]。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | const | SKILL_COMPONENT_KEY | `SKILL_COMPONENT_KEY` |  |
| 27 | const | SKILL_CATEGORIES | `SKILL_CATEGORIES` | カテゴリーはルールブックの4分野で、固定。 |
| 39 | fn | normalizeFutariSousaSkills | `normalizeFutariSousaSkills(raw)` | 保存済み・取り込んだJSONを { [key]: string } の正規形へ揃える。 |
| 50 | fn | countFilledSkills | `countFilledSkills(raw)` | 何分野が埋まっているか。 |
| 65 | fn | showFutariSousaSkillBox | `showFutariSousaSkillBox({ skills = {}, readOnly = false, onSave })` | skills?: object, readOnly?: boolean 他人のコマを表示だけしている時。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 39 | normalizeFutariSousaSkills | `normalizeFutariSousaSkills(raw)` | 9 | ✓ |
| 50 | countFilledSkills | `countFilledSkills(raw)` | 4 | ✓ |
| 65 | showFutariSousaSkillBox | `showFutariSousaSkillBox({ skills = {}, readOnly = false, onSave })` | 72 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.read-only-form]]
- imported by → [[js.parameters.futarisousa]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
