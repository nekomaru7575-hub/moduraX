---
source: js/game-store.js
lines: 2603
exports: 27
imported_by: 13
api_sha: 6e391a0717f7
prose_sha: 6e391a0717f7
generated: 2026-08-17
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の状態（コマ・パネル・チャット・情報・シーン・音楽・ラウンド進行）を1つのイミュータブルな木として持ち、dispatch されたアクションから次の状態を作る唯一の場所。DOM も window も触らないので、ブラウザとサーバー（[[server.index]]）が同じコードで同じ遷移を行える。バフの実効値計算、フェーズ終了の入れ子、ラウンドの手番順もここが持つ。システム固有の解釈は一切せず、パラメータの自動計算やコンポーネントのリセットは [[js.parameters.registry]] 越しにプラグインへ委ねる。
<!-- /prose:role -->

## export（27）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 65 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 69 | fn | generateTokenId | `generateTokenId()` |  |
| 76 | fn | generatePanelId | `generatePanelId()` |  |
| 83 | fn | generateBuffId | `generateBuffId()` |  |
| 90 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 97 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 103 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 107 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 111 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 119 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 129 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 278 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 285 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 341 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 358 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 362 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 365 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 370 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 468 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 493 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 656 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | プロットが同値（同じ値を出した相手がいる）のコマのid。 |
| 668 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 676 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 744 | class | ImmutableStore | `ImmutableStore` |  |
| 2501 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 2505 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 2602 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（47）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | withCoreRoomParameters | `withCoreRoomParameters(parameters, round)` | 9 |  |
| 52 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts, round)` | 10 |  |
| 69 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 76 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 83 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 90 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 97 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 111 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 119 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 129 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 138 | createInitialRoundState | `createInitialRoundState()` | 24 |  |
| 166 | normalizeRoundState | `normalizeRoundState(round)` | 31 |  |
| 207 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 15 |  |
| 231 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 257 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 278 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 285 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 294 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 322 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 341 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 378 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 383 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 388 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 396 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 412 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 422 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 428 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 436 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 445 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 458 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 468 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 474 | definedFields | `definedFields(patch)` | 3 |  |
| 480 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 493 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 530 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 539 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 554 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 582 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 596 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 602 | plotValueOf | `plotValueOf(round, tokenId)` | 4 |  |
| 618 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 656 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 8 | ✓ |
| 668 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 676 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 683 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 688 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 2505 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 96 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。
<!-- /prose:notes -->
