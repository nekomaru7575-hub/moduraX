---
source: js/game-store.js
lines: 2984
exports: 32
imported_by: 14
api_sha: 05cb378aee84
prose_sha: 05cb378aee84
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

## export（32）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 65 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 69 | fn | generateTokenId | `generateTokenId()` |  |
| 76 | fn | generatePanelId | `generatePanelId()` |  |
| 83 | fn | generateCardId | `generateCardId()` |  |
| 90 | fn | generateDeckId | `generateDeckId()` |  |
| 97 | fn | generateBuffId | `generateBuffId()` |  |
| 104 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 111 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 117 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 121 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 125 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 133 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 143 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 292 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 299 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 355 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 372 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 376 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 379 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 384 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 482 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 498 | const | CARD_COLS | `CARD_COLS` | カードの大きさ（マス数）。 |
| 499 | const | CARD_ROWS | `CARD_ROWS` |  |
| 503 | const | DEFAULT_CARD_STACK_ORDER | `DEFAULT_CARD_STACK_ORDER` | カード・デッキの既定の重なり順。 |
| 671 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 834 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | プロットが同値（同じ値を出した相手がいる）のコマのid。 |
| 846 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 854 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 942 | class | ImmutableStore | `ImmutableStore` |  |
| 2877 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 2881 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 2983 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（61）

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
| 97 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 104 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 111 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 125 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 133 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 143 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 152 | createInitialRoundState | `createInitialRoundState()` | 24 |  |
| 180 | normalizeRoundState | `normalizeRoundState(round)` | 31 |  |
| 221 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 15 |  |
| 245 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 271 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 292 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 299 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 308 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 336 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 355 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 392 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 397 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 402 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 410 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 426 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 436 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 442 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 450 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 459 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 472 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 482 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 518 | clampCardText | `clampCardText(value, max)` | 3 |  |
| 523 | normalizeCardImage | `normalizeCardImage(image)` | 4 |  |
| 530 | normalizeCardFace | `normalizeCardFace(face)` | 8 |  |
| 540 | normalizeCardBack | `normalizeCardBack(back)` | 7 |  |
| 548 | normalizeSeenBy | `normalizeSeenBy(seenBy)` | 5 |  |
| 556 | buildCard | `buildCard({ id, face, back, x = 0, y = 0, faceUp = false, stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false, deckId = null, seenBy = [] })` | 19 |  |
| 577 | normalizeDeckCards | `normalizeDeckCards(cards)` | 16 |  |
| 594 | buildDeck | `buildDeck({ id, name = '', x = 0, y = 0, back = null, cards = [], stackOrder = DEFAULT_CARD_STACK_ORDER, locked = false })` | 17 |  |
| 614 | isNamedObjectEntry | `isNamedObjectEntry([id, value])` | 3 |  |
| 618 | normalizeCardMap | `normalizeCardMap(cards)` | 7 |  |
| 626 | normalizeDeckMap | `normalizeDeckMap(decks)` | 7 |  |
| 637 | findFreeCardSpot | `findFreeCardSpot(cards, x, y, gridSize)` | 12 |  |
| 652 | definedFields | `definedFields(patch)` | 3 |  |
| 658 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 671 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 708 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 717 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 732 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 760 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 774 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 780 | plotValueOf | `plotValueOf(round, tokenId)` | 4 |  |
| 796 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 834 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 8 | ✓ |
| 846 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 854 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 861 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 866 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 2881 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 101 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.deck-dialog]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。

reducer の中で乱数・時刻を使わないこと。同じアクションを各クライアントが再実行するため、結果が画面ごとにずれる。シャッフルの並び（SHUFFLE_DECK の order）も ID の採番も、発火側が作って payload に載せる約束になっている。受け取った並びが「今デッキにある札の並べ替えか」は reducer 側で必ず検証する。
<!-- /prose:notes -->
