---
source: js/game-store.js
lines: 2392
exports: 27
imported_by: 13
api_sha: 6e391a0717f7
prose_sha: 6e391a0717f7
generated: 2026-08-12
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
| 21 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 25 | fn | generateTokenId | `generateTokenId()` |  |
| 32 | fn | generatePanelId | `generatePanelId()` |  |
| 39 | fn | generateBuffId | `generateBuffId()` |  |
| 46 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 53 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 59 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 63 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 67 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 75 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 85 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 197 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 204 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 260 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 277 | const | MAIN_CHAT_TAB_ID | `MAIN_CHAT_TAB_ID` | 既定のチャットタブ。 |
| 281 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 284 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 289 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 387 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 412 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 553 | fn | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | プロットが同値（同じ値を出した相手がいる）のコマのid。 |
| 565 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、手番順で返す。 |
| 573 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 641 | class | ImmutableStore | `ImmutableStore` |  |
| 2297 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 2301 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 2391 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（44）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 25 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 32 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 39 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 46 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 53 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 67 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 75 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 85 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 94 | createInitialRoundState | `createInitialRoundState()` | 24 |  |
| 122 | normalizeRoundState | `normalizeRoundState(round)` | 31 |  |
| 163 | buildDerivedContext | `buildDerivedContext(round, tokenId)` | 10 |  |
| 182 | recomputeDerivedForRound | `recomputeDerivedForRound(tokensState, activePlugin, round)` | 12 |  |
| 197 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 204 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 213 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 241 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 260 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 297 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 302 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 307 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 315 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 331 | withChatEntry | `withChatEntry(chatLogs, tabId, entry, time)` | 5 |  |
| 341 | withSystemLog | `withSystemLog(chatLogs, text, time)` | 3 |  |
| 347 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 355 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 364 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 377 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 387 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 393 | definedFields | `definedFields(patch)` | 3 |  |
| 399 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 412 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 449 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 458 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 473 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 501 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 514 | turnOrderSourceOf | `turnOrderSourceOf(round)` | 4 |  |
| 520 | plotValueOf | `plotValueOf(round, tokenId)` | 4 |  |
| 535 | sortForTurnOrder | `sortForTurnOrder(tokensState, round, participantIds)` | 15 |  |
| 553 | listTiedPlotTokenIds | `listTiedPlotTokenIds(round)` | 8 | ✓ |
| 565 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 573 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 580 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 585 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 2301 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 89 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.stamp-registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
全アクションが1ファイルに並ぶので大きい。読むときは case 名で当たりを付ける。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。
<!-- /prose:notes -->
