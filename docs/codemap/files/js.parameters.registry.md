---
source: js/parameters/registry.js
lines: 491
exports: 23
imported_by: 10
api_sha: 76d7c77397c7
prose_sha: 76d7c77397c7
generated: 2026-08-21
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

## export（23）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | fn | listPlugins | `listPlugins()` |  |
| 26 | fn | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` |  |
| 31 | fn | buildRoomParameters | `buildRoomParameters(pluginId)` |  |
| 65 | fn | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 指定プラグインのラウンド進行フェーズテンプレートを返す。 |
| 72 | fn | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 指定プラグインがキャラ作成/更新ダイアログ用の専用表示（renderCharacterPanel）を持つか |
| 94 | fn | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | キャラ作成/更新ダイアログのプラグイン専用スペースに、プラグイン自身のUIを描画させる。 |
| 101 | fn | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 指定プラグインが拡張JSON読み込み（importCharacterJson）を持つか |
| 117 | fn | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | ゲームシステム固有のキャラクターシートJSON（外部ツール出力）を、プラグイン自身の 知識で解釈させる。 |
| 138 | fn | getPluginSheetSource | `getPluginSheetSource(pluginId)` | そのシステムのキャラクターシートを置いているWebサービスの宣言（characterSheetSource）。 |
| 143 | fn | pluginHasSheetImport | `pluginHasSheetImport(pluginId)` | 指定プラグインがURLからのシート取り込みを持つか（画面に入口を出すかの判定） |
| 162 | fn | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | チャット欄に入力されたテキストを、ルームに適用中のプラグイン固有のコマンドとして 解釈・実行させる（例: DX3の combo.awk(コンボ名) 等）。 |
| 190 | fn | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 入力がどのプラグインのコマンド構文に見えるかを返す。 |
| 206 | fn | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | シーン/ラウンド/シナリオ終了等のフェーズ終了時、プラグイン固有のcomponents（DX3なら エフェクトの使用回数等）をリセットする。 |
| 230 | fn | applyPluginRoundPhaseStart | `applyPluginRoundPhaseStart(pluginId, phase, context)` | ラウンド進行がフェーズへ入るときに、そのシステム固有のパラメータを動かす （ドラクルージュのラウンド頭の「喝采点+1・抗う力を2に戻す」）。 |
| 247 | fn | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | バフ/デバフ付与ダイアログのプラグイン用スペースに、プラグイン自身の追加入力欄を描画させる。 |
| 261 | fn | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | バフ()チャットコマンドの省略可能な追加引数を、プラグインの知識でmetaへ変換する。 |
| 273 | fn | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | バフ1件のmetaを、一覧やログへ添える1行の説明にする。 |
| 320 | fn | applyPluginDerivedRoomParameters | `applyPluginDerivedRoomParameters(pluginId, parameters, context = {})` | ルーム変数に、プラグインの自動計算を適用した新しい集合を返す。 |
| 357 | fn | listPluginStamps | `listPluginStamps(pluginId)` | プラグインが足すスタンプの宣言（記述子のstamps）をそのまま返す。 |
| 371 | fn | getPluginBcdiceSystem | `getPluginBcdiceSystem(pluginId)` | そのシステムで使うBCDiceのシステムID（記述子のbcdiceSystem）をそのまま返す。 |
| 384 | fn | getPluginDiceDraftSpec | `getPluginDiceDraftSpec(pluginId)` | ダイスドラフト（振った目をスキルへ割り当てて使う仕組み）の宣言をそのまま返す。 |
| 436 | fn | withPluginParameterDeclarations | `withPluginParameterDeclarations(pluginId, parameters)` | コマのパラメータを、今のプラグインの宣言（不足分の補完と editable）へ揃える。 |
| 462 | fn | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {})` | キャラクター全体のパラメータを受け取り、プラグインの自動計算を適用した新しいパラメータ集合を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（25）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 22 | listPlugins | `listPlugins()` | 3 | ✓ |
| 26 | buildCharacterParametersForPlugin | `buildCharacterParametersForPlugin(pluginId)` | 4 | ✓ |
| 31 | buildRoomParameters | `buildRoomParameters(pluginId)` | 4 | ✓ |
| 65 | getRoundPhaseTemplate | `getRoundPhaseTemplate(pluginId)` | 5 | ✓ |
| 72 | pluginHasCharacterPanel | `pluginHasCharacterPanel(pluginId)` | 3 | ✓ |
| 94 | renderCharacterPanel | `renderCharacterPanel(pluginId, context)` | 5 | ✓ |
| 101 | pluginHasCharacterImport | `pluginHasCharacterImport(pluginId)` | 3 | ✓ |
| 117 | importCharacterJsonForPlugin | `importCharacterJsonForPlugin(pluginId, json)` | 5 | ✓ |
| 138 | getPluginSheetSource | `getPluginSheetSource(pluginId)` | 3 | ✓ |
| 143 | pluginHasSheetImport | `pluginHasSheetImport(pluginId)` | 3 | ✓ |
| 162 | handlePluginChatCommand | `handlePluginChatCommand(pluginId, rawInput, context)` | 19 | ✓ |
| 190 | findPluginForChatCommand | `findPluginForChatCommand(rawInput)` | 3 | ✓ |
| 206 | resetPluginComponentsOnPhaseEnd | `resetPluginComponentsOnPhaseEnd(pluginId, components, phase)` | 5 | ✓ |
| 230 | applyPluginRoundPhaseStart | `applyPluginRoundPhaseStart(pluginId, phase, context)` | 5 | ✓ |
| 247 | renderPluginBuffFields | `renderPluginBuffFields(pluginId, context)` | 5 | ✓ |
| 261 | parsePluginBuffExtra | `parsePluginBuffExtra(pluginId, paramId, text)` | 5 | ✓ |
| 273 | describePluginBuffMeta | `describePluginBuffMeta(pluginId, buff)` | 5 | ✓ |
| 289 | withMissingPluginRoomParameters | `withMissingPluginRoomParameters(plugin, parameters)` | 15 |  |
| 320 | applyPluginDerivedRoomParameters | `applyPluginDerivedRoomParameters(pluginId, parameters, context = {})` | 29 | ✓ |
| 357 | listPluginStamps | `listPluginStamps(pluginId)` | 4 | ✓ |
| 371 | getPluginBcdiceSystem | `getPluginBcdiceSystem(pluginId)` | 4 | ✓ |
| 384 | getPluginDiceDraftSpec | `getPluginDiceDraftSpec(pluginId)` | 3 | ✓ |
| 406 | withMissingPluginParameters | `withMissingPluginParameters(plugin, parameters)` | 23 |  |
| 436 | withPluginParameterDeclarations | `withPluginParameterDeclarations(pluginId, parameters)` | 5 | ✓ |
| 462 | applyPluginDerivedParameters | `applyPluginDerivedParameters(pluginId, parameters, components = {}, context = {})` | 29 | ✓ |

## 依存

- import → [[js.parameters.arianrhod]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dracurouge]], [[js.parameters.dx3]], [[js.parameters.shinobigami]], [[js.parameters.skill.item-use]], [[js.parameters.stella-knights]]
- imported by → [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.character-dialog]], [[js.dice-draft-panel]], [[js.game-store]], [[js.main]], [[js.room-index]], [[js.stamp-registry]], [[server.index]]

## 注意

<!-- prose:notes -->
コマ側・ルーム側の「後から足したパラメータを既存の部屋へ補う」（withMissingPluginParameters / withMissingPluginRoomParameters）は、`locked:true` のものだけを対象にする。こうしておけば、利用者が消したパラメータが勝手に復活しない。

コマ側はそれに加えて `editable`（手入力できるか）も毎回プラグインの宣言へ揃え直す。これはプラグインの宣言でしかなく、利用者が変える口がどこにも無いため。揃え直さないと、後から手入力できるようにしたパラメータが**既存のコマでだけ**弾かれ続ける（シノビガミの AdB/AnB/SB/FB で実際に起きた）。`visible` は利用者が切り替えられるので触らない。この補正だけを取り出した口が withPluginParameterDeclarations で、[[js.game-store]] の SET_PARAMETER が自動計算より先に呼ぶ（弾かれると自動計算まで到達せず、古い宣言が直る機会が無いため）。
<!-- /prose:notes -->
