---
source: js/game-store.js
lines: 3297
exports: 33
imported_by: 13
api_sha: dcaf0e26b4d5
prose_sha: dcaf0e26b4d5
generated: 2026-08-18
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の状態（コマ・パネル・カード／デッキ・チャット・情報・シーン・音楽・ラウンド進行）を1つのイミュータブルな木として持ち、dispatch されたアクションから次の状態を作る唯一の場所。DOM も window も触らないので、ブラウザとサーバー（[[server.index]]）が同じコードで同じ遷移を行える。バフの実効値計算、フェーズ終了の入れ子、ラウンドの手番順もここが持つ。システム固有の解釈は一切せず、パラメータの自動計算やコンポーネントのリセットは [[js.parameters.registry]] 越しにプラグインへ委ねる。
<!-- /prose:role -->

## export（33）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 65 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 69 | fn | generateTokenId | `generateTokenId()` |  |
| 76 | fn | generatePanelId | `generatePanelId()` |  |
| 83 | fn | generateCardId | `generateCardId()` |  |
| 90 | fn | generateDeckId | `generateDeckId()` |  |
| 98 | fn | generateDeckTemplateId | `generateDeckTemplateId()` | デッキの定義（room.deckTemplates）のid。 |
| 105 | fn | generateBuffId | `generateBuffId()` |  |
| 112 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 119 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 125 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 129 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 133 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 141 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 151 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 300 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 307 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 363 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 380 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 384 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 387 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 392 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 490 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 506 | const | CARD_COLS | `CARD_COLS` | カードの大きさ（マス数）。 |
| 507 | const | CARD_ROWS | `CARD_ROWS` |  |
| 511 | const | DEFAULT_CARD_STACK_ORDER | `DEFAULT_CARD_STACK_ORDER` | カード・デッキの既定の重なり順。 |
| 811 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 974 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | プロットが同値（同じ値を出した相手がいる）のコマのid。 |
| 986 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 994 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 1082 | class | ImmutableStore | `ImmutableStore` |  |
| 3185 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 3189 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 3296 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（70）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | 9 |  |
| 52 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 10 |  |
| 69 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 76 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 83 | generateCardId | `generateCardId()` | 4 | ✓ |
| 90 | generateDeckId | `generateDeckId()` | 4 | ✓ |
| 98 | generateDeckTemplateId | `generateDeckTemplateId()` | 4 | ✓ |
| 105 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 112 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 119 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 133 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 141 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 151 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 160 | createInitialRoundState | `createInitialRoundState()` | 24 |  |
| 188 | normalizeRoundState | `normalizeRoundState(round)` | 31 |  |
| 229 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 15 |  |
| 253 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 279 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 300 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 307 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 316 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 344 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 363 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 400 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 405 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 410 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 418 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 434 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 444 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 450 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 458 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 467 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 480 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 490 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 537 | clampCardText | `clampCardText(value, max)` | 3 |  |
| 542 | normalizeCardImage | `normalizeCardImage(image)` | 4 |  |
| 552 | normalizeCardFace | `normalizeCardFace(face)` | 9 |  |
| 563 | normalizeCardBack | `normalizeCardBack(back)` | 7 |  |
| 571 | normalizeSeenBy | `normalizeSeenBy(seenBy)` | 5 |  |
| 579 | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [], stockerId = null, stockerSeq = 0 })` | 26 |  |
| 607 | normalizeDeckCards | `normalizeDeckCards(cards)` | 16 |  |
| 624 | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` | 17 |  |
| 644 | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 3 |  |
| 648 | normalizeCardMap | `normalizeCardMap(cards)` | 7 |  |
| 658 | withoutLostStockerCards | `withoutLostStockerCards(cards, panels)` | 11 |  |
| 670 | normalizeDeckMap | `normalizeDeckMap(decks)` | 7 |  |
| 684 | buildDeckTemplateCard | `buildDeckTemplateCard(card, index)` | 11 |  |
| 696 | buildDeckTemplate | `buildDeckTemplate({ id, name = '', back = null, cards = [] })` | 9 |  |
| 706 | normalizeDeckTemplateMap | `normalizeDeckTemplateMap(templates)` | 7 |  |
| 717 | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 12 |  |
| 743 | stockerAllowsUser | `stockerAllowsUser(panel, participantId, localUserId)` | 6 |  |
| 751 | nextStockerSeq | `nextStockerSeq(cards)` | 3 |  |
| 756 | listStockerCards | `listStockerCards(cards, panelId)` | 5 |  |
| 771 | releaseStockerCards | `releaseStockerCards(cards, panel, gridSize)` | 18 |  |
| 792 | definedFields | `definedFields(patch)` | 3 |  |
| 798 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 811 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 848 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 857 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 872 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 900 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 914 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 920 | plotValueOf | `plotValueOf(round, tokenId)` | 4 |  |
| 936 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 974 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 8 | ✓ |
| 986 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 994 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 1001 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 1006 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 3189 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 106 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。

reducer の中で乱数・時刻を使わないこと。同じアクションを各クライアントが再実行するため、結果が画面ごとにずれる。シャッフルの並び（SHUFFLE_DECK の order）も ID の採番も、発火側が作って payload に載せる約束になっている。受け取った並びが「今デッキにある札の並べ替えか」は reducer 側で必ず検証する。
<!-- /prose:notes -->
