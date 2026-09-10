---
source: js/parameters/skill/skill-box.js
lines: 986
exports: 1
imported_by: 7
api_sha: 160c4976d6de
prose_sha: 160c4976d6de
generated: 2026-09-10
tags: [codemap]
---

# js/parameters/skill/skill-box.js

<!-- prose:summary -->
スキル一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
spec（[[js.parameters.skill.skill-model]] の `createSkillSpec` / `createListSpec` / `createItemSpec`）から、一覧の見出しも入力欄も組み立てるボックス UI。どのシステムの何を編集しているかは知らない。使わない節（効果時間・回数制限・使用条件・修正値）は宣言に従って丸ごと出さないので、名前と内容だけの一覧も、個数と使用ボタンを持つアイテムも、この1つのボックスが描く。CSSクラスはエフェクトボックス時代の `.effect-box-*` をそのまま使っている。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 208 | fn | showSkillBox | `showSkillBox({ spec, skills = [], parameters = {}, readOnly = false, onSave, getToken = null, dispatch = null, generateBuffId = null, findTokenByName = null })` | spec: object, createSkillSpecの戻り値 skills: Array<object>, 保存済みの一覧（旧形式でもよい。ここで正規化して表示する） parameters?: Record<s… |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | wrapWithLabel | `wrapWithLabel(control, labelText, widthClass)` | 13 |  |
| 44 | buildSelectField | `buildSelectField(field, value)` | 26 |  |
| 79 | buildToggleField | `buildToggleField(field, value)` | 33 |  |
| 118 | readFieldValue | `readFieldValue(field, input)` | 5 |  |
| 125 | readRowFieldValues | `readRowFieldValues(spec, fieldInputs)` | 5 |  |
| 132 | buildCheckboxField | `buildCheckboxField(field, value)` | 13 |  |
| 152 | refreshSelectOptions | `refreshSelectOptions(field, select, fieldValues)` | 28 |  |
| 183 | createElement | `createElement(tag, className, text)` | 6 |  |
| 208 | showSkillBox | `showSkillBox({ spec, skills = [], parameters = {}, readOnly = false, onSave, getToken = null, dispatch = null, generateBuffId = null, findTokenByName = null })` | **778** | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.parameters.skill.item-use]], [[js.parameters.skill.skill-formula]], [[js.parameters.skill.skill-model]], [[js.read-only-form]]
- imported by → [[js.parameters.arianrhod]], [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.futarisousa]], [[js.parameters.gcrest]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]

## 注意

<!-- prose:notes -->
**保存の仕方が2通りある。** 名前・欄・効果の編集は保存ボタン（submit）まで溜めるが、アイテムの個数の増減と使用だけは押した時点で `commitNow()` が走る。使用はチャットへログを流す＝取り消せない操作なので、画面と保存済みの個数がずれたまま次の操作を受けないようにするため。

使用ボタンの中では **`commitNow()` のあとでコマを読み直すこと**。確定前のコマを持ち回して `runItemUse` に渡すと、それを元に書き戻して直前の編集を巻き戻す。

`collectSkills()` は名前が空の行を落とす。即時保存を通ると、打ちかけの行が保存されないまま画面には残る（保存ボタンの挙動と同じなので、そのままにしてある）。

**欄の値を読む場所は `readFieldValue` の1か所だけ**。有効/無効の引き直し・式の検証・保存の3つが同じ値を見る必要がある（チェック欄は `checked`、他は `value` と置き場が違うため、素で読むと食い違う）。

`rowActions` の `run` には store 操作一式を素通しするだけで、ボックスは何をするか知らない。

`spec.hasUseCommand` が立っている一覧だけ、一番下に「使用コマンドをコピー」ボタンが出る（`collectSkills()` を通すので保存前の編集も含めて拾う）。**このボタンは `lockFormControls` の `keep` に入れてあるので readOnly でも押せる**：状態を変えない操作だから、他人の一覧を見ているだけの時も塞がない（`js/read-only-form.js` の keep の考え方どおり）。
<!-- /prose:notes -->
