---
source: js/parameters/registry.js
lines: 382
exports: 19
imported_by: 8
api_sha: aa33e049ad05
prose_sha: aa33e049ad05
generated: 2026-08-14
tags: [codemap]
---

# js/parameters/registry.js

<!-- prose:summary -->
システム固有の振る舞いを一手に引き受けるプラグインの登録簿。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3・シノビガミ・ステラナイツ・ドラクルージュの記述子を登録し、キャラクターパラメータの構築・専用パネルの描画・JSON 取り込み・チャットコマンド処理・バフ欄の拡張・フェーズ終了時のリセット・ラウンド進行テンプレート・スタンプの宣言（listPluginStamps。束ねるのは[[js.stamp-registry]]）・ルーム変数の自動計算（applyPluginDerivedRoomParameters。ステラナイツのブーケ合計のような「部屋全体から決まる値」）を、プラグインの有無で分岐しながら中継する。宣言をそのまま素通しするだけの窓口も2つある：getPluginBcdiceSystem（そのシステムを選んだときの BCDice のシステムID。切り替えるかは[[js.main]]が決める）と getPluginDiceDraftSpec（振った目をスキルへ割り当てて使う仕組みの宣言。読むのは[[js.dice-draft-panel]]で、規則の実体は js/parameters/dice-draft/ 側にある）。コマ側・ルーム側とも、後から足したパラメータを既存の部屋へ補うのはここの役目（withMissingPluginParameters / withMissingPluginRoomParameters。locked:true のものだけ）。呼び出し側がシステム名を知らずに済むように、判定はすべてここに集める。プラグインへ渡すのは値と事実だけで、Core は中身を解釈しない（applyPluginDerivedParameters の components と context がその例）。新しいシステムを足す作業はこのファイルへの登録から始まる。
<!-- /prose:role -->

## export（19）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | listPlugins | `listPlugins()` |  |
| 22 | fn | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` |  |
| 27 | fn | buildRoomParameters | `buildRoomParameters(pluginId)` |  |
| 59 | fn | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 指定プラグインのラウンド進行フェーズテンプレートを返す。 |
| 66 | fn | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 指定プラグインがキャラ作成/更新ダイアログ用の専用表示（renderCharacterPanel）を持つか |
| 82 | fn | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | キャラ作成/更新ダイアログのプラグイン専用スペースに、プラグイン自身のUIを描画させる。 |
| 89 | fn | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 指定プラグインが拡張JSON読み込み（importCharacterJson）を持つか |
| 105 | fn | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | ゲームシステム固有のキャラクターシートJSON（外部ツール出力）を、プラグイン自身の 知識で解釈させる。 |
| 120 | fn | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | チャット欄に入力されたテキストを、ルームに適用中のプラグイン固有のコマンドとして 解釈・実行させる（例: DX3の combo.awk(コンボ名) 等）。 |
| 134 | fn | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 入力がどのプラグインのコマンド構文に見えるかを返す。 |
| 150 | fn | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | シーン/ラウンド/シナリオ終了等のフェーズ終了時、プラグイン固有のcomponents（DX3なら エフェクトの使用回数等）をリセットする。 |
| 167 | fn | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | バフ/デバフ付与ダイアログのプラグイン用スペースに、プラグイン自身の追加入力欄を描画させる。 |
| 181 | fn | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | バフ()チャットコマンドの省略可能な追加引数を、プラグインの知識でmetaへ変換する。 |
| 193 | fn | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | バフ1件のmetaを、一覧やログへ添える1行の説明にする。 |
| 240 | fn | applyPluginDerivedRoomParameters | `applyPluginDerivedRoomParameters(pluginId, parameters, context = {})` | ルーム変数に、プラグインの自動計算を適用した新しい集合を返す。 |
| 277 | fn | listPluginStamps | `listPluginStamps(pluginId)` | プラグインが足すスタンプの宣言（記述子のstamps）をそのまま返す。 |
| 291 | fn | getPluginBcdiceSystem | `getPluginBcdiceSystem(pluginId)` | そのシステムで使うBCDiceのシステムID（記述子のbcdiceSystem）をそのまま返す。 |
| 304 | fn | getPluginDiceDraftSpec | `getPluginDiceDraftSpec(pluginId)` | ダイスドラフト（振った目をスキルへ割り当てて使う仕組み）の宣言をそのまま返す。 |
| 353 | fn | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {})` | キャラクター全体のパラメータを受け取り、プラグインの自動計算を適用した新しいパラメータ集合を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（21）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 18 | listPlugins | `listPlugins()` | 3 | ✓ |
| 22 | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` | 4 | ✓ |
| 27 | buildRoomParameters | `buildRoomParameters(pluginId)` | 4 | ✓ |
| 59 | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 5 | ✓ |
| 66 | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 3 | ✓ |
| 82 | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | 5 | ✓ |
| 89 | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 3 | ✓ |
| 105 | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | 5 | ✓ |
| 120 | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | 5 | ✓ |
| 134 | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 3 | ✓ |
| 150 | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | 5 | ✓ |
| 167 | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | 5 | ✓ |
| 181 | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | 5 | ✓ |
| 193 | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | 5 | ✓ |
| 209 | withMissingPluginRoomParameters | `withMissingPluginRoomParameters(plugin, parameters)` | 15 |  |
| 240 | applyPluginDerivedRoomParameters | `applyPluginDerivedRoomParameters(pluginId, parameters, context = {})` | 29 | ✓ |
| 277 | listPluginStamps | `listPluginStamps(pluginId)` | 4 | ✓ |
| 291 | getPluginBcdiceSystem | `getPluginBcdiceSystem(pluginId)` | 4 | ✓ |
| 304 | getPluginDiceDraftSpec | `getPluginDiceDraftSpec(pluginId)` | 3 | ✓ |
| 317 | withMissingPluginParameters | `withMissingPluginParameters(plugin, parameters)` | 15 |  |
| 353 | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {})` | 29 | ✓ |

## 依存

- import → [[js.parameters.dx3]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]
- imported by → [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.character-dialog]], [[js.game-store]], [[js.main]], [[js.room-index]], [[js.stamp-registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
