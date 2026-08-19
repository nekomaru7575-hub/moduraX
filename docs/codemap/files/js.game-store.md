---
source: js/game-store.js
lines: 3398
exports: 35
imported_by: 13
api_sha: bcb089e133d1
prose_sha: bcb089e133d1
generated: 2026-08-19
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の状態（コマ・パネル・カード／デッキ・チャット・情報・シーン・音楽・ラウンド進行）を1つのイミュータブルな木として持ち、dispatch されたアクションから次の状態を作る唯一の場所。DOM も window も触らないので、ブラウザとサーバー（[[server.index]]）が同じコードで同じ遷移を行える。バフの実効値計算、フェーズ終了の入れ子、ラウンドの手番順もここが持つ。チャットタブのうち Main と「システム」の2つは常に存在する固定タブで、その保証（withFixedChatTabs）と、事務連絡をシステムタブへ流す口（withSystemTabLog / withBgmLog）もここ。システム固有の解釈は一切せず、パラメータの自動計算やコンポーネントのリセットは [[js.parameters.registry]] 越しにプラグインへ委ねる。
<!-- /prose:role -->

## export（35）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 66 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 70 | fn | generateTokenId | `generateTokenId()` |  |
| 77 | fn | generatePanelId | `generatePanelId()` |  |
| 84 | fn | generateCardId | `generateCardId()` |  |
| 91 | fn | generateDeckId | `generateDeckId()` |  |
| 99 | fn | generateDeckTemplateId | `generateDeckTemplateId()` | デッキの定義（room.deckTemplates）のid。 |
| 106 | fn | generateBuffId | `generateBuffId()` |  |
| 113 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 120 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 126 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 130 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 134 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 142 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 152 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 301 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 308 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 364 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 380 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 390 | const | SYSTEM_CHAT_TAB_ID | `SYSTEM_CHAT_TAB_ID` | システム発言のうち「読み流してよい事務連絡」を集める固定タブ（withSystemTabLog参照）。 |
| 391 | const | SYSTEM_CHAT_TAB_NAME | `SYSTEM_CHAT_TAB_NAME` |  |
| 395 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 398 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 403 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 556 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 572 | const | CARD_COLS | `CARD_COLS` | カードの大きさ（マス数）。 |
| 573 | const | CARD_ROWS | `CARD_ROWS` |  |
| 577 | const | DEFAULT_CARD_STACK_ORDER | `DEFAULT_CARD_STACK_ORDER` | カード・デッキの既定の重なり順。 |
| 877 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 1040 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | プロットが同値（同じ値を出した相手がいる）のコマのid。 |
| 1052 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 1060 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 1148 | class | ImmutableStore | `ImmutableStore` |  |
| 3282 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 3286 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 3397 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（74）

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
| 113 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 120 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 134 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 142 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 152 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 161 | createInitialRoundState | `createInitialRoundState()` | 24 |  |
| 189 | normalizeRoundState | `normalizeRoundState(round)` | 31 |  |
| 230 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 15 |  |
| 254 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 280 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 301 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 308 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 317 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 345 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 364 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 411 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 416 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 421 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 429 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 441 | withFixedChatTabs | `withFixedChatTabs(chatTabs, chatLogs)` | 23 |  |
| 471 | withBgmLog | `withBgmLog(chatLogs, tracks, nextTrackId, time)` | 6 |  |
| 488 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 498 | withSystemLogIn | `withSystemLogIn(chatLogs, tabId, text, time)` | 3 |  |
| 504 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 510 | withSystemTabLog | `withSystemTabLog(chatLogs, text, time)` | 3 |  |
| 516 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 524 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 533 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 546 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 556 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 603 | clampCardText | `clampCardText(value, max)` | 3 |  |
| 608 | normalizeCardImage | `normalizeCardImage(image)` | 4 |  |
| 618 | normalizeCardFace | `normalizeCardFace(face)` | 9 |  |
| 629 | normalizeCardBack | `normalizeCardBack(back)` | 7 |  |
| 637 | normalizeSeenBy | `normalizeSeenBy(seenBy)` | 5 |  |
| 645 | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [], stockerId = null, stockerSeq = 0 })` | 26 |  |
| 673 | normalizeDeckCards | `normalizeDeckCards(cards)` | 16 |  |
| 690 | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` | 17 |  |
| 710 | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 3 |  |
| 714 | normalizeCardMap | `normalizeCardMap(cards)` | 7 |  |
| 724 | withoutLostStockerCards | `withoutLostStockerCards(cards, panels)` | 11 |  |
| 736 | normalizeDeckMap | `normalizeDeckMap(decks)` | 7 |  |
| 750 | buildDeckTemplateCard | `buildDeckTemplateCard(card, index)` | 11 |  |
| 762 | buildDeckTemplate | `buildDeckTemplate({ id, name = '', back = null, cards = [] })` | 9 |  |
| 772 | normalizeDeckTemplateMap | `normalizeDeckTemplateMap(templates)` | 7 |  |
| 783 | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 12 |  |
| 809 | stockerAllowsUser | `stockerAllowsUser(panel, participantId, localUserId)` | 6 |  |
| 817 | nextStockerSeq | `nextStockerSeq(cards)` | 3 |  |
| 822 | listStockerCards | `listStockerCards(cards, panelId)` | 5 |  |
| 837 | releaseStockerCards | `releaseStockerCards(cards, panel, gridSize)` | 18 |  |
| 858 | definedFields | `definedFields(patch)` | 3 |  |
| 864 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 877 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 914 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 923 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 938 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 966 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 980 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 986 | plotValueOf | `plotValueOf(round, tokenId)` | 4 |  |
| 1002 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 1040 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 8 | ✓ |
| 1052 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 1060 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 1067 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 1072 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 3286 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 110 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。

reducer の中で乱数・時刻を使わないこと。同じアクションを各クライアントが再実行するため、結果が画面ごとにずれる。シャッフルの並び（SHUFFLE_DECK の order）も ID の採番も、発火側が作って payload に載せる約束になっている。受け取った並びが「今デッキにある札の並べ替えか」は reducer 側で必ず検証する。
<!-- /prose:notes -->
