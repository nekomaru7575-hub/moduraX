# プラグイン開発ガイド

もじゅらX（trpg-app）に **ゲームシステム固有の振る舞い** を足すための手引き。

このアプリの本体（以下 Core）は、コマ・パネル・チャット・シーン・バフ・ラウンド進行といった
「どのTRPGでも共通の器」だけを持っている。ダブルクロスの侵蝕率も、シノビガミの生命力も、
Core は一切知らない。**システム固有の知識はすべてプラグインに閉じ込める**、というのがこの設計の
唯一の約束であり、この文書はその書き方をまとめたもの。

- 対象読者: このリポジトリを初めて触るエンジニア
- 前提知識: 素の JavaScript（ES Modules）。フレームワークは使っていない
- ビルド無し。`js/` 以下の `.js` がそのままブラウザへ配信される

---

## 目次

1. [全体像](#1-全体像)
2. [最小のプラグインと登録手順](#2-最小のプラグインと登録手順)
3. [プラグイン記述子のフック一覧](#3-プラグイン記述子のフック一覧)
4. [パラメータ](#4-パラメータ)
5. [components（プラグイン専用データ）](#5-componentsプラグイン専用データ)
6. [使える共通フレームワーク](#6-使える共通フレームワーク)
7. [dispatch できるアクション](#7-dispatch-できるアクション)
8. [守ってほしい制約](#8-守ってほしい制約)
9. [動作確認のしかた](#9-動作確認のしかた)
10. [よくある落とし穴](#10-よくある落とし穴)

---

## 1. 全体像

```
                        ┌─────────────────────────────┐
  ブラウザ / サーバー ──▶│  js/game-store.js           │  状態遷移（唯一の真実）
                        │  DOM を触らない純粋モジュール │
                        └──────────────┬──────────────┘
                                       │ 「解釈しない値」を渡すだけ
                        ┌──────────────▼──────────────┐
                        │  js/parameters/registry.js  │  プラグインの登録簿
                        └──────────────┬──────────────┘
                                       │
                   ┌───────────────────┼───────────────────┐
                   ▼                   ▼                   ▼
             dx3.js              shinobigami.js       あなたの新しい
          （ダブルクロス）        （シノビガミ）         プラグイン
```

Core とプラグインの境界には、一貫した原則がある。

> **Core は値を運ぶが、意味は解釈しない。**

たとえば `components`（プラグイン専用のデータ置き場）や、バフに添える `meta` の中身を Core は
一切見ない。ただ保存し、同期し、プラグインへ返すだけ。だからプラグインは、Core を改造せずに
自分のシステムのデータ構造を自由に決められる。

逆に言うと、**Core 側に「このシステムなら〜」という分岐を書き足すのは最後の手段**。まずは既存の
フックと共通フレームワークで表現できないか探してほしい。

### 状態が同期される仕組み（先に知っておくこと）

部屋の状態は 1 つのイミュータブルな木で、`dispatch(action, payload)` でしか変わらない。
同じ `js/game-store.js` を **ブラウザとサーバーの両方が動かす**。ブラウザが dispatch すると
WebSocket でサーバーへ送られ、サーバーが同じ遷移を行って全員へ配り直す。

この結果、次の 2 点がプラグインの書き方を強く縛る。

- **プラグインの入口ファイルは Node でも読み込める必要がある**（→ [8. 制約](#8-守ってほしい制約)）
- **状態に入れた値は全員に配られる**。秘匿したい値の扱いは [10. 落とし穴](#10-よくある落とし穴) を参照

---

## 2. 最小のプラグインと登録手順

プラグインは **ただのオブジェクト**（プラグイン記述子）。クラスも継承も無い。

`js/parameters/gcrest.js` が最小の見本になっている。

```js
// js/parameters/gcrest.js
import { buildParameters } from './paramFactory.js';

export const GCREST_ROOM_PARAMETERS = [
  { key: 'chaosLevel', label: '混沌レベル', value: 0 }
];

export function buildGcrestRoomParameters() {
  return buildParameters('GCREST', GCREST_ROOM_PARAMETERS);
}

export const GCREST_PLUGIN = {
  id: 'GCREST',            // 必須。registry のキーと一致させる
  label: 'グランクレスト',   // 必須。ルーム設定のプルダウンに出る名前
  buildRoomParameters: buildGcrestRoomParameters
};
```

必須なのは `id` と `label` の 2 つだけ。あとは実装したいフックを足していく。

### 登録

`js/parameters/registry.js` の 2 か所に足す。

```js
import { GCREST_PLUGIN } from './gcrest.js';

const PLUGINS = {
  DX3: DX3_PLUGIN,
  SHINOBIGAMI: SHINOBIGAMI_PLUGIN,
  GCREST: GCREST_PLUGIN,   // ← 足す。キーは記述子の id と同じ文字列にすること
};
```

これだけで、ルーム設定のシステム選択に現れる。Core 側に他の変更は要らない。

---

## 3. プラグイン記述子のフック一覧

すべて **任意**（`id` / `label` を除く）。実装しなければ Core が既定動作にフォールバックする。

| キー | 型 | 何をするか |
|---|---|---|
| `id` | `string` | **必須。** registry のキーと一致させる。paramId の接頭辞にもなる |
| `label` | `string` | **必須。** 画面に出るシステム名 |
| `buildCharacterParameters` | `() => Record<paramId, param>` | コマ作成時に配るパラメータ |
| `buildRoomParameters` | `() => Record<paramId, param>` | 部屋に 1 つだけ持つパラメータ（混沌レベル等） |
| `computeDerivedParameters` | `(parameters, components, context) => Record<paramId, number>` | 自動計算。**差分だけ**返す |
| `computeDerivedRoomParameters` | `(roomParameters, context) => Record<paramId, number>` | ルーム変数の自動計算（[3.10](#310-computederivedroomparametersroomparameters-context)） |
| `renderCharacterPanel` | `(context) => ({ getValues })` | コマ作成/更新ダイアログの専用スペースを描く |
| `importCharacterJson` | `(json) => result` | 外部キャラシートツールの JSON を読む |
| `characterSheetSource` | `{ label, origin, ... }` | シートのURLから取り込める置き場の宣言（[3.8.1](#381-charactersheetsource)） |
| `handleChatCommand` | `(rawInput, context) => boolean` | 独自のチャットコマンドを実行する |
| `looksLikeOwnChatCommand` | `(rawInput) => boolean` | 「これは自分のコマンドの書式だ」の判定 |
| `resetComponentsOnPhaseEnd` | `(components, phase) => components` | シーン/ラウンド終了時に使用回数などを戻す |
| `buildRoundPhaseTemplate` | `() => phase[]` | ラウンド進行のフェーズ構成 |
| `applyRoundPhaseStart` | `(phase, context) => ({ changes, logText })` | 段に入るときにパラメータを動かす（[3.6.1](#361-applyroundphasestartphase-context)） |
| `buffFields` | `{ render, parseExtra, describe }` | バフに独自の追加情報を持たせる |
| `stamps` | `{ id, label, file }[]` | そのシステム用のスタンプを足す |
| `bcdiceSystem` | `string` | このシステムを選んだときの BCDice のシステムID（[3.11](#311-bcdicesystem)） |
| `diceDraft` | `spec` | 振った目をスキルへ割り当てて使う仕組みの宣言（[3.12](#312-dicedraft)） |

以下、それぞれの詳細。

---

### 3.1 `buildCharacterParameters()` / `buildRoomParameters()`

`paramFactory.js` の `buildParameters(source, definitions, defaults?)` を必ず通す。
戻り値は凍結済みなので、そのまま返してよい。

```js
import { buildParameters } from './paramFactory.js';

const MY_PARAMETERS = [
  { key: 'hp',    label: '体力', value: 10 },
  { key: 'power', label: '攻撃力({P})', value: 0, locked: true, editable: false, visible: false }
];

function buildMyCharacterParameters() {
  return buildParameters('MYSYSTEM', MY_PARAMETERS);
}
```

パラメータの詳しい意味は [4. パラメータ](#4-パラメータ) を参照。

---

### 3.2 `computeDerivedParameters(parameters, components, context)`

他の値から自動的に決まるパラメータを計算する。**変えたいものだけ** `{ paramId: 数値 }` で返す。
返さなかった paramId はそのまま。存在しない paramId を返しても無視される。

```js
function computeMyDerivedParameters(parameters, components = {}, context = {}) {
  const power = parameters['MYSYSTEM:power']?.value ?? 0;
  return {
    'MYSYSTEM:attack': power * 2
  };
}
```

**引数**

| 引数 | 中身 |
|---|---|
| `parameters` | そのコマの全パラメータ（`{ paramId: {key,label,value,...} }`）。**基礎値**であり、バフは乗っていない |
| `components` | そのコマの `components`（[5 章](#5-componentsプラグイン専用データ)） |
| `context` | コマの外から決まる事実（下表） |

`context` の中身:

```js
{
  tokenId: string | null,
  roundActive: boolean,      // ラウンド進行中か
  roundNumber: number,       // 何ラウンド目か。進行していなければ 0
  plotValue: number | null,  // そのコマが出したプロット値。未提出・非公開なら null
  plotsRevealed: boolean     // プロットが公開済みか
}
```

**呼ばれるタイミング**: コマ作成時、パラメータ変更時、`components` 変更時、コマ JSON 読み込み時、
システム切り替え時、そしてラウンド進行が動いたとき（プロット公開・ラウンド終了）。

> **注意**: `parameters` の値はバフを含まない基礎値。バフ込みの実効値が要る計算はここではできない。
> 実効値が必要な処理（判定コマンドの組み立て等）は、`getEffectiveParameterValue` を受け取れる
> 別のフック側で行う。

---

### 3.3 `renderCharacterPanel(context)`

コマ作成/更新ダイアログの右側に、そのシステム専用の UI を描く。Core は `container` を渡すだけで、
中身の構成もデザインも一切干渉しない。

```js
function renderMyCharacterPanel({ container, mode, canEdit, components, onComponentChange, getComponents, getToken, dispatch }) {
  container.innerHTML = '';

  // 新規作成時はまだコマが無いので components を保存できない
  if (mode !== 'edit' || !onComponentChange) {
    container.textContent = 'コマを作成したあとで編集できます。';
    return { getValues: () => ({}) };
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dialog-add-row-btn';
  btn.textContent = '独自ボックスを開く';
  btn.addEventListener('click', () => { /* 自前のダイアログを開く */ });
  container.appendChild(btn);

  // ダイアログの submit 時に呼ばれる。{paramId: value} を返すと反映される
  return { getValues: () => ({}) };
}
```

**受け取れる context**

| キー | 説明 |
|---|---|
| `container` | 描画先の `<div>`。中身は自由 |
| `mode` | `'create'` \| `'edit'`。コマが既に存在するか |
| `canEdit` | この人が書き換えてよいか。**`false` は他人のコマを閲覧中** |
| `parameters` | 現在のパラメータ |
| `components` | 開いた時点の components（スナップショット） |
| `getComponents()` | **最新の** components を読む。ダイアログを開いたまま複数回編集するならこちら |
| `onComponentChange(key, value)` | components を保存する（即座に全員へ同期される） |
| `getToken()` | 最新のコマ本体 |
| `getEffectiveParameterValue(token, paramId)` | 基礎値＋バフの実効値 |
| `generateBuffId()` | バフ用の ID を発行 |
| `dispatch(action, payload)` | 状態を変える |
| `rollBCDice(system, command)` | ダイスを振る |
| `tokenId` | コマの ID |
| `participants` | 参加者一覧 `{ [id]: {id, nickname, isGm} }` |
| `myParticipantId` | 開いている人の参加者 ID。**表示名未設定なら `null`** |

> `canEdit: false` のときに何を止めるかは **プラグインの判断**。Core はこの列をまとめて
> 無効化しない（「ボックスを開いて眺める」だけは許したい、という場面があるため）。

`participants` / `myParticipantId` は、**公開先（audience）を持つデータ**を扱うときに使う
（シノビガミの奥義）。プラグインから `js/game-store.js` は読めない（循環 import）ので、
参加者一覧は Core から渡す。判定は `canView()`（`js/visibility.js`）に通すこと。

> **見えない行を消さないこと。** 公開先で隠した行を画面に出さないまま一覧を保存すると、
> 他人のデータが消える（GM や持ち主なしのコマは他人のコマも編集できる）。
> 隠した行は元の位置に取り置いて、保存時に混ぜ直す
> （`js/parameters/shinobigami-ougi-box.js` の `showOugiBox` が実例）。

---

### 3.4 `handleChatCommand(rawInput, context)` / `looksLikeOwnChatCommand(rawInput)`

チャット欄に打たれた文字列を、独自コマンドとして解釈する。

```js
const MY_COMMAND = /^必殺技\((.+)\)$/;

function looksLikeMyChatCommand(rawInput) {
  return MY_COMMAND.test(rawInput);
}

function handleMyChatCommand(rawInput, { token, dispatch, getEffectiveParameterValue, generateBuffId, rollBCDice }) {
  const match = rawInput.match(MY_COMMAND);
  if (!match) return false;   // 自分のコマンドではない → Core が次の解釈へ回す

  // 書式が合った時点で必ず true を返すこと。
  // false を返すと Core が「ただのダイスコマンド」として再解釈してしまう。
  if (!token) {
    alert('参照キャラクターを選択してください。');
    return true;
  }
  /* ... 実行 ... */
  return true;
}
```

**受け取れる context**

| キー | 説明 |
|---|---|
| `token` | 参照キャラクター。**選ばれていなければ `null`** |
| `dispatch(action, payload)` | 状態を変える |
| `getEffectiveParameterValue(token, paramId)` | 基礎値＋バフの実効値 |
| `generateBuffId()` | バフ用の ID を発行 |
| `rollBCDice(system, command)` | ダイスを振る。部屋の外（コマ作成ツール等）では `null` |
| `roomParameters` | 部屋のルーム変数（Core の `core:round` ＝現在のラウンド、プラグインの自動計算値）。コマ 1 体では決まらない値をコマンドから読むために渡される |
| `myParticipantId` | コマンドを打った人の参加者 ID（表示名未設定なら `null`）。公開先を持つデータをコマンドから扱うときに使う（シノビガミの `奥義使用(...)`） |

**戻り値の意味**

- `true` … このプラグインが処理した。Core はそれ以上何もしない
- `false` … 自分のコマンドではない。Core が通常のダイスロール等として扱う

`looksLikeOwnChatCommand` は、**そのプラグインが適用されていない部屋** でコマンドが打たれた
ときに「それは別システムのコマンドです」と案内するためだけに使う。副作用を持たせないこと。

---

### 3.5 `resetComponentsOnPhaseEnd(components, phase)`

シーンやラウンドが終わったときに、使用回数などを戻す。変化が無ければ **同じ参照を返す**
（Core が差分検知に使うため）。

```js
function resetMyComponentsOnPhaseEnd(components, phase) {
  if (phase !== 'scene') return components;
  const next = /* ... */;
  return next === components['myKey'] ? components : { ...components, myKey: next };
}
```

`phase` は `'scenario' | 'scene' | 'round' | 'process' | 'check'` のいずれか。
入れ子（シナリオ終了はシーン終了も兼ねる）は Core が 1 段ずつ呼び分けるので、
**渡されたフェーズだけを見ればよい**。

---

### 3.6 `buildRoundPhaseTemplate()`

ラウンド進行のフェーズ構成を宣言する。実装しなければ Core 既定
（セットアップ／キャラクター行動／クリンナップ）が使われる。

```js
function buildMyRoundPhaseTemplate() {
  return [
    { id: 'plot',   label: 'プロット', kind: 'plot', plot: { min: 1, max: 6 } },
    { id: 'action', label: '手番',     kind: 'perCharacter', turnOrder: 'plot' },
    { id: 'end',    label: 'ラウンド終了', kind: 'once', expirePhaseOnComplete: 'round' }
  ];
}
```

**フェーズ 1 件のキー**

| キー | 説明 |
|---|---|
| `id` / `label` | 識別子と表示名 |
| `kind` | `'once'`（1回きり） \| `'perCharacter'`（全員に手番） \| `'plot'`（伏せて出して一斉公開） |
| `expirePhaseOnComplete` | このフェーズを抜けるとき剥がすバフの期間（`'round'` 等）。`null` なら剥がさない |
| `preTurnStep` | 各手番の直前に挟む段（`perCharacter` のみ）。`{ id, label }` |
| `plot` | 出せる数字の範囲 `{ min, max }`（`kind: 'plot'` のみ） |
| `turnOrder` | 手番順の根拠（`perCharacter` のみ）。省略で `'initiative'`、`'plot'` ならプロット値の降順、`{ paramId, direction }` ならそのパラメータの実効値順 |

`kind: 'plot'` を使うと、伏せて提出 → 進行役が一斉公開 → 公開値で手番順、という流れが
Core 側だけで完結する。提出値は **公開されるまで他人の画面に出ない**。

#### パラメータで手番順を決める

```js
turnOrder: { paramId: 'DRACUROUGE:turnOrder', direction: 'asc' }   // directionは省略で'asc'
```

その数値が何を表すかを Core は知らない。**小さい順（`'desc'` なら大きい順）に並べるだけ**で、
意味は `computeDerivedParameters` で詰める。

**同値はイニシアチブ降順で解ける。** これを使うと、順位を粗く振るだけで
「この群はイニシアチブ順」を宣言なしに表現できる。ドラクルージュの手番がこれで、
PC は道ごとに 1〜8、NPC は全員 100 を持たせてある。1つの `perCharacter` の段のまま
「PC が道の順 → NPC がイニシアチブ順」になり、段を2つに割る必要が無い。

```js
// PC/NPCと道から、手番順の数値を1つ作る（値は他の値から導くだけなので editable:false）
function computeDracurougeDerivedParameters(parameters) {
  const order = readCharType(parameters) === 'NPC'
    ? 100                                              // PCの最大より必ず大きい値
    : (PATH_TURN_ORDER[parameters['DRACUROUGE:path']?.value] ?? 1);
  return { 'DRACUROUGE:turnOrder': order };
}
```

読むのは実効値（バフ込み）なので、`ADD_BUFF` で手番順を前後させることもできる。
そのパラメータを持たないコマは最後尾に回る（手番が消えるより軽い扱い）。

---

### 3.6.1 `applyRoundPhaseStart(phase, context)`

ラウンド進行が段に**入るとき**に、そのシステム固有のパラメータを動かす。
`resetComponentsOnPhaseEnd`（段の**終了**時の components）と対になるフック。

ドラクルージュのラウンドの頭の「喝采点+1・抗う力を2に戻す」がこれ。

```js
function applyDracurougeRoundPhaseStart(phase, { tokens, participants, roundNumber }) {
  if (phase.id !== 'setup') return null;   // 自分が仕掛けたい段だけを見る

  const changes = [];
  participants.forEach(tokenId => {
    const token = tokens[tokenId];
    if (!token || readCharType(token.parameters) === 'NPC') return;
    const applause = Number(token.parameters?.['DRACUROUGE:applause']?.value) || 0;
    changes.push({ tokenId, paramId: 'DRACUROUGE:applause', value: applause + 1 });
  });

  if (changes.length === 0) return null;   // 対象が居なければ黙る（ログだけ増やさない）
  return { changes, logText: '喝采点+1（…）。' };
}
```

| 受け取るもの | 中身 |
|---|---|
| `phase` | 入った段（テンプレートの1件そのまま） |
| `context.tokens` | 全コマ `{ [tokenId]: token }` |
| `context.participants` | そのラウンドの参加者の tokenId |
| `context.roundNumber` | 何ラウンド目か |

**返すのは基礎値。** `getEffectiveParameterValue` の結果を返すとバフの分が基礎値へ混入して
二重に効く。読むのも `token.parameters[paramId].value` にすること。

`editable: false` のパラメータも動かせる（`SET_PARAMETER` のガードは「利用者の手入力」を
止めるためのもので、プラグイン自身の宣言には掛からない）。

**ラウンド1の先頭の段でも走る**。以降のラウンドと同じ手当てが初回から入る。
一方、`ROUND_PROGRESSION_END`（進行の終了）では走らない。

---

### 3.7 `buffFields`

バフ/デバフに、そのシステム固有の付随データ（`meta`）を持たせたいときだけ実装する。
DX3 の「クリティカル値の下限」がこれ。

```js
buffFields: {
  render: ({ container, paramId }) => ({
    sync: (paramId) => { /* 対象パラメータが変わるたびに呼ばれる */ },
    getMeta: () => ({ myKey: 3 })   // ADD_BUFF の meta へそのまま載る
  }),
  parseExtra: (paramId, text) => ({ myKey: Number(text) }),  // バフ()コマンドの追加引数
  describe: (buff) => buff.meta?.myKey ? `下限${buff.meta.myKey}` : ''
}
```

`meta` の中身を Core は解釈しない。実効値の計算（`getEffectiveParameterValue`）も `delta` しか
見ないので、**meta は値に影響しない**。読むのはプラグイン自身。

---

### 3.8 `importCharacterJson(json)`

外部のキャラクターシートツール（ゆとシート等）の JSON を読み込む。

```js
function importMyCharacterJson(json) {
  return {
    name: json.base?.name,
    valueOverrides: { 'MYSYSTEM:hp': 20 },   // 既存パラメータの値を上書き
    labelOverrides: {},                       // 既存パラメータのラベルを上書き
    newParameters: {}                         // 新規に足すパラメータ
  };
}
```

実装しない場合は Core の汎用読み込み（`js/character-json-import.js`）が使われる。

---

### 3.8.1 `characterSheetSource`

「シートのURLを貼ると取り込める」ようにする宣言。URLを解釈して JSON を読むところは
`importCharacterJson` がそのまま使われるので、**どのURLを受け付けるかだけ**を書く。
システムによってシート置き場は違い、そもそも無いシステムもあるため、Core は住所を1つも持たない。

```js
characterSheetSource: {
  label: 'Webキャラクターシート（ドラクルージュ）',
  origin: 'https://character-sheets.appspot.com',  // プロトコル込みの完全一致
  pathPrefix: '/dracurouge/',                       // 同じサービスの他システムを掴まない
  keyParam: 'key',
  keyPattern: /^[A-Za-z0-9_-]{8,200}$/,
  fetchPath: (key) => `/dracurouge/display?ajax=1&key=${encodeURIComponent(key)}`,
  hint: '.../edit.html?key=... の形のURL'          // 入力欄に添える説明（任意）
}
```

**関数でURLを作るのはサーバーだけ。** 画面（`js/character-sheet-import.js`）は貼られたURLを
この宣言で検査して**キーだけ**を取り出し、`GET /api/character-sheet?plugin=...&key=...` を叩く。
サーバー（`server/index.js` の `handleCharacterSheet`）が同じ宣言を読んで `origin + fetchPath(key)`
を組み立て、そこへ取りに行く。画面からURLを渡せる作りにすると、そのAPIは「サーバーに任意の
宛先を取りに行かせる口」になってしまうため、**この形を崩さないこと**。

外部サービスへ出ていくので、サーバー側では回数制限（`RATE_LIMITS.sheet`）・タイムアウト・
応答サイズの上限・リダイレクト追跡の禁止も合わせて効いている。

---

### 3.9 `stamps`

スタンプ（盤面の右上に1分ほど出て消える合図。「スタンプ送信」パネルとチャットコマンド
`スタンプ(名前)` から撃つ）に、そのシステム用の絵柄を足す。**データだけを宣言する。**

```js
stamps: [
  { id: 'seed',   label: 'シード',   file: 'seed.png' },
  { id: 'brilliant', label: '輝*/', file: 'brilliant.png' }
]
```

| キー | 説明 |
|---|---|
| `id` | プラグイン内で一意な短い名前。公開IDは `` `${プラグインid}:${id}` `` になる |
| `label` | 画面に出る名前。チャットコマンドの引数にも使える |
| `file` | 画像のファイル名**だけ**（`/` や `..` を含めない） |

**画像の置き場は Core が決める**: `image/stamps/<プラグインid>/<file>`。
`STELLA_KNIGHTS` なら `image/stamps/STELLA_KNIGHTS/seed.png`。**フォルダ名は `id` と
一字一句同じにすること**（大文字のまま。Core は小文字化などの変換を一切しない）。
本番は Linux で大文字小文字を区別するのに対し、Windows は区別しない。ここがずれていると
**手元では正しく見えて本番だけ画像が出ない**、という見つけにくい壊れ方をする。
推奨は正方形・128px前後・
背景透過（拡張子は `.png` / `.svg` / `.webp` / `.gif`）。画像が無い間は、枠と `label` だけの
代わりの見た目で表示され、送信もできる（先に仕組みだけ確かめられる）。

パスをプラグインに書かせないのは、**「送受信するのはIDだけ。URLは受け取った側が組み立てる」**
というスタンプ全体の約束（`js/stamp-catalog.js` 冒頭）を、プラグイン経由で破らせないため。
同じ理由で、`stamps` に外部URLは書けない。

そのスタンプが使えるのは **そのプラグインが適用されている部屋だけ**。サーバーも部屋の
`activePlugin` を見て検証するので、別のシステムのスタンプIDを名指しで送っても弾かれる。
Core のスタンプ（`ok` / `!` 等）は常に使えるし、プラグインが同じ `id` を宣言しても
名前空間が違うので奪えない。

---

### 3.10 `computeDerivedRoomParameters(roomParameters, context)`

コマ1体では決まらず、**部屋全体から決まる**ルーム変数を計算する。`computeDerivedParameters`
のルーム変数版で、返すのは同じく**変えたいものだけ**の `{ paramId: 数値 }`。

ステラナイツの「ブーケ合計」（ブーケのスタンプが押された回数の全参加者ぶんの合計）がこれ。

```js
const BOUQUET_STAMP_ID = 'MYSYSTEM:bouquet';

buildRoomParameters: () => buildParameters('MYSYSTEM', [
  { key: 'bouquetTotal', label: 'ブーケ合計', value: 0, locked: true, editable: false }
]),

computeDerivedRoomParameters(parameters, context = {}) {
  const perParticipant = context.stampCounts?.[BOUQUET_STAMP_ID] ?? {};
  const total = Object.values(perParticipant)
    .reduce((sum, count) => sum + (Number.isInteger(count) && count > 0 ? count : 0), 0);
  return { 'MYSYSTEM:bouquetTotal': total };
}
```

**`context` の中身**（Core が解釈せず事実として渡すもの）:

| キー | 中身 |
|---|---|
| `stampCounts` | スタンプの集計 `{ [stampId]: { [participantId]: 枚数 } }`（[3.9](#39-stamps)） |

**呼ばれるタイミング**: スタンプの集計が動いたとき（送信・集計のリセット）、システムを
切り替えたとき、そして**状態を丸ごと読み込んだとき**（入室・再接続・部屋データの取り込み）。
最後のものがあるおかげで、この値は常に材料から導かれた結果になり、単独でズレたまま残らない。

> **受け皿は必ず `locked: true` にすること。** ルーム変数はシステムを適用した時にしか
> 組み立てられないため、後からプラグインへ足しても既存の部屋には存在しない。
> `locked: true` のものだけは Core が自動で補完する
> （`registry.js` の `withMissingPluginRoomParameters`）。**システムを選び直させないこと**：
> 選び直すと `room.parameters` ごと差し替わり、利用者が自分で追加したルーム変数まで消える。

ルーム変数はチャットで `{ブーケ合計}` のように参照できる（`key` でも `label` でも引ける）。

---

### 3.11 `bcdiceSystem`

ダイスコマンドの解釈規則（BCDice のシステム）は `room.bcdiceSystem` にあり、プラグインとは
**別軸のルーム設定**。だが「システムを選んだのにダイスだけ別システムのまま」になりやすいので、
既定をプラグインから宣言できるようにしてある。`stamps` と同じく **データだけを宣言する**。

```js
bcdiceSystem: 'StellarKnights'
```

ルーム設定でそのシステムを選んだとき（GM のみ）、BCDice のシステムも合わせて切り替わる
（`js/main.js` のプラグイン選択）。宣言しなければ今の設定のまま。
切り替えたあと GM が手で別のシステムを選ぶこともでき、そちらが優先される
（この宣言が効くのはプラグインを選び直した瞬間だけ）。

**IDは BCDice 側の表記と一字一句同じにすること**（`/api/bcdice/game_system` の一覧で確認できる）。
存在しないIDを書くと、その部屋のダイスロールが全部失敗する。

---

### 3.12 `diceDraft`

「振った目を1個ずつ取っておき、スキルへ割り当てて使う」システム（ドラクルージュ、
銀剣のステラナイツ）のための宣言。UI（浮動パネル・ドラッグ・ダイスの絵）は Core 側の
`js/dice-draft-panel.js` が持ち、**何が置けるか・いつ発動できるかだけをプラグインが決める**。

```js
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';

diceDraft: createDiceDraftSpec({
  id: 'mysystem-draft',
  label: '出目',                 // パネルの見出しとチャットログの発言種別
  diceSides: 6,                  // 振るダイスの面数（既定6）
  bcdiceSystem: 'MySystem',      // 振るときのシステムID（room.bcdiceSystemとは別軸）
  skillSpec: MY_SKILL_SPEC,      // 割り当て先の一覧（6.1のcreateSkillSpec）
  requirement: { kind: 'match', valueField: 'number' }
})
```

**`requirement` の2種類**

| kind | 宣言 | 置ける目 | 発動条件 | 使用回数 |
|---|---|---|---|---|
| `'match'` | `{ valueField }` | `skill.fields[valueField]` と同じ目だけ | 1個以上 | 置いた個数 |
| `'sum'` | `{ targetField }` | 制限なし | 合計 ≧ `skill.fields[targetField]` | 1回 |

`skillSpec` を省くと「まだスキル一覧が無いシステム」として扱われ、プールに溜めるところまで動く。

**`kind: 'sum'` の目標値**は数値のほか「`3～12`」と書ける。最小値の倍数（3・6・9・12）から
狙う値を選ぶ形になり、選択はパネルのセレクタか「行い使用(名前,9)」で行う。効果が
「判定値/3回」のように増えるシステムでも**使用回数は常に1回**（増やすと使用制限に自分でぶつかる）。

目標値をパラメータで増減させたい場合は、次の3つを `requirement` へ足す。

```js
requirement: {
  kind: 'sum', targetField: 'target',
  modifierParamId: 'DRACUROUGE:TB',  // この実効値（バフ込み）を目標値へ足す
  modifierLabel: 'TB',               // 状態の1行に出す呼び名（既定は「修正」）
  floor: DEED_TARGET_FLOOR           // 足した後の下限。潰れて重なった段階は1つにまとめる
}
```

段階のある目標値では**段階すべてに**足す（`3～12` に −1 なら 2・5・8・11）。実効値を読むのは
呼び出し側（`readTargetModifier`）で、`dice-draft-model.js` は store を触らない。
**修正がバフで動くシステムでは、パネルの再描画判定に `buffs` が入っているか確かめること**
（`ADD_BUFF` は `parameters` を書き換えないので、見ていないと表示が古いまま残る）。

`expiresCheckPhaseOnUse: true` を宣言すると、発動時にそのコマの「判定終了で消滅」バフを
剥がす（1回きりの修正を表現するため）。剥がすのは**評価と発動が終わった後**なので、
その修正はその発動には効く。

**一覧を切り替えたい**場合（ドラクルージュの幕）は `skillTabs` を宣言する。2つ以上あると
パネルに切り替えの帯が出て、既定は先頭。

```js
skillTabs: [
  { id: 'war',    label: '戦', field: 'kind', value: '戦' },  // その欄が一致するものだけ
  { id: 'common', label: '常', field: 'kind', value: '常' },
  { id: 'end',    label: '終' }                               // 指定なし＝すべて
]
```

絞るのは**見た目だけ**。外れたスキルに乗っているダイスはその場に残り、発動の規則も変わらない
（隠れている分は「ここに出ていない行いに N個 乗っています」と知らせる）。どの枠を見ているかは
状態に保存しない。**絞り込んだ一覧を `readDraft` の `knownSkillNames` へ渡してはいけない**：
隠れているスキルの下のダイスが行き場を失ったと見なされ、プールへ戻される。

**ダイスをプールへ入れる**のは `runDiceDraftRoll()`。チャットコマンドのハンドラから呼ぶ。
個数の検証・コマ未選択・ダイスを振れない画面の案内・演出・ログまで面倒を見るので、
プラグイン側は書式の判定だけをすればよい。

```js
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';

const ROLL_PATTERN = /^charge\((\d+)\)$/i;

function handleMyChatCommand(rawInput, { token, dispatch, rollBCDice }) {
  const match = String(rawInput).trim().match(ROLL_PATTERN);
  if (!match) return false;
  runDiceDraftRoll({ spec: MY_DRAFT_SPEC, token, dispatch, rollBCDice, count: Number(match[1]) });
  return true;   // 書式が合った時点で必ずtrue
}
```

**発動**（乗せたダイスを使ってスキルを使う）は `runDiceDraftUse()`。パネルの発動ボタンも
これを呼ぶので、チャットコマンドから呼べば **ボタンと完全に同じ規則で動く**。

```js
import { runDiceDraftUse } from './dice-draft/dice-draft-use.js';

const USE_PATTERN = buildSkillUseCommandPattern(MY_SKILL_SPEC);  // 「行い使用(名前)」

const match = input.match(USE_PATTERN);
if (match) {
  runDiceDraftUse({
    spec: MY_DRAFT_SPEC, skillName: match[1].trim(), token, dispatch,
    getEffectiveParameterValue, generateBuffId, chatCommand: input
  });
  return true;
}
```

中では `runSkillUse()`（[6.1](#61-スキル枠組みjsparametersskill)）を回数ぶん呼ぶので、
使用回数の記録・上限の判定・ログまで面倒を見てくれる。**上限で弾かれた回のダイスは減らない。**
`mode: 'one'` を渡すと1回ぶんだけ使う（一致型で1個だけ消費したいとき）。

プールは `token.components.diceDraft` に入る（`{ pool: [die], placements: { [スキル名]: [die] } }`、
`die` は `{ id, sides, value }`）。**ダイス1個は必ずプールかいずれか1つのスキルの下にだけ存在する**
という不変条件で組まれているので、直接書き換えず `dice-draft-model.js` の関数を通すこと。

> 3D ダイスの演出（`ROLL_DICE_ANIMATION`）は状態に載らないので、リロードしても
> 過去のロールが転がり直したりはしない。プールだけが残る。

**ドラフト導入前に「目ごとの個数」をパラメータで持っていた**場合は
`legacyCountParameters: [{ paramId, value }]` を宣言しておくと、値が残っているコマにだけ
パネルへ「プールへ移す」ボタンが出る（ステラナイツの `face1`〜`face6` がこれ）。

#### プールを振らずに動かす（`dice.change` / `dice.add`）

`diceDraft` を宣言すると、**プラグイン側に1行も書かずに**次の2つのコマンドが生える
（`registry.js` の `handlePluginChatCommand` が、プラグインの `handleChatCommand` より先に見る）。

```
dice.change(3>5)      プールにある3の目を1個、5の目へ変える
dice.change(3>5,2)    2個変える。そろっていなければ1個も変えない
dice.add(6)           6の目を1個プールへ足す
dice.add(6*3)         3個足す
```

触るのは**プールだけ**。スキルの下に乗っているダイスは対象外で、`kind: 'match'` の
「乗っている目＝対応する数字」という不変条件は崩れない。

目は **1〜99 の整数**で、面数（`diceSides`）では縛らない。振っては出ない目を能力で作る
システムがありうるためで、一致型で対応する数字が無ければ置けない＝プールに残るだけなので
壊れない（1〜6 以外はピップではなく数字で描かれる）。個数は 1 以上で、プールの上限に
入り切らない指定は先に弾く。

**同じ操作を自分のコマンドへ組み込む**なら `runDiceChange()` / `runDiceAdd()` を呼ぶ。
書式の解釈とは切り離してあるので、条件や対価だけを足せばよい。

```js
import { runDiceChange } from './dice-draft/dice-draft-pool.js';

const result = runDiceChange({
  spec: MY_DRAFT_SPEC, token, dispatch, from, to, count: 1,
  knownSkillNames, silent: true   // ログは自分で1行だけ出す
});
if (!result.ok) return true;   // 目が足りない。理由はrunDiceChangeが伝えている
```

**対価を取るなら、状態を1つも変えないうちに使えるかどうかを決め切ること。**
`runDiceChange` は個数がそろわなければ 1個も変えずに `ok: false` を返すので、
「先に残量を見る → 変える → 払う」の順にすれば、片方だけ進む壊れ方をしない
（ステラナイツの `プチラッキー(a>b)` がこの形）。

`silent: true` はログを出さない指定。1回の操作でログが2行進むと直前の結果が流れるので、
合成コマンドは自分で1行だけ出す。

---

## 4. パラメータ

### 形

```js
{ key, label, value, source, locked, editable, visible, roundOnly }
```

`paramId` は **`` `${source}:${key}` ``**。`source` はプラグインの `id`。
つまり `buildParameters('MYSYSTEM', [{ key: 'hp', ... }])` は `'MYSYSTEM:hp'` を作る。

### 4 つのフラグ

| フラグ | 既定 | `false`/`true` にすると |
|---|---|---|
| `locked` | `false` | `true` = ユーザーが削除できない。**かつ、既存のコマにも後から自動で補完される** |
| `editable` | `true` | `false` = 更新ダイアログで手入力できない（自動計算値向け） |
| `visible` | `true` | `false` = キャラクター一覧に出さない（内部レジスタ向け） |
| `roundOnly` | `false` | `true` = ラウンド進行中だけキャラクター一覧に出す（戦闘中しか意味を持たない値向け） |

> `roundOnly` と `visible` は AND。`visible: false` のものは戦闘中でも出ない。
> シノビガミの「コスト計」（そのラウンドに使った忍法コストの合計）がこれ。
> なお更新ダイアログの表示トグルは Core の既定パラメータ専用なので、プラグインの
> パラメータの表示/非表示をユーザーが切り替える手段は今のところ無い。

> **`locked: true` は後方互換の要**。パラメータはコマ作成時にしか配られないので、後からプラグインへ
> パラメータを足すと既存のコマには存在しない。`locked: true` のものだけは Core が自動で補完する
> （`registry.js` の `withMissingPluginParameters`）。**自動計算の受け皿は必ず `locked: true` にすること。**

### key を略称にすると式から引ける

`key` か `label` が一致すれば、共通フレームワークの式（`{名前}` 記法）と、チャットの
バフコマンドから参照できる。DX3 の `AdB`、シノビガミの `F` はこの狙いで短い key にしている。

```js
{ key: 'AdB', label: 'ダイス数修正(AdB)', value: 0, locked: true, editable: false, visible: false }
// → 忍法の修正式に {AdB} と書ける
```

### バフは `editable` を見ない

`editable: false` でも `ADD_BUFF` による加算は効く。「手入力はさせないが、能力の効果としては
増減する」という値をこれで表現する。

---

## 5. components（プラグイン専用データ）

パラメータ（数値 1 個）で表せないものは `token.components` に置く。
**Core は中身を一切解釈しない。** キーの名前も構造も自由。

```js
token.components = {
  skillTable: { acquired: [...], ... },   // シノビガミの特技表
  ninpou: [ {...}, {...} ],               // シノビガミの忍法
  effects: [ {...} ],                     // DX3 のエフェクト
}
```

**読み書き**

```js
// 読む（古いコマは components 自体を持たないので必ず既定値を用意する）
const list = components?.myKey ?? [];

// 書く（更新ダイアログの中から）
onComponentChange('myKey', nextValue);

// 書く（それ以外から）
dispatch('SET_COMPONENT', { id: tokenId, componentKey: 'myKey', value: nextValue });
```

`SET_COMPONENT` は保存後に `computeDerivedParameters` を自動で呼び直す。
「ボックスの中身から決まるパラメータ」（DX3 のロイス数、シノビガミの生命力）は
これで自動更新される。

> **保存済みデータは必ず正規化してから使うこと。** 古い形式・欠けたキー・不正な値が
> 混ざりうる（他人が JSON を編集して読み込ませることもできる）。
> 既存プラグインはどれも `normalize〜` 関数を必ず通している。

---

## 6. 使える共通フレームワーク

**新しく作る前に、ここを見てほしい。** 2 つのシステムから共通化したものが既にある。

### 6.1 スキル枠組み（`js/parameters/skill/`）

「キャラが取得して、条件と回数の制限のもとで使い、使うと判定へ修正が乗る能力」の汎用実装。
DX3 のエフェクトも、シノビガミの忍法も、これで書かれている。

| ファイル | 役割 |
|---|---|
| `skill-model.js` | データモデル。`createSkillSpec()` で宣言する |
| `skill-box.js` | 一覧・編集の UI（`showSkillBox()`） |
| `skill-use.js` | 使用処理（`runSkillUse()`）。制限判定・バフ付与・回数記録・ログを全部やる |
| `skill-formula.js` | 式（`{Lv}` `{AdB}` 等）の評価 |

宣言だけでひととおり動く。

```js
import { createSkillSpec } from './skill/skill-model.js';

const MY_SKILL_SPEC = createSkillSpec({
  id: 'my-skill',
  noun: '必殺技',                 // 「必殺技使用(名前)」のコマンドが自動で生える
  componentKey: 'mySkills',       // components のどのキーに保存するか
  fields: [
    { key: 'type', label: 'タイプ', type: 'select',
      options: [{ value: 'a', label: '攻撃' }, { value: 'b', label: '防御' }] },
    { key: 'range', label: '間合', type: 'number',
      availableWhen: f => f.type === 'a' },     // 条件付きの欄
    { key: 'lv', label: 'Lv', type: 'number', formulaName: 'Lv' }  // 式に {Lv} と書ける
  ],
  periods: [{ key: 'scene', label: 'シーン' }],  // 使用回数の期間
  modTargets: [                                  // 「使用時の修正」の対象
    { paramId: 'MYSYSTEM:AdB', label: 'ダイス数' }
  ]
});
```

**フィールドの型**: `'text'`（既定） / `'number'` / `'select'`。
`select` の `options` に `group` を付けると `<optgroup>` で畳まれる。

**`availableWhen(fields)`**: その欄がそのスキルで意味を持つ条件。偽なら入力させず、式にも
コストにも数えない。ただし **保存値は消さない**（条件が戻ったときに入れ直させないため）。

**使わない仕組みは畳める**。既定は全部 `true` 相当なので、宣言しなければ今までどおり。

| 宣言 | 効果 |
|---|---|
| `periods: [{ key, label, fixedMax: 1 }]` | 上限をシステム側で固定し、利用者に触らせない（ドラクルージュの行いは全て「ラウンド1回」）。**読み出しのたびに宣言値へ揃える**ので、保存済みデータや手で書き換えられた JSON でも上限は緩まない |
| `allowMods: false` | 「使用時の修正」を扱わない。**`modTargets` を空にするだけでは足りない**：ボックスの「その他のパラメータ」から全パラメータが選べてしまう。保存済みの修正も読み出しで捨てるので、画面に出ていない修正でバフが飛ぶこともない |
| `allowExpirePhase: false` | 「効果時間」を扱わない。修正を持たないスキルには意味が無い欄なので隠せる |
| `logNote: true` | 使用ログに**効果（`note`）**を載せ、「修正値バフはありません」の断り書きを出さない。修正値をほとんど使わないシステム（ステラナイツのスキル、ドラクルージュの行い・逸話）向けで、卓が読みたいのは付かなかった修正よりその能力が何をするか。式が読めない等の `⚠` は消さない（あちらは入力の誤りの知らせなので） |
| `defaultSkills: [{ name, fields }]` | まだ1件も登録が無いコマへ配る初期の一覧（ステラナイツの出目1〜6）。「枠が最初から決まっていて、利用者は中身を埋めるだけ」というシステム向け。**`name` は必ず入れること**：空名は一覧から落とされるうえ、ダイスドラフトはスキル名をキーに置き場を持つので名無しが複数あると区別できない |

### 6.2 特技表（`js/parameters/saikoro-fiction/`）

サイコロ・フィクション系（シノビガミ、インセイン等）の「分野 × 出目」の表と、
そこから目標値を出す仕組み。

| ファイル | 役割 |
|---|---|
| `skill-table.js` | 表のモデルと距離計算（`createSkillTableSpec()`） |
| `skill-table-box.js` | 表の UI（`showSkillTableBox()`） |
| `skill-check.js` | 判定の実行（`runSkillCheck()`） |

特技名と分野の並び、BCDice のコマンド書式を渡すだけで、表の描画も距離計算も判定も動く。
「失われうる枠」（シノビガミの生命力、インセインの恐怖心）も `slots` で宣言できる。

インセイン等を足す場合は、`shinobigami.js` をそのまま雛形にできる。

### 6.3 パラメータ生成（`js/parameters/paramFactory.js`）

`buildParameters(source, definitions, defaults?)` のみ。必ずこれを通すこと。

---

## 7. dispatch できるアクション

プラグインからよく使うもの。payload の形は `js/game-store.js` の該当 `case` が正。

| アクション | payload | 用途 |
|---|---|---|
| `ADD_BUFF` | `{ tokenId, id, name, paramId, delta, expirePhase, tag, meta }` | 修正値をバフとして付ける |
| `SET_PARAMETER` | `{ characterId, paramId, value }` | パラメータの**基礎値**を書き換える |
| `SET_COMPONENT` | `{ id, componentKey, value }` | components を保存する |
| `ADD_CHAT_MESSAGE` | `{ tabId: 'main', entry: {...} }` | チャットへ結果を流す |

盤面のカードとデッキを扱うものは別系統にある（`js/game-store.js` の「カード／デッキ」の節）。

| アクション | payload | 用途 |
|---|---|---|
| `ADD_DECK` | `{ id, name, x, y, back, cards: [{ id, face }] }` | デッキを盤面に置く。札の `id` は**呼び出し側で発番する** |
| `DRAW_CARDS` | `{ deckId, count, faceUp, gridSize }` | 上から n 枚引いて盤面へ出す。置き場所は reducer が決める |
| `SHUFFLE_DECK` | `{ id, order: [cardId...] }` | **並び替えた結果を渡す**（下記） |
| `SET_CARD_FACE_UP` | `{ id, faceUp }` | カードの公開・伏せ直し |
| `MARK_CARD_SEEN` | `{ id, participantId }` | 「カードを見る」で見た人を記録する |
| `ADD_CARD` / `REMOVE_CARD` / `MOVE_CARD` | `{ id, ... }` | デッキを介さず1枚だけ扱う |
| `SAVE_DECK_TEMPLATE` | `{ id, name, back, cards: [{ id, name, count, text, image }] }` | 作り置きのデッキ（`room.deckTemplates`）。同じ id で上書き |
| `REMOVE_DECK_TEMPLATE` | `{ id }` | 定義だけを消す（盤面に置いた山札は残る） |
| `RETURN_CARD_TO_DECK` | `{ cardId, deckId }` | 山の**一番下**へ戻す。出自（`card.deckId`）と違う山は受け付けない |
| `SET_PANEL_STOCKER` | `{ id, isStocker, ownerId, localUserId, gridSize }` | パネルをカードストッカーにする／やめる |
| `STORE_CARD_IN_STOCKER` / `TAKE_CARD_FROM_STOCKER` / `RELEASE_STOCKER_CARDS` | `{ ..., participantId, localUserId }` | ストッカーへの出し入れ |

**カードストッカー**は、カードを収納できるパネル（`panel.isStocker`）。入ったカードは
`card.stockerId` を持ち、盤面には描かれないが状態としては残る（コマの `inBackyard` と同じ扱い）。
所有者（`stockerOwnerId` / `stockerOwnerLocalId`）を設定した箱は、入れる・見る・取り出すが
その人だけに限られる。**箱が消える・箱でなくなる経路では必ず中身を盤面へ出す**こと
（`releaseStockerCards`）。出し忘れると、どこにも描かれず取り出す口も無いカードが残る。

カード1枚の見た目は `face = { image, text, info, color }`。`image` があれば画像、無ければ `text`（カード名）を `color` で描く。`info` はカード情報で、**表向きのときだけ**ツールチップと右クリックメニューに出る。

作り置きのデッキは「1行＝1種類＋枚数」で持ち、盤面に置くときに `expandDeckTemplate()`（`js/card-catalog.js`）で1枚ずつへ展開する。組み込みの簡易トランプも同じファイルにある。

> **reducer で乱数・時刻を使わないこと。** 同じアクションを各クライアントが再実行するので、
> `Math.random()` や `Date.now()` を reducer の中で呼ぶと画面ごとに結果がずれる。
> シャッフルの並びも札の ID も**発火側で作って payload に載せる**（`SHUFFLE_DECK` の
> `order` は「今デッキにある札の並べ替えか」を reducer 側で検証している）。

`expirePhase` は `'check' | 'process' | 'round' | 'scene' | 'scenario' | null`（null は手動で外すまで）。
入れ子は外側 → 内側で `scenario ⊃ scene ⊃ round ⊃ process ⊃ check`。外側が終了すると内側もまとめて剥がれる。

> **実効値を書き戻さないこと。** `SET_PARAMETER` が触るのは基礎値。
> `getEffectiveParameterValue()` の結果を書き戻すと、バフの分が基礎値へ混入して二重に効く。

---

## 8. 守ってほしい制約

### 8.1 プラグインの入口ファイルは Node で読み込めること

`server/index.js` → `game-store.js` → `registry.js` → **あなたのプラグイン** という import 連鎖がある。
サーバー（Node）でも読み込まれるので、**モジュールのトップレベルで `document` / `window` に
触れてはいけない**。

```js
// NG: 読み込んだ瞬間にサーバーが落ちる
const dialog = document.createElement('dialog');

// OK: 関数の中なら良い（サーバーではその関数が呼ばれない）
let dialogEl = null;
function ensureDialog() {
  if (!dialogEl) dialogEl = document.createElement('dialog');
  return dialogEl;
}
```

モデル層（データ構造・計算）と UI 層はファイルを分けるのが安全。既存プラグインもそうしている。

### 8.2 循環 import を作らない

`game-store.js` → `registry.js` → プラグイン、の向きが決まっている。
プラグインから `game-store.js` を import すると循環する。

必要な関数（`dispatch`、`getEffectiveParameterValue`、`generateBuffId` 等）は
**すべてフックの引数で渡される**ので、import せずに受け取ること。

### 8.3 状態はイミュータブル

既存のオブジェクトを書き換えず、新しいオブジェクトを返す。
「変化が無ければ同じ参照を返す」という約束も守ること（Core が差分検知に使っている）。

### 8.4 `eval` / `new Function` を使わない

コマや部屋のデータは JSON として他人から渡ってくる。文字列をそのまま実行してはいけない。
式を評価したいなら `skill-formula.js` を使う（数値と `+ - * / ( )` だけのトークナイザ）。

### 8.5 秘匿は「うっかり見えない」までしか保証されない

状態は全クライアントへ丸ごと配られる。画面で伏せている値も、開発者ツールからは読める。
**本当に見せたくない値を state に入れないこと。**

Core 側で対策済みの例として、ラウンド進行のプロットは、公開されるまで
`computeDerivedParameters` の `context.plotValue` に `null` で渡される。
プラグインが気を付けなくても、未公開の値がパラメータ経由で漏れないようにしてある。

---

## 9. 動作確認のしかた

**必ず検証用サーバーを使うこと。**

```bash
npm run dev
```

`server/dev-local.js` が起動し、`http://localhost:8082` で開く。
このモードは本番の Upstash Redis / Cloudflare R2 へ一切つながらず、
部屋のデータは `server/rooms/room-N.json`（gitignore 対象）だけを読み書きする。

> `npm start` は `.env` を読むため、本番の接続情報が設定されていると **本番の部屋を書き換える**。
> 検証のつもりで起動して事故が起きたことがあるので、必ず `npm run dev` を使う。

確認の流れ:

1. 部屋を開き、ルームメニュー（⋮）→ ルーム設定 → システムで自分のプラグインを選ぶ
2. コマを右クリック → キャラクター更新 → プラグイン専用スペースに自分の UI が出る
3. パラメータはキャラクター一覧（`visible: true` のもの）で確認する
4. チャットコマンドは、コマを選択してから打つ

**既存コマへのパラメータ補完** は、システムを切り替え直したときに走る。
`locked: true` を付け忘れていると補完されないので、ここで気付ける。

コードマップ（`docs/codemap/`）は `node .loop/codemap.mjs --sync-vault` で再生成できる。
ファイル構成を把握したいときはソースより先に `docs/codemap/INDEX.md` を読むと早い。

---

## 10. よくある落とし穴

**`computeDerivedParameters` で返した値が反映されない**
→ その `paramId` が存在しない。`buildCharacterParameters` に定義があるか、
既存コマなら `locked: true` で補完されているかを確認する。

**後から足したパラメータが既存のコマに無い**
→ `locked: true` を付ける。付けたうえでシステムを切り替え直すと補完される。

**`handleChatCommand` が効かず、ただのダイスロールになる**
→ 書式が合った時点で `true` を返しているか。エラーで抜けるときも `true` を返すこと。

**バフが二重に効く**
→ `getEffectiveParameterValue()` の結果を `SET_PARAMETER` で書き戻していないか。

**サーバーが起動しない / 部屋を開くと真っ白**
→ プラグインのトップレベルで DOM を触っていないか（[8.1](#81-プラグインの入口ファイルは-node-で読み込めること)）。

**保存したはずのデータが消える / 壊れたデータで落ちる**
→ 読むときに正規化していない。古い形式や欠けたキーは必ず来ると考えて書く。

**フェーズ終了でリセットされない**
→ `resetComponentsOnPhaseEnd` で、変化が無いときに同じ参照を返せているか。
毎回新しいオブジェクトを返すと差分検知が効かず、逆に返し忘れると更新が届かない。

---

## 参考: 読む順番

1. `js/parameters/gcrest.js` — 最小の記述子（16 行）
2. `js/parameters/registry.js` — フックの一覧と、各フックの契約（JSDoc が正）
3. `js/parameters/shinobigami.js` — 共通フレームワークを一通り使っている実例
4. `js/parameters/dx3.js` — パラメータ定義が最も多い実例
5. `docs/codemap/INDEX.md` — 全ファイルの役割一覧

**迷ったら `registry.js` の JSDoc が正**。この文書と食い違っていたら、そちらを信じて
この文書のほうを直してほしい。
