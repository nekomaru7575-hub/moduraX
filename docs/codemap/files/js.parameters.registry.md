---
source: js/parameters/registry.js
lines: 253
exports: 15
imported_by: 7
api_sha: 5a843db26988
prose_sha: 5a843db26988
generated: 2026-08-07
tags: [codemap]
---

# js/parameters/registry.js

<!-- prose:summary -->
システム固有の振る舞いを一手に引き受けるプラグインの登録簿。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3 とシノビガミの記述子を登録し、キャラクターパラメータの構築・専用パネルの描画・JSON 取り込み・チャットコマンド処理・バフ欄の拡張・フェーズ終了時のリセットなどを、プラグインの有無で分岐しながら中継する。呼び出し側がシステム名を知らずに済むように、判定はすべてここに集める。新しいシステムを足す作業はこのファイルへの登録から始まる。
<!-- /prose:role -->

## export（15）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 14 | fn | listPlugins | `listPlugins()` |  |
| 18 | fn | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` |  |
| 23 | fn | buildRoomParameters | `buildRoomParameters(pluginId)` |  |
| 51 | fn | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 指定プラグインのラウンド進行フェーズテンプレートを返す。 |
| 58 | fn | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 指定プラグインがキャラ作成/更新ダイアログ用の専用表示（renderCharacterPanel）を持つか |
| 74 | fn | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | キャラ作成/更新ダイアログのプラグイン専用スペースに、プラグイン自身のUIを描画させる。 |
| 81 | fn | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 指定プラグインが拡張JSON読み込み（importCharacterJson）を持つか |
| 97 | fn | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | ゲームシステム固有のキャラクターシートJSON（外部ツール出力）を、プラグイン自身の 知識で解釈させる。 |
| 112 | fn | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | チャット欄に入力されたテキストを、ルームに適用中のプラグイン固有のコマンドとして 解釈・実行させる（例: DX3の combo.awk(コンボ名) 等）。 |
| 126 | fn | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 入力がどのプラグインのコマンド構文に見えるかを返す。 |
| 142 | fn | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | シーン/ラウンド/シナリオ終了等のフェーズ終了時、プラグイン固有のcomponents（DX3なら エフェクトの使用回数等）をリセットする。 |
| 159 | fn | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | バフ/デバフ付与ダイアログのプラグイン用スペースに、プラグイン自身の追加入力欄を描画させる。 |
| 173 | fn | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | バフ()チャットコマンドの省略可能な追加引数を、プラグインの知識でmetaへ変換する。 |
| 185 | fn | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | バフ1件のmetaを、一覧やログへ添える1行の説明にする。 |
| 225 | fn | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {})` | キャラクター全体のパラメータを受け取り、プラグインの自動計算を適用した新しいパラメータ集合を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 14 | listPlugins | `listPlugins()` | 3 | ✓ |
| 18 | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` | 4 | ✓ |
| 23 | buildRoomParameters | `buildRoomParameters(pluginId)` | 4 | ✓ |
| 51 | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 5 | ✓ |
| 58 | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 3 | ✓ |
| 74 | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | 5 | ✓ |
| 81 | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 3 | ✓ |
| 97 | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | 5 | ✓ |
| 112 | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | 5 | ✓ |
| 126 | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 3 | ✓ |
| 142 | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | 5 | ✓ |
| 159 | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | 5 | ✓ |
| 173 | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | 5 | ✓ |
| 185 | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | 5 | ✓ |
| 200 | withMissingPluginParameters | `withMissingPluginParameters(plugin, parameters)` | 15 |  |
| 225 | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {})` | 29 | ✓ |

## 依存

- import → [[js.parameters.dx3]], [[js.parameters.shinobigami]]
- imported by → [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.character-dialog]], [[js.game-store]], [[js.main]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
