---
source: js/game-store.js
lines: 2563
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
| 39 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 43 | fn | generateTokenId | `generateTokenId()` |  |
| 50 | fn | generatePanelId | `generatePanelId()` |  |
| 57 | fn | generateBuffId | `generateBuffId()` |  |
| 64 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 71 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 77 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 81 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 85 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 93 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 103 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 252 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 259 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 315 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 332 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 336 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 339 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 344 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 442 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 467 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 630 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | プロットが同値（同じ値を出した相手がいる）のコマのid。 |
| 642 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 650 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 718 | class | ImmutableStore | `ImmutableStore` |  |
| 2464 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 2468 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 2562 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（46）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 30 | withDerivedRoomParameters | `withDerivedRoomParameters(room, stampCounts)` | 6 |  |
| 43 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 50 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 57 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 64 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 71 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 85 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 93 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 103 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 112 | createInitialRoundState | `createInitialRoundState()` | 24 |  |
| 140 | normalizeRoundState | `normalizeRoundState(round)` | 31 |  |
| 181 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 15 |  |
| 205 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 231 | applyRoundPhaseStart | `applyRoundPhaseStart(tokensState, activePlugin, phase, round)` | 18 |  |
| 252 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 259 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 268 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 296 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 315 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 352 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 357 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 362 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 370 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 386 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 396 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 402 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 410 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 419 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 432 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 442 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 448 | definedFields | `definedFields(patch)` | 3 |  |
| 454 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 467 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 504 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 513 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 528 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 556 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 570 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 576 | plotValueOf | `plotValueOf(round, tokenId)` | 4 |  |
| 592 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 35 |  |
| 630 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 8 | ✓ |
| 642 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 650 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 657 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 662 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 2468 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 93 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。
<!-- /prose:notes -->
