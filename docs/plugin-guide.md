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

最小の形は次のとおり（かつて `js/parameters/gcrest.js` がこの姿だったが、今はグランクレストの
実装が入っているので、見本としてはこの引用を読んでほしい）。

```js
// js/parameters/mysystem.js
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
| `diceDraft` | `spec` | 拡張判定UIに「ダイスドラフト」を出す宣言（[3.12](#312-拡張判定ui)） |
| `skillTableCheck` | `spec` | 拡張判定UIに「特技表判定」を出す宣言（[3.12](#312-拡張判定ui)） |

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

**シートの値を読む小道具**が `js/parameters/sheet-source.js` にある。自前で書き直さないこと。

| 関数 | 使いどころ |
|---|---|
| `sheetText(v)` | 文字列欄。未記入を空文字へそろえる |
| `sheetRichText(v)` | 効果のような書式付きの欄。HTMLの実体参照（`&amp;lt;炎熱&amp;gt;`）と `<br>` を元へ戻す。**この値を `innerHTML` へ渡さないこと**（渡すなら `js/html-escape.js` の `escapeHtml` を通す） |
| `assignSheetNumber(target, paramId, v)` | 数値欄。`"―"` や空欄は**キーごと生やさない**ので、既定値がそのまま残る |

**`valueOverrides` は数値しか通らない**（`js/store/handlers/characters.js` の
`IMPORT_CHARACTER_DATA`）。文字列を入れたいパラメータは `newParameters` に
`buildParameters` で組んで渡すこと。

一覧（`components`）は `{ name, note, fields: {...} }` の配列にして、**最後に必ず
`normalizeSkillList(SPEC, list)` を通す**。空名の行はそこで落ちるので、シートが返す
空の枠を自分で除いておかなくてよい。数値の欄は `type: 'number'` なら文字列のまま渡しても
数へ寄る。逆に `"12+3D"` のような式を保ちたい欄は `type: 'text'` にすること（number だと 0 へ潰れる）。

**冒頭で「自分のシートか」を判定すること。** 他システムのシートを読ませたときに
`null` を返さないと、黙って空のコマができる（`js/parameters/stella-knights.js` の
`looksLikeSheet`、`js/parameters/gcrest.js` の `looksLikeGcrestSheet`）。

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

### 3.12 拡張判定UI

**拡張判定UI**は、卓の最中にずっと出しておく判定用の浮動パネル（`js/check-panel.js`）。
盤外の右クリックメニューとヘッダーの「パネル表示」に「判定」という名前で出る。

パネルは1枚で、**その部屋のシステムが宣言した判定UIを出す**。器（パネルの枠・対象コマの
選択・注意書き）は Core が持ち、中身は「ビュー」が組む。プラグインは
**どのビューを使うかを、記述子のキーで宣言するだけ**。

| 記述子のキー | ビュー | 出るもの |
|---|---|---|
| `diceDraft` | `js/check-view/dice-draft-view.js` | 振った目を溜めてスキルへドラッグする（ドラクルージュ、銀剣のステラナイツ） |
| `skillTableCheck` | `js/check-view/skill-table-view.js` | 分野×出目の特技表を出し、マスを押すと振る（シノビガミ等サイコロ・フィクション系） |

どちらも宣言していないシステムでは、パネルは開けるが
「この部屋のシステムには拡張判定UIがありません」とだけ出る。
2つ宣言した場合は上の表の順で先に見つかったものが使われる（1システムに判定UIは1つ）。

> **対象のコマはパネルが選ぶ。** チャット欄の参照キャラクターと双方向に連動しているので、
> どちらで選び直しても指しているコマは常に1つ。ビューは `ctx.getToken()` で受け取るだけで、
> コマの選び方を知らなくてよい。

#### 判定UIを1つ足す

1. `js/check-view/` にビューを1本書く（契約は `js/check-view/index.js` の冒頭が正）
2. `js/check-view/index.js` の `CHECK_VIEW_FACTORIES` に1行足す
3. `js/parameters/registry.js` の `CHECK_VIEWS` に「記述子のどのキーを見るか」を1行足す
4. プラグインの記述子にその宣言を書く

ビューが実装するのは4つだけ。`id` / `title(spec)`（パネルの見出し） /
`renderKey(ctx)`（**参照比較**で描き直しの要否を決める材料） / `render(ctx)`。
器は `container` を消さないので、毎回組み直すか作り置きを使い回すかはビューが決める
（ダイスドラフトは毎回組み直し、特技表は入力欄のフォーカスを飛ばさないために使い回す）。

#### `diceDraft`

「振った目を1個ずつ取っておき、スキルへ割り当てて使う」システムのための宣言。
UI（ドラッグ・ダイスの絵）は Core 側の `js/check-view/dice-draft-view.js` が持ち、
**何が置けるか・いつ発動できるかだけをプラグインが決める**。

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

`kind: 'match'` で「このスキルはどの目でも置ける」を表したい場合は `anyValue` を足す。
`skill.fields[valueField]` がその値と一致するスキルだけ目を問わなくなる（数え方は一致型の
まま＝1個で1回）。印は選択肢の1つとして持たせる形で、ステラナイツは「0/7」を使っている。

```js
requirement: { kind: 'match', valueField: 'number', anyValue: '0/7' }
```

`skillSpec` を省くと「まだスキル一覧が無いシステム」として扱われ、プールに溜めるところまで動く。

**`kind: 'sum'` の目標値**は3通りに読む（`parseSumTarget`。全角はNFKCで寄せる）。

| 欄の値 | 読み方 | 判定値の決め方 |
|---|---|---|
| `7` | その値ちょうど | 決める余地なし（入力欄を出さない） |
| `3～12` | 範囲 | 範囲内の整数を使う人が入れる。未指定なら「今の合計で届く最大」 |
| `効果参照` など数字で読めない文字 | 使う人が決める | 1以上の整数を入れるまで使えない |

判定値はパネルのカードの入力欄（`evaluatePlacement` の戻り値 `targetInput` があれば出る）か
「行い使用(名前,9)」で渡す。効果が「判定値/3回」のように増えるシステムでも
**使用回数は常に1回**（`uses` を増やすと、その回数だけ発動のログと使用の記録が重なる）。

目標値をパラメータで増減させたい場合は、次の3つを `requirement` へ足す。

```js
requirement: {
  kind: 'sum', targetField: 'target',
  modifierParamId: 'DRACUROUGE:TB',  // この実効値（バフ込み）を目標値へ足す
  modifierLabel: 'TB',               // 状態の1行に出す呼び名（既定は「修正」）
  floor: DEED_TARGET_FLOOR           // 足した後の下限
}
```

修正は**判定値ではなく、届かせる合計の側に**足す（`3～12` で判定値9・修正−1なら、合計8で使える。
ログの判定値は9のまま）。使う人が入れた判定値にも同じく足す。実効値を読むのは
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

#### `skillTableCheck`

サイコロ・フィクション系の特技表（[6.2](#62-特技表jsparameterssaikoro-fiction)）を、
拡張判定UIのパネルへ出す宣言。表の描画も距離計算も判定の実行も共通側が持っているので、
ここに書くのは**このコマの表と状態をどう引くか**だけ。

```js
skillTableCheck: {
  label: '特技判定',                        // パネルの見出し
  componentKey: SKILL_TABLE_COMPONENT_KEY,  // 判定中に動く状態の保存先
  tableFor: (components) => skillTableSpecFor(components),   // createSkillTableSpec() の戻り値
  stateFor: (components) => readSkillTableState(components), // 正規化済みの状態
  runCheck: ({ cellId, token, dispatch, rollBCDice, getEffectiveParameterValue }) =>
    runSkillCheck({ /* 6.2 のとおり */ })
}
```

`tableFor` / `stateFor` を **spec ではなく関数**で受け取るのは、同じシステムでもコマによって
表が変わりうるため（シノビガミの PC とエネミーは生命力の持ち方が違う）。その出し分けは
プラグインの中に閉じたままにできる。

**判定と表の設定は出し先が分かれている。**

| 出し先 | 何ができるか |
|---|---|
| キャラクター更新ダイアログ（`showSkillTableBox`、`purpose: 'edit'`） | 特技の取得・ギャップ埋め・左右と上下のつながり・失われうる枠の**個数** |
| 拡張判定UIのパネル（`purpose: 'check'`） | 判定・判定の修正値・枠の**喪失**・マス1つの「使えない印」 |

判定は卓の最中に何度も使うので、モーダルの中に置かない。逆に、キャラクターを組むときにしか
触らない設定はパネルに出さない。**この境界を崩さないこと**（判定のたびに更新ダイアログを
開き直させないための分割）。

どちらの出し先も、状態は**書き込む直前に読み直してから**当てる（`buildSkillTableView` の
`readState` / `commit`）。両方を同時に開けるようになったので、開いた時点のスナップショットへ
当てて丸ごと書き戻すと、片方の変更がもう片方の次のトグルで消える。

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
// → 忍法の使用条件・回数上限の式に {AdB} と書ける
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

「名前と内容を持つデータを、コマごとに何件でも並べる」ための汎用実装。**同じモデルと
同じボックス**で3つの形を書ける。どれになるかは宣言に使う関数だけの違い。

| 形 | 宣言 | 使う場面 |
|---|---|---|
| **スキル** | `createSkillSpec()` | 取得して、条件と回数の制限のもとで使い、判定へ修正が乗る能力（DX3のエフェクト、シノビガミの忍法） |
| **一覧** | `createListSpec()` | 使う概念を持たない、書いておくだけのもの（ドラクルージュの逸話、シノビガミの背景） |
| **アイテム** | `createItemSpec()` | 個数を持ち、消費して減る持ち物（シノビガミの忍具） |

| ファイル | 役割 |
|---|---|
| `skill-model.js` | データモデル。`createSkillSpec()` / `createListSpec()` / `createItemSpec()` |
| `skill-box.js` | 一覧・編集の UI（`showSkillBox()`）。3つの形すべてを描く |
| `skill-use.js` | スキルの使用処理（`runSkillUse()`）。制限判定・バフ付与・回数記録・ログ |
| `item-use.js` | アイテムの使用と増減（`item.use` / `item.gain`） |
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

**フィールドの型**: `'text'`（既定） / `'number'` / `'select'` / `'toggle'` / `'checkbox'`。
`select` の `options` に `group` を付けると `<optgroup>` で畳まれる。
`toggle` は `select` と同じ `options` を取り、**押すたびに次の選択肢へ回るボタン**になる
（シノビガミの背景の「長所／短所」）。2択に限らず選択肢の数だけ回り、先頭以外を選んでいる
間は色が変わる。開かせるほどでもない少数の選択肢向け。

`checkbox` は真偽値（シノビガミの人物の「居所」「秘密」「奥義」）。

欄はどれも **`label` を小さな見出しとして自分の上に出す**（チェック欄だけは、その文言自体が
ラベルなので出さない）。`placeholder` は入力すると消えるため、見出しが無いと「この欄は何か」を
後から読めない。宣言する `label` は、その見出しに収まる短さにしておくこと。

**`availableWhen(fields)`**: その欄がそのスキルで意味を持つ条件。偽なら入力させず、式にも
コストにも数えない。ただし **保存値は消さない**（条件が戻ったときに入れ直させないため）。
既定では薄く出したまま押せなくなる。使う人のほうが少ない欄は `hideWhenUnavailable: true` を
足すと、条件を満たすまで場所ごと引っ込む（アリアンロッドの「追加コスト」を入れたときだけ
出るコスト種別・コスト値）。

**`filterOptions(option, fields)`**: `select` の選択肢を、同じ行の他の欄の値で絞る
（シノビガミの人物：属性が `＋` なら感情もプラス側の6つだけ）。今の値が絞り込みから外れたら
残った先頭へ寄る。**保存値の検証には効かない** — `normalizeSkill` は宣言された全選択肢を見る。
絞り込みを検証にも効かせると、属性を切り替えた瞬間に保存済みの感情が既定へ落ちてしまう。

**`onUse`（使用時に払うコスト）**: その欄の数値を、使用時にパラメータの**基礎値**へ足す。

```js
// 欄と支払い先が1対1（DX3の上昇侵蝕率）
{ key: 'encroach', label: '上昇侵蝕率', onUse: { addToParamId: 'DX3:corruption' } }

// 減算（アリアンロッドのMP消費）。入力するのは正の数のまま
{ key: 'mp', label: 'MP', type: 'number', onUse: { addToParamId: 'ARIANRHOD:MP', sign: -1 } }

// 支払い先を行ごとに選ばせる。paramIdを持つ別の欄のkeyを指す
{ key: 'costType', label: 'コスト種別', type: 'select', options: [
    { value: '', label: '（なし）' },
    { value: 'ARIANRHOD:Fate', label: 'フェイト' },
    { value: 'core:hp', label: 'HP' } ] },
{ key: 'costValue', label: 'コスト値', type: 'number',
  availableWhen: f => !!f.costType,
  onUse: { paramIdFromField: 'costType', sign: -1 } }
```

`paramIdFromField` を使うと、ログの呼び名は**選ばれた選択肢のラベル**になる（「コスト値: -2」
ではなく「フェイト: -2」）。支払いは `SET_PARAMETER` を通るので、**支払い先は `editable: true`
のパラメータに限ること**（`editable: false` は手入力のガードに弾かれて減らない）。
`availableWhen` が偽の欄は払わせない（保存値は残っているので、見ないと「その種類には
無いはずのコスト」を取ってしまう）。

**使わない仕組みは畳める**。既定は全部 `true` 相当なので、宣言しなければ今までどおり。

| 宣言 | 効果 |
|---|---|
| `periods: [{ key, label, fixedMax: 1 }]` | 上限をシステム側で固定し、利用者に触らせない（使用中のプラグインは今は無い。ドラクルージュの行いは複数回使える効果があるため、回数を数えない＝`periods` を宣言しない形にした）。**読み出しのたびに宣言値へ揃える**ので、保存済みデータや手で書き換えられた JSON でも上限は緩まない |
| `allowMods: false` | 「使用時の修正」を扱わない。**`modTargets` を空にするだけでは足りない**：ボックスの「その他のパラメータ」から全パラメータが選べてしまう。保存済みの修正も読み出しで捨てるので、画面に出ていない修正でバフが飛ぶこともない |
| `allowExpirePhase: false` | 「効果時間」を扱わない。修正を持たないスキルには意味が無い欄なので隠せる |
| `allowConditions: false` | 「使用条件」を扱わない。使用という概念を持たない一覧向け。保存済みの条件も読み出しで捨てるので、画面に出ていない条件で使用が止まることもない |
| `allowNote: false` | メモ欄（`note`）を出さない。行数が多くて1行を低く保ちたい一覧（シノビガミの人物）向け。保存する形は変えない（`note` は空文字で残る） |
| `logNote: true` | 使用ログに**効果（`note`）**を載せ、「修正値バフはありません」の断り書きを出さない。修正値をほとんど使わないシステム（ステラナイツのスキル、ドラクルージュの行い・逸話）向けで、卓が読みたいのは付かなかった修正よりその能力が何をするか。式が読めない等の `⚠` は消さない（あちらは入力の誤りの知らせなので） |
| `defaultSkills: [{ name, fields }]` | まだ1件も登録が無いコマへ配る初期の一覧（ステラナイツの出目1〜6）。「枠が最初から決まっていて、利用者は中身を埋めるだけ」というシステム向け。**`name` は必ず入れること**：空名は一覧から落とされるうえ、ダイスドラフトはスキル名をキーに置き場を持つので名無しが複数あると区別できない |
| `fixedRows: true` | 枠数を `defaultSkills` で決め打ちし、利用者に増やさせも減らさせもしない（グランクレストの誓いの3スロット）。ボックスは「＋追加」と「×」を出さず、読み出しでも件数を宣言どおりに揃えるので、手で書き換えたJSONを読ませても枠は増えない。**並びがそのまま枠**なので、名前を空にした行も落とさず位置を保ち、見出しだけ宣言の名前へ戻す。`defaultSkills` とセットで宣言すること（片方だけでは枠の数が決まらないので効かない） |

#### 名前と内容だけの一覧（`createListSpec`）

「使う・振る・修正が乗る」の無い、**ただ書いておく一覧**（ドラクルージュの逸話、シノビガミの
背景）はこちら。上の「畳める宣言」を4つ並べる代わりに書けるだけで、**データモデルもボックスも
同じ**。既にある一覧を後から移してもデータは変わらない。

```js
import { createListSpec } from './skill/skill-model.js';

const BACKGROUND_SPEC = createListSpec({
  id: 'shinobigami-background',
  noun: '背景',
  componentKey: 'background',
  fields: [                       // 拡張属性。無くてもよい（逸話は名前と内容だけ）
    { key: 'side', label: '長所／短所', type: 'toggle',
      options: [{ value: 'merit', label: '長所' }, { value: 'demerit', label: '短所' }] }
  ]
});
```

画面には**名前・宣言した欄・内容**しか出ない（回数制限も使用条件も修正値も節ごと出ない）。
`showSkillBox()` はそのまま使う。

> **入れ子や1件ごとの公開先が要るならこの枠組みでは書けない**。`normalizeSkill` が返す形が
> 決まっているため。シノビガミの奥義（奥義改造の入れ子＋公開先）が専用ボックスを持っているのは
> この理由（`js/parameters/shinobigami-ougi-box.js`）。

#### 個数を持つ持ち物（`createItemSpec`）

消費して減るもの。上の一覧に**個数**と**使用**を足しただけで、書き方も保存先も同じ。

```js
import { createItemSpec } from './skill/skill-model.js';

const TOOL_SPEC = createItemSpec({
  id: 'shinobigami-tool',
  noun: '忍具',
  componentKey: 'tools',
  // fields: [...] 拡張属性を持たせてもよい（無ければ名前・効果・個数だけ）
  defaultSkills: [{ name: '兵糧丸' }, { name: '神通丸' }, { name: '遁甲符' }]
});
```

プラグイン記述子へ `item: TOOL_SPEC` と書くと、**チャットコマンドが自動で生える**。
`diceDraft` の `dice.change` / `dice.add` と同じ配り方で、プラグイン側に書く処理は無い。

| コマンド | 動き |
|---|---|
| `item.use(名前)` | 個数を1減らし、Mainタブへ「（名前）を使用しました。（効果）」 |
| `item.gain(名前, n)` | 個数を `n` だけ増減（負数可）。変更後の個数をMainタブへ |

ボックス側には `[−] 個数 [＋]` と `[使用]` が出る。**この2つだけは押した時点で保存される**
（名前や効果の編集は今までどおり保存ボタンまで溜まる）。個数0のアイテムは使用できない。

「使用」ボタンは `item.use` と同じ `runItemUse()` を通る。一方 `＋` `−` はチャットへ流さない
（数え直しのたびに卓のログが埋まるため）。`item.gain` がログを残すのは、誰かが宣言して
打ったものだから。

> 使用ボタンを出すには `showSkillBox()` へ `getToken` と `dispatch` も渡すこと。
> 渡さなければ個数の増減だけができる。

#### 行ごとのボタン（`rowActions`）

「その行に対して何かする」ボタンを行の末尾へ置ける。**ボックスは何をするかを知らない**：
宣言したプラグインが `run` を書く。

```js
rowActions: [{
  key: 'emotionModifier',
  label: '感情修正',
  availableWhen: fields => fields.attitude !== 'none',   // 欄と同じ規則
  run: ({ skill, spec, context }) => {
    // skill … その行の今の入力値（保存待ちの編集も反映済み）
    // context … { getToken, dispatch, generateBuffId, findTokenByName }
  }
}]
```

`context` は `showSkillBox()` へ渡したものがそのまま届く。**部屋の外（コマ作成ツール）では
`findTokenByName` も `dispatch` も渡ってこない**ので、`run` の側で「部屋の中で実行してください」と
断ること。

> 他のコマを名前で引く `findTokenByName` は Core から渡ってくる（`js/board-data-driven.js` →
> `js/character-dialog.js` → `renderCharacterPanel`）。探し方はチャットの
> `バフ>対象コマ名(...)` と同じ完全一致。

#### 一覧の下の1行（`footerNote`）

「全部でいくつになったか」を一覧の下に出す（アリアンロッドの持ち物の重量合計）。

```js
footerNote: ({ skills, parameters }) => ({
  text: `携帯重量 ${sumItemWeight(skills)} ／ 重量上限 ${parameters['ARIANRHOD:loadMax']?.value ?? 0}`,
  warning: sumItemWeight(skills) > (parameters['ARIANRHOD:loadMax']?.value ?? 0)  // trueで赤字
})
```

**画面の今の値**（保存待ちの編集・個数の増減も反映済み）で毎回引き直される。同じ合計を
パラメータにも持たせたいなら、`computeDerivedParameters` から**同じ関数**を呼ぶこと
（別々に数えると、画面の数字と保存された値が食い違う）。

### 6.2 特技表（`js/parameters/saikoro-fiction/`）

サイコロ・フィクション系（シノビガミ、インセイン等）の「分野 × 出目」の表と、
そこから目標値を出す仕組み。

| ファイル | 役割 |
|---|---|
| `skill-table.js` | 表のモデルと距離計算（`createSkillTableSpec()`） |
| `skill-table-box.js` | 表の UI。`buildSkillTableView()` が DOM を組み、`showSkillTableBox()` がそれを `<dialog>` で包む |
| `skill-check.js` | 判定の実行（`runSkillCheck()`） |

特技名と分野の並び、BCDice のコマンド書式を渡すだけで、表の描画も距離計算も判定も動く。
「失われうる枠」（シノビガミの生命力、インセインの恐怖心）も `slots` で宣言できる。

表は2か所に出る。**設定**（取得・ギャップ・つながり・枠の個数）はキャラクター更新の
ダイアログ、**判定**（判定・修正値・枠の喪失・使えない印）は拡張判定UIのパネル
（[3.12](#312-拡張判定ui)）。どちらを出すかは `buildSkillTableView` の `purpose` で決まる。

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

コードマップ（`docs/codemap/`）は `node tools/codemap.mjs` で再生成できる。
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

1. この文書の [2 章](#2-最小のプラグインと登録手順) — 最小の記述子
2. `js/parameters/registry.js` — フックの一覧と、各フックの契約（JSDoc が正）
3. `js/parameters/shinobigami.js` — 共通フレームワークを一通り使っている実例
4. `js/parameters/dx3.js` — パラメータ定義が最も多い実例
5. `js/parameters/gcrest.js` — スキル枠組みを1つの一覧へまとめる（種別トグル）実例と、
   シートのJSONを読む実例（`importGcrestCharacterJson`）
6. `docs/codemap/INDEX.md` — 全ファイルの役割一覧

**迷ったら `registry.js` の JSDoc が正**。この文書と食い違っていたら、そちらを信じて
この文書のほうを直してほしい。
