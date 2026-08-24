---
source: js/game-store.js
lines: 3840
exports: 44
imported_by: 14
api_sha: acb7e7d3e1a6
prose_sha: acb7e7d3e1a6
generated: 2026-08-24
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の状態（コマ・パネル・カード／デッキ・チャット・情報・シーン・音楽・ラウンド進行）を1つのイミュータブルな木として持ち、dispatch されたアクションから次の状態を作る唯一の場所。DOM も window も触らないので、ブラウザとサーバー（[[server.index]]）が同じコードで同じ遷移を行える。バフの実効値計算、フェーズ終了の入れ子、ラウンドの手番順もここが持つ。プロットは「1コマ＝1つの数字」ではなく枠（スロット）の並びで、1体が複数のプロットに出ている状態（分身の術など）を表せる。枠を読むのは listPlotSlots ／ resolvedPlotSlot ／ listPlotSlotRows の3つが入口で、round.plots と round.plotExtras を呼び出し側で足し合わせてはいけない。チャットタブのうち Main と「システム」の2つは常に存在する固定タブで、その保証（withFixedChatTabs）と、事務連絡をシステムタブへ流す口（withSystemTabLog / withBgmLog）もここ。システム固有の解釈は一切せず、パラメータの自動計算やコンポーネントのリセットは [[js.parameters.registry]] 越しにプラグインへ委ねる。
<!-- /prose:role -->

## export（44）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 66 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 70 | fn | generateTokenId | `generateTokenId()` |  |
| 77 | fn | generatePanelId | `generatePanelId()` |  |
| 84 | fn | generateCardId | `generateCardId()` |  |
| 91 | fn | generateDeckId | `generateDeckId()` |  |
| 99 | fn | generateDeckTemplateId | `generateDeckTemplateId()` | デッキの定義（room.deckTemplates）のid。 |
| 106 | fn | generateBuffId | `generateBuffId()` |  |
| 117 | fn | generatePlotSlotId | `generatePlotSlotId()` | 1つのコマに増やしたプロット選択（round.plotExtras）のid。 |
| 124 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 131 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 137 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 141 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 145 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 153 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 163 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 334 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 341 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 351 | fn | snapsToGrid | `snapsToGrid(state)` | 盤面のオブジェクト（コマ・パネル・カード・デッキ）を、離した位置からマス目へ吸着させるか （ルーム単位・全員共通）。 |
| 407 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 423 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 433 | const | SYSTEM_CHAT_TAB_ID | `SYSTEM_CHAT_TAB_ID` | システム発言のうち「読み流してよい事務連絡」を集める固定タブ（withSystemTabLog参照）。 |
| 434 | const | SYSTEM_CHAT_TAB_NAME | `SYSTEM_CHAT_TAB_NAME` |  |
| 438 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 441 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 446 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 599 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 615 | const | CARD_COLS | `CARD_COLS` | カードの大きさ（マス数）。 |
| 616 | const | CARD_ROWS | `CARD_ROWS` |  |
| 620 | const | DEFAULT_CARD_STACK_ORDER | `DEFAULT_CARD_STACK_ORDER` | カード・デッキの既定の重なり順。 |
| 920 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 1039 | fn | listPlotSlots | `listPlotSlots(round, tokenId)` | このコマのプロット枠の一覧。 |
| 1062 | fn | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | このコマが「結局どのプロットで動くか」。 |
| 1070 | fn | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | プロットを増やしていて、まだどれで動くか選ばれていないか。 |
| 1147 | fn | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 枠の表示名。 |
| 1163 | fn | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 手番順のコマ並びを、画面とログに出す「プロット枠1つ＝1行」へ展開する。 |
| 1192 | fn | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 同値の判定で使う枠のキー。 |
| 1204 | fn | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | プロットが同値（同じ値を出した相手がいる）の枠のキー。 |
| 1225 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 同値の枠を持つコマのid（重複なし）。 |
| 1235 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 1247 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 1350 | class | ImmutableStore | `ImmutableStore` |  |
| 3721 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 3725 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 3839 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（85）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 31 | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | 9 |  |
| 53 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 10 |  |
| 70 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 77 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 84 | generateCardId | `generateCardId()` | 4 | ✓ |
| 91 | generateDeckId | `generateDeckId()` | 4 | ✓ |
| 99 | generateDeckTemplateId | `generateDeckTemplateId()` | 4 | ✓ |
| 106 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 117 | generatePlotSlotId | `generatePlotSlotId()` | 4 | ✓ |
| 124 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 131 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 145 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 153 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 163 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 172 | createInitialRoundState | `createInitialRoundState()` | 37 |  |
| 213 | normalizeRoundState | `normalizeRoundState(round)` | 36 |  |
| 259 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 19 |  |
| 287 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 313 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 334 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 341 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 351 | snapsToGrid | `snapsToGrid(state)` | 3 | ✓ |
| 360 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 388 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 407 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 454 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 459 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 464 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 472 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 484 | withFixedChatTabs | `withFixedChatTabs(chatTabs, chatLogs)` | 23 |  |
| 514 | withBgmLog | `withBgmLog(chatLogs, tracks, nextTrackId, time)` | 6 |  |
| 531 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 541 | withSystemLogIn | `withSystemLogIn(chatLogs, tabId, text, time)` | 3 |  |
| 547 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 553 | withSystemTabLog | `withSystemTabLog(chatLogs, text, time)` | 3 |  |
| 559 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 567 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 576 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 589 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 599 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 646 | clampCardText | `clampCardText(value, max)` | 3 |  |
| 651 | normalizeCardImage | `normalizeCardImage(image)` | 4 |  |
| 661 | normalizeCardFace | `normalizeCardFace(face)` | 9 |  |
| 672 | normalizeCardBack | `normalizeCardBack(back)` | 7 |  |
| 680 | normalizeSeenBy | `normalizeSeenBy(seenBy)` | 5 |  |
| 688 | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [], stockerId = null, stockerSeq = 0 })` | 26 |  |
| 716 | normalizeDeckCards | `normalizeDeckCards(cards)` | 16 |  |
| 733 | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` | 17 |  |
| 753 | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 3 |  |
| 757 | normalizeCardMap | `normalizeCardMap(cards)` | 7 |  |
| 767 | withoutLostStockerCards | `withoutLostStockerCards(cards, panels)` | 11 |  |
| 779 | normalizeDeckMap | `normalizeDeckMap(decks)` | 7 |  |
| 793 | buildDeckTemplateCard | `buildDeckTemplateCard(card, index)` | 11 |  |
| 805 | buildDeckTemplate | `buildDeckTemplate({ id, name = '', back = null, cards = [] })` | 9 |  |
| 815 | normalizeDeckTemplateMap | `normalizeDeckTemplateMap(templates)` | 7 |  |
| 826 | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 12 |  |
| 852 | stockerAllowsUser | `stockerAllowsUser(panel, participantId, localUserId)` | 6 |  |
| 860 | nextStockerSeq | `nextStockerSeq(cards)` | 3 |  |
| 865 | listStockerCards | `listStockerCards(cards, panelId)` | 5 |  |
| 880 | releaseStockerCards | `releaseStockerCards(cards, panel, gridSize)` | 18 |  |
| 901 | definedFields | `definedFields(patch)` | 3 |  |
| 907 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 920 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 957 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 966 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 981 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 1009 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 1023 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 1039 | listPlotSlots | `listPlotSlots(round, tokenId)` | 15 | ✓ |
| 1062 | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | 6 | ✓ |
| 1070 | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | 3 | ✓ |
| 1078 | plotValueOf | `plotValueOf(round, tokenId)` | 7 |  |
| 1097 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 1137 | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` | 4 |  |
| 1147 | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 4 | ✓ |
| 1163 | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 27 | ✓ |
| 1192 | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 3 | ✓ |
| 1204 | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | 18 | ✓ |
| 1225 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 6 | ✓ |
| 1235 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 6 | ✓ |
| 1247 | pickNextActor | `pickNextActor(tokensState, round)` | 6 | ✓ |
| 1256 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 1261 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 1274 | fieldPatchFor | `fieldPatchFor(table, action)` | 3 |  |
| 3725 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 113 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-host]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。

reducer の中で乱数・時刻を使わないこと。同じアクションを各クライアントが再実行するため、結果が画面ごとにずれる。シャッフルの並び（SHUFFLE_DECK の order）も ID の採番も、発火側が作って payload に載せる約束になっている（プロットの枠 ID も同じで、generatePlotSlotId は [[js.round-panel]] 側から呼ぶ）。受け取った並びが「今デッキにある札の並べ替えか」は reducer 側で必ず検証する。

プロットまわりのアクション（ROUND_SET_PLOT・ROUND_ADD_PLOT_SLOT・ROUND_REMOVE_PLOT_SLOT・ROUND_SET_PLOT_SLOT_LABEL・ROUND_SET_PLOT_CHOICE）はどれもチャットログを足さない。伏せた値が漏れるのを防ぐためと、卓の邪魔をしないため。値がログに出るのは ROUND_ADVANCE_PHASE の一斉公開だけ。
<!-- /prose:notes -->
