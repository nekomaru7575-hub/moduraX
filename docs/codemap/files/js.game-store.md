---
source: js/game-store.js
lines: 2061
exports: 25
imported_by: 13
api_sha: fca7f731d89d
prose_sha: fca7f731d89d
generated: 2026-08-08
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（25）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | const | DEFAULT_TOKEN_COLOR | `DEFAULT_TOKEN_COLOR` |  |
| 19 | fn | generateTokenId | `generateTokenId()` |  |
| 26 | fn | generatePanelId | `generatePanelId()` |  |
| 33 | fn | generateBuffId | `generateBuffId()` |  |
| 40 | fn | generateInfoEntryId | `generateInfoEntryId()` |  |
| 47 | fn | generateInfoSectionId | `generateInfoSectionId()` |  |
| 53 | const | BUFF_PHASE_LABELS | `BUFF_PHASE_LABELS` | バフ/デバフの終了条件（フェーズ）のラベル。 |
| 57 | const | PHASE_HIERARCHY | `PHASE_HIERARCHY` | 終了フェーズの入れ子構造（外側→内側）。 |
| 61 | fn | getPhaseChain | `getPhaseChain(phase)` | 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。 |
| 69 | fn | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。 |
| 79 | fn | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 上の一覧を、判定結果などのログ本文へ足す1行にする。 |
| 136 | fn | usesInitiativeProcess | `usesInitiativeProcess(state)` | 「キャラクターの手番の前にイニシアチブプロセスを挟む」設定（ルーム単位・全員共通）。 |
| 143 | fn | showsEntryMessages | `showsEntryMessages(state)` | 入室したとき、既定のチャットタブへ「〈名前〉が入室しました。」を出すか（ルーム単位・全員共通）。 |
| 209 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 228 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 231 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 236 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 323 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 348 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 450 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、イニシアチブの実効値の降順で返す。 |
| 458 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 526 | class | ImmutableStore | `ImmutableStore` |  |
| 1977 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 1981 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 2060 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（39）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | generateTokenId | `generateTokenId()` | 4 | ✓ |
| 26 | generatePanelId | `generatePanelId()` | 4 | ✓ |
| 33 | generateBuffId | `generateBuffId()` | 4 | ✓ |
| 40 | generateInfoEntryId | `generateInfoEntryId()` | 4 | ✓ |
| 47 | generateInfoSectionId | `generateInfoSectionId()` | 4 | ✓ |
| 61 | getPhaseChain | `getPhaseChain(phase)` | 4 | ✓ |
| 69 | listExpiringBuffNames | `listExpiringBuffNames(token, phase)` | 6 | ✓ |
| 79 | formatExpiredBuffsNote | `formatExpiredBuffsNote(names, phase)` | 4 | ✓ |
| 88 | createInitialRoundState | `createInitialRoundState()` | 14 |  |
| 106 | normalizeRoundState | `normalizeRoundState(round)` | 27 |  |
| 136 | usesInitiativeProcess | `usesInitiativeProcess(state)` | 3 | ✓ |
| 143 | showsEntryMessages | `showsEntryMessages(state)` | 3 | ✓ |
| 150 | escapeForEntryMessage | `escapeForEntryMessage(text)` | 6 |  |
| 162 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |  |
| 190 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |  |
| 209 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 244 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |  |
| 249 | withMapEntry | `withMapEntry(map, key, value)` | 3 |  |
| 254 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |  |
| 262 | freezePanelMap | `freezePanelMap(panels)` | 5 |  |
| 269 | withChatEntry | `withChatEntry(chatLogs, tabId, entry)` | 4 |  |
| 277 | withSystemLog | `withSystemLog(chatLogs, text)` | 3 |  |
| 283 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |  |
| 291 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |  |
| 300 | withoutParam | `withoutParam(params, paramId, label)` | 9 |  |
| 313 | normalizeAudience | `normalizeAudience(audience)` | 4 |  |
| 323 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 329 | definedFields | `definedFields(patch)` | 3 |  |
| 335 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 8 |  |
| 348 | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 34 | ✓ |
| 385 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 |  |
| 394 | withNewUserParam | `withNewUserParam(params, def)` | 5 |  |
| 409 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |  |
| 437 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |  |
| 450 | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | 4 | ✓ |
| 458 | pickNextActor | `pickNextActor(tokensState, round)` | 4 | ✓ |
| 465 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |  |
| 470 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |  |
| 1981 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 78 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
