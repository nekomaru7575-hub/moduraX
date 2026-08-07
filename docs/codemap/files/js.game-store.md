---
source: js/game-store.js
lines: 2012
exports: 24
imported_by: 13
api_sha: 64306f2c4d2d
prose_sha: 64306f2c4d2d
generated: 2026-08-07
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジックだけを持つ、DOM に一切依存しない単一のストア。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の全状態（コマ・パネル・チャット・シーン・バフ・ラウンド進行・音源）と、その遷移を担う `ImmutableStore` を持つ。DOM も window も参照しないためサーバー側（[[server.index]]）からも同じコードが使われ、クライアントとサーバーで状態の解釈がずれないようにしている。ID 生成・フェーズ階層・バフの失効判定などの純粋関数もここに集まっている。
<!-- /prose:role -->

## export（24）

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
| 192 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 211 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 214 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 219 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |
| 306 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 331 | fn | normalizeInfoEntries | `normalizeInfoEntries(infoEntries)` | 保存済み・読み込まれた情報（infoEntries）の形を整える。 |
| 433 | fn | listUnactedParticipants | `listUnactedParticipants(tokensState, round)` | まだこのラウンドで行動していない参加者を、イニシアチブの実効値の降順で返す。 |
| 441 | fn | pickNextActor | `pickNextActor(tokensState, round)` | 次に手番を得るコマ。 |
| 509 | class | ImmutableStore | `ImmutableStore` |  |
| 1931 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 1935 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 2011 | const | store | `store` |  |

## トップレベル関数・非export（22）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 88 | createInitialRoundState | `createInitialRoundState()` | 14 |
| 106 | normalizeRoundState | `normalizeRoundState(round)` | 27 |
| 145 | removeExpiredBuffs | `removeExpiredBuffs(tokensState, phase, onlyTokenId = null)` | 22 |
| 173 | resetPluginComponentsForPhase | `resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null)` | 13 |
| 227 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 |
| 232 | withMapEntry | `withMapEntry(map, key, value)` | 3 |
| 237 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 |
| 245 | freezePanelMap | `freezePanelMap(panels)` | 5 |
| 252 | withChatEntry | `withChatEntry(chatLogs, tabId, entry)` | 4 |
| 260 | withSystemLog | `withSystemLog(chatLogs, text)` | 3 |
| 266 | withParamFields | `withParamFields(params, paramId, fields)` | 5 |
| 274 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 |
| 283 | withoutParam | `withoutParam(params, paramId, label)` | 9 |
| 296 | normalizeAudience | `normalizeAudience(audience)` | 4 |
| 312 | definedFields | `definedFields(patch)` | 3 |
| 318 | buildInfoSection | `buildInfoSection({ id, label = '', body = '', audience = null })` | 1 |
| 368 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 1 |
| 377 | withNewUserParam | `withNewUserParam(params, def)` | 5 |
| 392 | applyPhaseEnd | `applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null)` | 26 |
| 420 | sortByInitiative | `sortByInitiative(tokensState, participantIds)` | 9 |
| 448 | initialStepForPhase | `initialStepForPhase(phase, useInitiativeProcess)` | 3 |
| 453 | joinTokenNames | `joinTokenNames(tokensState, ids)` | 3 |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.info-panel]], [[js.main]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[server.index]]

## 注意

<!-- prose:notes -->
状態を変えるアクションはすべて `ImmutableStore` のメソッド経由で、クラスの中にあるためトップレベル関数の表には出てこない。`dispatch` は 1000 行超あり、ローカルLLM（`num_ctx=8192`）には渡せない。
<!-- /prose:notes -->
