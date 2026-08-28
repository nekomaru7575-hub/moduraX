---
source: js/dice-animation.js
lines: 139
exports: 1
imported_by: 1
api_sha: 371e92102ddc
prose_sha: 371e92102ddc
generated: 2026-08-28
tags: [codemap]
---

# js/dice-animation.js

<!-- prose:summary -->
盤面の上で3Dダイスを転がす演出（UIは持たない。js/audio-player.jsと同じ構え）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
3Dダイスを転がす演出。UI を持たず、[[js.EventBus]] で流れてくる判定結果を拾って `vendor/dice-box-threejs` へ渡す。出目配列から記法への変換は [[js.dice-notation]]、効果音は [[js.audio-player]] が担当する。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 123 | fn | initDiceAnimation | `initDiceAnimation()` |  |

## トップレベル関数（LOCAL TASKS 候補）（7）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | getStage | `getStage()` | 3 |  |
| 55 | applyVolume | `applyVolume(box)` | 5 |  |
| 63 | observeStageResize | `observeStageResize(box, stage)` | 8 |  |
| 72 | getBox | `async getBox()` | 20 |  |
| 93 | hide | `hide()` | 7 |  |
| 101 | roll | `async roll(dice)` | 21 |  |
| 123 | initDiceAnimation | `initDiceAnimation()` | 16 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.audio-player]], [[js.dice-notation]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
