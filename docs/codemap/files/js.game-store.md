---
source: js/game-store.js
lines: 4018
exports: 49
imported_by: 15
api_sha: b95c7e8ee860
prose_sha: b95c7e8ee860
generated: 2026-08-27
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

## export（49）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 66 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 80 | fn | generateTokenId | `generateTokenId()` |  |
| 87 | fn | generatePanelId | `generatePanelId()` |  |
| 94 | fn | generateCardId | `generateCardId()` |  |
| 101 | fn | generateDeckId | `generateDeckId()` |  |
| 109 | fn | generateDeckTemplateId | `generateDeckTemplateId()` | デッキの定義（room.deckTemplates）のid。 |
| 116 | fn | generateBuffId | `generateBuffId()` |  |
| 127 | fn | generatePlotSlotId | `generatePlotSlotId()` | 1つのコマに増やしたプロット選択（round.plotExtras）のid。 |
| 134 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 141 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 147 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 151 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 155 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 163 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 173 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 344 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 351 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 361 | fn | snapsToGrid | `snapsToGrid(state)` | 盤面のオブジェクト（コマ・パネル・カード・デッキ）を、離した位置からマス目へ吸着させるか （ルーム単位・全員共通）。 |
| 417 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 433 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 443 | const | SYSTEM_CHAT_TAB_ID | `SYSTEM_CHAT_TAB_ID` | システム発言のうち「読み流してよい事務連絡」を集める固定タブ（withSystemTabLog参照）。 |
| 444 | const | SYSTEM_CHAT_TAB_NAME | `SYSTEM_CHAT_TAB_NAME` |  |
| 448 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 451 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 456 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 609 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 625 | const | CARD_COLS | `CARD_COLS` | カードの大きさ（マス数）。 |
| 626 | const | CARD_ROWS | `CARD_ROWS` |  |
| 630 | const | DEFAULT_CARD_STACK_ORDER | `DEFAULT_CARD_STACK_ORDER` | カード・デッキの既定の重なり順。 |
| 942 | const | MAX_INFO_MASKS_PER_SECTION | `MAX_INFO_MASKS_PER_SECTION` | 情報（infoEntries）の「伏せた語」(masks)の上限。 |
| 943 | const | MAX_INFO_MASK_TEXT_LENGTH | `MAX_INFO_MASK_TEXT_LENGTH` |  |
| 945 | const | MAX_INFO_MASK_CHAR_LENGTH | `MAX_INFO_MASK_CHAR_LENGTH` | 伏せ字。 |
| 946 | const | DEFAULT_INFO_MASK_CHAR | `DEFAULT_INFO_MASK_CHAR` |  |
| 968 | fn | listMaskMarkers | `listMaskMarkers(body)` | 本文中の伏せ字の目印 {{n}} を頭から拾い、[{ id, start, end }] を出現順に返す。 |
| 1032 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 1151 | fn | listPlotSlots | `listPlotSlots(round, tokenId)` | このコマのプロット枠の一覧。 |
| 1174 | fn | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | このコマが「結局どのプロットで動くか」。 |
| 1182 | fn | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | プロットを増やしていて、まだどれで動くか選ばれていないか。 |
| 1259 | fn | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 枠の表示名。 |
| 1275 | fn | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 手番順のコマ並びを、画面とログに出す「プロット枠1つ＝1行」へ展開する。 |
| 1304 | fn | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 同値の判定で使う枠のキー。 |
| 1316 | fn | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | プロットが同値（同じ値を出した相手がいる）の枠のキー。 |
| 1337 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 同値の枠を持つコマのid（重複なし）。 |
| 1347 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 1359 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 1462 | class | ImmutableStore | `ImmutableStore` |  |
| 3895 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 3899 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 4017 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（88）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 31 | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | 9 |  |
| 53 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 10 |  |
| 80 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 87 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 94 | generateCardId | `generateCardId()` | 4 | ✓ |
| 101 | generateDeckId | `generateDeckId()` | 4 | ✓ |
| 109 | generateDeckTemplateId | `generateDeckTemplateId()` | 4 | ✓ |
| 116 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 127 | generatePlotSlotId | `generatePlotSlotId()` | 4 | ✓ |
| 134 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 141 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 155 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 163 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 173 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 182 | createInitialRoundState | `createInitialRoundState()` | 37 |  |
| 223 | normalizeRoundState | `normalizeRoundState(round)` | 36 |  |
| 269 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 19 |  |
| 297 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 323 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 344 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 351 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 361 | snapsToGrid | `snapsToGrid(state)` | 3 | ✓ |
| 370 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 398 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 417 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 464 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 469 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 474 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 482 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 494 | withFixedChatTabs | `withFixedChatTabs(chatTabs, chatLogs)` | 23 |  |
| 524 | withBgmLog | `withBgmLog(chatLogs, tracks, nextTrackId, time)` | 6 |  |
| 541 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 551 | withSystemLogIn | `withSystemLogIn(chatLogs, tabId, text, time)` | 3 |  |
| 557 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 563 | withSystemTabLog | `withSystemTabLog(chatLogs, text, time)` | 3 |  |
| 569 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 577 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 586 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 599 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 609 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 671 | clampCardText | `clampCardText(value, max)` | 3 |  |
| 676 | normalizeCardImage | `normalizeCardImage(image)` | 4 |  |
| 686 | normalizeCardFace | `normalizeCardFace(face)` | 9 |  |
| 697 | normalizeCardBack | `normalizeCardBack(back)` | 7 |  |
| 705 | normalizeSeenBy | `normalizeSeenBy(seenBy)` | 5 |  |
| 713 | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [], stockerId = null, stockerSeq = 0 })` | 26 |  |
| 741 | normalizeDeckCards | `normalizeDeckCards(cards)` | 16 |  |
| 758 | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` | 17 |  |
| 781 | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 3 |  |
| 785 | normalizeCardMap | `normalizeCardMap(cards)` | 8 |  |
| 796 | withoutLostStockerCards | `withoutLostStockerCards(cards, panels)` | 11 |  |
| 808 | normalizeDeckMap | `normalizeDeckMap(decks)` | 8 |  |
| 823 | buildDeckTemplateCard | `buildDeckTemplateCard(card, index)` | 11 |  |
| 835 | buildDeckTemplate | `buildDeckTemplate({ id, name = '', back = null, cards = [] })` | 9 |  |
| 845 | normalizeDeckTemplateMap | `normalizeDeckTemplateMap(templates)` | 8 |  |
| 857 | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 12 |  |
| 883 | stockerAllowsUser | `stockerAllowsUser(panel, participantId, localUserId)` | 6 |  |
| 891 | nextStockerSeq | `nextStockerSeq(cards)` | 3 |  |
| 896 | listStockerCards | `listStockerCards(cards, panelId)` | 5 |  |
| 911 | releaseStockerCards | `releaseStockerCards(cards, panel, gridSize)` | 18 |  |
| 932 | definedFields | `definedFields(patch)` | 3 |  |
| 951 | clampMaskChar | `clampMaskChar(value)` | 11 |  |
| 968 | listMaskMarkers | `listMaskMarkers(body)` | 10 | ✓ |
| 983 | normalizeInfoMasks | `normalizeInfoMasks(masks, body)` | 29 |  |
| 1017 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null, masks = null })` | 10 |  |
| 1032 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 1069 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 1078 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 1093 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 1121 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 1135 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 1151 | listPlotSlots | `listPlotSlots(round, tokenId)` | 15 | ✓ |
| 1174 | resolvedPlotSlot | `resolvedPlotSlot(round, tokenId)` | 6 | ✓ |
| 1182 | hasUnchosenPlot | `hasUnchosenPlot(round, tokenId)` | 3 | ✓ |
| 1190 | plotValueOf | `plotValueOf(round, tokenId)` | 7 |  |
| 1209 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 1249 | normalizePlotSlotLabel | `normalizePlotSlotLabel(label)` | 4 |  |
| 1259 | describePlotSlotName | `describePlotSlotName(tokenName, slot, slotIndex)` | 4 | ✓ |
| 1275 | listPlotSlotRows | `listPlotSlotRows(tokensState, round, tokenIds)` | 27 | ✓ |
| 1304 | plotSlotKey | `plotSlotKey(tokenId, slotId)` | 3 | ✓ |
| 1316 | listTiedPlotSlotKeys | `listTiedPlotSlotKeys(round)` | 18 | ✓ |
| 1337 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 6 | ✓ |
| 1347 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 6 | ✓ |
| 1359 | pickNextActor | `pickNextActor(tokensState, round)` | 6 | ✓ |
| 1368 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 1373 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 1386 | fieldPatchFor | `fieldPatchFor(table, action)` | 3 |  |
| 3899 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 117 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-entry-dialog]], [[js.info-panel]], [[js.main]], [[js.net-host]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。

reducer の中で乱数・時刻を使わないこと。同じアクションを各クライアントが再実行するため、結果が画面ごとにずれる。シャッフルの並び（SHUFFLE_DECK の order）も ID の採番も、発火側が作って payload に載せる約束になっている（プロットの枠 ID も同じで、generatePlotSlotId は [[js.round-panel]] 側から呼ぶ）。受け取った並びが「今デッキにある札の並べ替えか」は reducer 側で必ず検証する。

プロットまわりのアクション（ROUND_SET_PLOT・ROUND_ADD_PLOT_SLOT・ROUND_REMOVE_PLOT_SLOT・ROUND_SET_PLOT_SLOT_LABEL・ROUND_SET_PLOT_CHOICE）はどれもチャットログを足さない。伏せた値が漏れるのを防ぐためと、卓の邪魔をしないため。値がログに出るのは ROUND_ADVANCE_PHASE の一斉公開だけ。

情報（infoEntries）の区画は body と masks（伏せた語）を対で持ち、本文の目印 `{{n}}` と mask.id が対応する。buildInfoSection が両方を一緒に受け取って刈るので、片方だけを渡す更新を書かないこと（公開先だけを変えたつもりで伏せ字が全部消える）。伏せた語の中身は他の限定公開と同じく全クライアントへ配られていて、隠しているのは描画だけ（[[js.visibility]] の但し書きと同じ立場）。
<!-- /prose:notes -->
