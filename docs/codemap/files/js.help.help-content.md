---
source: js/help/help-content.js
lines: 1624
exports: 8
imported_by: 1
api_sha: 5c378e323788
prose_sha: 5c378e323788
generated: 2026-09-09
tags: [codemap]
---

# js/help/help-content.js

<!-- prose:summary -->
部屋の中のヘルプ（「？ヘルプ」タブ）で読ませる文章そのもの。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の中の「？ヘルプ」で読ませる文章そのもの。データだけを持ち、描画も遷移も [[js.help.help-panel]] が持つ。本体機能の木（CORE_HELP）、ゲームシステム固有の木（PLUGIN_HELP）、打つ言葉の一覧（COMMAND_LIST_CORE・PLUGIN_COMMAND_HELP）に分かれる。プラグイン記述子（js/parameters/*.js）側には文章を置かない——文体と粒度をこの1ファイルに揃えるため。
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 34 | const | GREETINGS | `GREETINGS` | あいさつ。 |
| 699 | const | CORE_HELP | `CORE_HELP` |  |
| 723 | const | PLUGIN_HELP | `PLUGIN_HELP` | --- プラグイン（ゲームシステム固有）--- キーは js/parameters/registry.js の PLUGINS のキー＝ room.activePlugin の値。 |
| 1440 | const | PLUGIN_COMMAND_HELP | `PLUGIN_COMMAND_HELP` | キーは js/parameters/registry.js の PLUGINS のキー＝ room.activePlugin の値。 |
| 1568 | fn | buildCommandListHelp | `buildCommandListHelp(activePlugin)` | 「コマンド一覧」のノードを組む。 |
| 1582 | const | whoIsDediDevi | `whoIsDediDevi` | 会話用の選択肢たち |
| 1593 | const | howToEraceYou | `howToEraceYou` |  |
| 1613 | fn | buildHelpRoot | `buildHelpRoot(activePlugin)` | この部屋で出すヘルプのルート層を組む。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 1568 | buildCommandListHelp | `buildCommandListHelp(activePlugin)` | 9 | ✓ |
| 1613 | buildHelpRoot | `buildHelpRoot(activePlugin)` | 11 | ✓ |

## 依存

- import → なし
- imported by → [[js.help.help-panel]]

## 注意

<!-- prose:notes -->
1項目（body）は5行まで。超えるならその項目を入口にして children へ切り分ける。例外は「コマンド一覧」だけで、そこは行数も文体も外れる（引くものなので地の文）。

プラグインを足したら PLUGIN_HELP と PLUGIN_COMMAND_HELP の両方に同じキーで1件ずつ要る。片方だけだと画面に出ない。キーは [[js.parameters.registry]] の PLUGINS と同じ文字列。

本文は textContent で入るのでHTMLにならない。戻る導線は [[js.help.help-panel]] が自動で出すので、本文に書かない。
<!-- /prose:notes -->
