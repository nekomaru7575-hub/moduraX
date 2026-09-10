---
source: js/parameters/arianrhod-ability-box.js
lines: 315
exports: 3
imported_by: 1
api_sha: 115bfc28004f
prose_sha: 115bfc28004f
generated: 2026-09-10
tags: [codemap]
---

# js/parameters/arianrhod-ability-box.js

<!-- prose:summary -->
アリアンロッドの「能力ボーナス」7種とレベル（CL）をまとめて表示・編集するボックス。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
能力ボーナス7種・レベル（CL）・重量上限の表示と編集、そして汎用判定（命中・回避・魔術など9種）の設定。前半のパラメータは editable:false なので、更新ダイアログからは手入力できず、部屋の外のコマ作成ツール（allowParameterEdit:true）でだけ入力欄になり、書き込みは IMPORT_CHARACTER_DATA を通る（DX3の [[js.parameters.dx3-ability-box]] と同じ扱い）。後半の汎用判定はコマの components に入る設定なので部屋の中でも直せて、判定ごとに「ダイス数の修正」と「使う能力ボーナス」を持つ。判定コマンドは `(2+修正+{AdB})D6+{能力ボーナス}+{AnB} 判定名` を **{} のまま**組み立て、値の解決はチャット側（js/main.js の substituteCharacterParameters）へ任せる＝バフ込みの今の値で振れる。
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 51 | fn | buildGeneralCheckCommand | `buildGeneralCheckCommand({ label, bonus, abilityLabel, diceModName, valueModName })` | 汎用判定1件のコマンド。 |
| 60 | fn | normalizeGeneralChecks | `normalizeGeneralChecks(checks, raw)` | 保存済みの汎用判定の設定を正規形にする（{ [判定key]: {bonus, abilityParamId} }）。 |
| 91 | fn | showArianrhodAbilityBox | `showArianrhodAbilityBox({ parameters = {}, rows = [], editable = false, onSave, checks = [], abilityChoices = [], checkSettings = {}, canEditChecks = false, onChecksChange, diceModName = 'AdB', valueModName = 'AnB' })` | parameters: Record<string, {label:string, value:number}>, rows: Array<{paramId:string, label:string}>, 表示する行… |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | canSendToChat | `canSendToChat()` | 3 |  |
| 28 | sendToChat | `sendToChat(command)` | 10 |  |
| 40 | signed | `signed(value)` | 4 |  |
| 51 | buildGeneralCheckCommand | `buildGeneralCheckCommand({ label, bonus, abilityLabel, diceModName, valueModName })` | 4 | ✓ |
| 60 | normalizeGeneralChecks | `normalizeGeneralChecks(checks, raw)` | 15 | ✓ |
| 91 | showArianrhodAbilityBox | `showArianrhodAbilityBox({ parameters = {}, rows = [], editable = false, onSave, checks = [], abilityChoices = [], checkSettings = {}, canEditChecks = false, onChecksChange, diceModName = 'AdB', valueModName = 'AnB' })` | **224** | ✓ |

## 依存

- import → [[js.dialog-host]]
- imported by → [[js.parameters.arianrhod]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
