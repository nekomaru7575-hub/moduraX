---
source: js/help/help-content.js
lines: 1139
exports: 6
imported_by: 1
api_sha: 9dbeddd8b6f7
prose_sha: 9dbeddd8b6f7
generated: 2026-08-26
tags: [codemap]
---

# js/help/help-content.js

<!-- prose:summary -->
部屋の中のヘルプ（「？ヘルプ」タブ）で読ませる文章そのもの。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | const | GREETINGS | `GREETINGS` | あいさつ。 |
| 602 | const | CORE_HELP | `CORE_HELP` |  |
| 625 | const | PLUGIN_HELP | `PLUGIN_HELP` | --- プラグイン（ゲームシステム固有）--- キーは js/parameters/registry.js の PLUGINS のキー＝ room.activePlugin の値。 |
| 1099 | const | whoIsDediDevi | `whoIsDediDevi` | 会話用の選択肢たち |
| 1110 | const | howToEraceYou | `howToEraceYou` |  |
| 1129 | fn | buildHelpRoot | `buildHelpRoot(activePlugin)` | この部屋で出すヘルプのルート層を組む。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 1129 | buildHelpRoot | `buildHelpRoot(activePlugin)` | 10 | ✓ |

## 依存

- import → なし
- imported by → [[js.help.help-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
