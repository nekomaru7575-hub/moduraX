---
source: js/parameters/registry.js
lines: 447
exports: 22
imported_by: 10
api_sha: 1669863fb4a8
prose_sha: 1669863fb4a8
generated: 2026-08-17
tags: [codemap]
---

# js/parameters/registry.js

<!-- prose:summary -->
システム固有の振る舞いを一手に引き受けるプラグインの登録簿。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
DX3・シノビガミ・ステラナイツ・ドラクルージュの記述子を登録し、キャラクターパラメータの構築・専用パネルの描画・JSON 取り込み・チャットコマンド処理・バフ欄の拡張・フェーズ終了時のリセット・ラウンド進行テンプレート・スタンプの宣言（listPluginStamps。束ねるのは[[js.stamp-registry]]）・ルーム変数の自動計算（applyPluginDerivedRoomParameters。ステラナイツのブーケ合計のような「部屋全体から決まる値」）を、プラグインの有無で分岐しながら中継する。宣言をそのまま素通しするだけの窓口も2つある：getPluginBcdiceSystem（そのシステムを選んだときの BCDice のシステムID。切り替えるかは[[js.main]]が決める）と getPluginDiceDraftSpec（振った目をスキルへ割り当てて使う仕組みの宣言。読むのは[[js.dice-draft-panel]]で、規則の実体は js/parameters/dice-draft/ 側にある）。コマ側・ルーム側とも、後から足したパラメータを既存の部屋へ補うのはここの役目（withMissingPluginParameters / withMissingPluginRoomParameters。locked:true のものだけ）。URLからのシート取り込みも、宣言を渡すところ（getPluginSheetSource）と入口を出すかの判定（pluginHasSheetImport）だけを持ち、実際の取得は[[js.character-sheet-import]]とサーバー側の中継が行う。呼び出し側がシステム名を知らずに済むように、判定はすべてここに集める。プラグインへ渡すのは値と事実だけで、Core は中身を解釈しない（applyPluginDerivedParameters の components と context がその例）。新しいシステムを足す作業はこのファイルへの登録から始まる。
<!-- /prose:role -->

## export（22）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | fn | listPlugins | `listPlugins()` |  |
| 23 | fn | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` |  |
| 28 | fn | buildRoomParameters | `buildRoomParameters(pluginId)` |  |
| 62 | fn | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 指定プラグインのラウンド進行フェーズテンプレートを返す。 |
| 69 | fn | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 指定プラグインがキャラ作成/更新ダイアログ用の専用表示（renderCharacterPanel）を持つか |
| 85 | fn | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | キャラ作成/更新ダイアログのプラグイン専用スペースに、プラグイン自身のUIを描画させる。 |
| 92 | fn | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 指定プラグインが拡張JSON読み込み（importCharacterJson）を持つか |
| 108 | fn | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | ゲームシステム固有のキャラクターシートJSON（外部ツール出力）を、プラグイン自身の 知識で解釈させる。 |
| 129 | fn | getPluginSheetSource | `getPluginSheetSource(pluginId)` | そのシステムのキャラクターシートを置いているWebサービスの宣言（characterSheetSource）。 |
| 134 | fn | pluginHasSheetImport | `pluginHasSheetImport(pluginId)` | 指定プラグインがURLからのシート取り込みを持つか（画面に入口を出すかの判定） |
| 152 | fn | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | チャット欄に入力されたテキストを、ルームに適用中のプラグイン固有のコマンドとして 解釈・実行させる（例: DX3の combo.awk(コンボ名) 等）。 |
| 175 | fn | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 入力がどのプラグインのコマンド構文に見えるかを返す。 |
| 191 | fn | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | シーン/ラウンド/シナリオ終了等のフェーズ終了時、プラグイン固有のcomponents（DX3なら エフェクトの使用回数等）をリセットする。 |
| 215 | fn | applyPluginRoundPhaseStart | `applyPluginRoundPhaseStart(pluginId, phase, context)` | ラウンド進行がフェーズへ入るときに、そのシステム固有のパラメータを動かす （ドラクルージュのラウンド頭の「喝采点+1・抗う力を2に戻す」）。 |
| 232 | fn | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | バフ/デバフ付与ダイアログのプラグイン用スペースに、プラグイン自身の追加入力欄を描画させる。 |
| 246 | fn | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | バフ()チャットコマンドの省略可能な追加引数を、プラグインの知識でmetaへ変換する。 |
| 258 | fn | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | バフ1件のmetaを、一覧やログへ添える1行の説明にする。 |
| 305 | fn | applyPluginDerivedRoomParameters | `applyPluginDerivedRoomParameters(pluginId, parameters, context = {})` | ルーム変数に、プラグインの自動計算を適用した新しい集合を返す。 |
| 342 | fn | listPluginStamps | `listPluginStamps(pluginId)` | プラグインが足すスタンプの宣言（記述子のstamps）をそのまま返す。 |
| 356 | fn | getPluginBcdiceSystem | `getPluginBcdiceSystem(pluginId)` | そのシステムで使うBCDiceのシステムID（記述子のbcdiceSystem）をそのまま返す。 |
| 369 | fn | getPluginDiceDraftSpec | `getPluginDiceDraftSpec(pluginId)` | ダイスドラフト（振った目をスキルへ割り当てて使う仕組み）の宣言をそのまま返す。 |
| 418 | fn | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {})` | キャラクター全体のパラメータを受け取り、プラグインの自動計算を適用した新しいパラメータ集合を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（24）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | listPlugins | `listPlugins()` | 3 | ✓ |
| 23 | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` | 4 | ✓ |
| 28 | buildRoomParameters | `buildRoomParameters(pluginId)` | 4 | ✓ |
| 62 | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 5 | ✓ |
| 69 | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 3 | ✓ |
| 85 | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | 5 | ✓ |
| 92 | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 3 | ✓ |
| 108 | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | 5 | ✓ |
| 129 | getPluginSheetSource | `getPluginSheetSource(pluginId)` | 3 | ✓ |
| 134 | pluginHasSheetImport | `pluginHasSheetImport(pluginId)` | 3 | ✓ |
| 152 | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | 14 | ✓ |
| 175 | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 3 | ✓ |
| 191 | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | 5 | ✓ |
| 215 | applyPluginRoundPhaseStart | `applyPluginRoundPhaseStart(pluginId, phase, context)` | 5 | ✓ |
| 232 | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | 5 | ✓ |
| 246 | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | 5 | ✓ |
| 258 | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | 5 | ✓ |
| 274 | withMissingPluginRoomParameters | `withMissingPluginRoomParameters(plugin, parameters)` | 15 |  |
| 305 | applyPluginDerivedRoomParameters | `applyPluginDerivedRoomParameters(pluginId, parameters, context = {})` | 29 | ✓ |
| 342 | listPluginStamps | `listPluginStamps(pluginId)` | 4 | ✓ |
| 356 | getPluginBcdiceSystem | `getPluginBcdiceSystem(pluginId)` | 4 | ✓ |
| 369 | getPluginDiceDraftSpec | `getPluginDiceDraftSpec(pluginId)` | 3 | ✓ |
| 382 | withMissingPluginParameters | `withMissingPluginParameters(plugin, parameters)` | 15 |  |
| 418 | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {})` | 29 | ✓ |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.shinobigami]], [[js.parameters.stella-knights]]
- imported by → [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.character-dialog]], [[js.dice-draft-panel]], [[js.game-store]], [[js.main]], [[js.room-index]], [[js.stamp-registry]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
