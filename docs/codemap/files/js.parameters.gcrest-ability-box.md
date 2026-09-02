---
source: js/parameters/gcrest-ability-box.js
lines: 242
exports: 1
imported_by: 1
api_sha: b3946a518a90
prose_sha: b3946a518a90
generated: 2026-09-02
tags: [codemap]
---

# js/parameters/gcrest-ability-box.js

<!-- prose:summary -->
グランクレストの能力判定値6種と技能をまとめて表示する「ボックス」。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
能力判定値6種を大きく、その能力で振る技能をその下に並べて見せる（見た目の作りは [[js.parameters.dx3-ability-box]] と同じ .ability-box-* を使う）。判定UIは持たない。値はどれも editable:false なので、編集できるのは部屋の外のコマ作成ツールだけで、書き込みは IMPORT_CHARACTER_DATA 経由（[[js.parameters.arianrhod-ability-box]] と同じ経路）。自由記述の技能（専門知識：〜／芸術：〜）を足す・消す口もここが持ち、足したときは readData を引き直して描き直す。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 53 | fn | showGcrestAbilityBox | `showGcrestAbilityBox({ readData, editable = false, onSave, onAddFreeSkill, onRemoveFreeSkill })` | readData: () => { groups: Array<{ abilityParamId: string, abilityLabel: string, abilityValue: number, skills… |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 22 | createElement | `createElement(tag, className, text)` | 6 |  |
| 53 | showGcrestAbilityBox | `showGcrestAbilityBox({ readData, editable = false, onSave, onAddFreeSkill, onRemoveFreeSkill })` | 189 | ✓ |

## 依存

- import → [[js.dialog-host]]
- imported by → [[js.parameters.gcrest]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
