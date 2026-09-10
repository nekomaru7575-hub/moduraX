---
source: js/game-store.js
lines: 456
exports: 4
imported_by: 17
api_sha: a787e28853cd
prose_sha: a787e28853cd
generated: 2026-09-10
tags: [codemap]
---

# js/game-store.js

<!-- prose:summary -->
状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の状態（コマ・パネル・カード／デッキ・チャット・情報・シーン・音楽・ラウンド進行）を1つのイミュータブルな木として持つ ImmutableStore と、その初期状態だけを持つ。DOM も window も触らないので、ブラウザとサーバー（[[server.index]]）が同じコードで同じ遷移を行える。アクションを受けて次の状態を確定する仕事そのものは [[js.store.handlers.index]] の表を引いて各ハンドラへ渡すだけで、このファイルには入っていない。case が使う道具（IDの採番・パラメータの差し替え・カードの形の整え・ラウンド進行の読み取り・チャットログへの追記）も js/store/ 配下にある。依存は一方向で、js/store/ の各モジュールは game-store.js を知らない。公開APIは分ける前と同じで、移した分はこのファイルが名指しで再exportしているため、import 元15ファイルはどれも `from './game-store.js'` のままでよい。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 141 | class | ImmutableStore | `ImmutableStore` |  |
| 320 | const | DEFAULT_BCDICE_SYSTEM | `DEFAULT_BCDICE_SYSTEM` |  |
| 324 | fn | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 新規部屋の初期状態を組み立てる。 |
| 455 | const | store | `store` |  |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 324 | createInitialGameState | `createInitialGameState({ name = '', activePlugin = null, bcdiceSystem = DEFAULT_BCDICE_SYSTEM } = {})` | 130 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.parameters.core]], [[js.parameters.registry]], [[js.store.audio]], [[js.store.buffs]], [[js.store.cards]], [[js.store.chat]], [[js.store.handlers.index]], [[js.store.ids]], [[js.store.images]], [[js.store.info]], [[js.store.panels]], [[js.store.params]], [[js.store.patch]], [[js.store.room]], [[js.store.round-state]], [[js.store.stamps]]
- imported by → [[js.audio-dialog]], [[js.audio-player]], [[js.board-data-driven]], [[js.buff-dialog]], [[js.character-builder]], [[js.host-persistence]], [[js.info-entry-dialog]], [[js.info-panel]], [[js.main]], [[js.net-host]], [[js.net-sync]], [[js.room-authority]], [[js.round-panel]], [[js.scene-dialog]], [[js.state-import]], [[js.token-library-dialog]], [[server.index]]

## 注意

<!-- prose:notes -->
アクションの実装を探すときは、まず [[js.store.handlers.index]] の TABLES を見てドメインを絞る（characters / buffs / round / room / participants / scenes / audio / chat / board / info の10枚）。アクション名が2つの表に跨っていたら、読み込んだ時点で例外になる。

ハンドラが受け取るのは prevState / payload / activePlugin / nextTokensState / commit だけ。commit を呼ぶのは高々1回で、何もしないときは commit を呼ばずに抜ける（状態を作り直さない＝無駄な再描画・同期・保存を起こさない）。この「何もしない」経路は test/game-store.test.js が dispatch 前後の**同一参照**で見張っている。

アクション名でテーブルを引くときは必ず [[js.store.patch]] の fieldPatchFor か、Object.create(null) の上に作った表を通すこと。素のオブジェクトリテラルだと action:'constructor' が Object そのものを返し、payload の全キーがコマへマージされて保存・配信まで通ってしまう。

プラグインへ渡すのは値と「事実」だけで、状態そのものは渡さない（[[js.store.round-state]] の buildDerivedContext がその例）。公開前のプロットのように見せてはいけない値は、渡す手前で落としてある。

reducer の中で乱数・時刻を使わないこと。同じアクションを各クライアントが再実行するため、結果が画面ごとにずれる。シャッフルの並び（SHUFFLE_DECK の order）も ID の採番も、発火側が作って payload に載せる約束になっている（プロットの枠 ID も同じで、generatePlotSlotId は [[js.round-panel]] 側から呼ぶ）。受け取った並びが「今デッキにある札の並べ替えか」は reducer 側で必ず検証する。

プロットまわりのアクション（ROUND_SET_PLOT・ROUND_ADD_PLOT_SLOT・ROUND_REMOVE_PLOT_SLOT・ROUND_SET_PLOT_SLOT_LABEL・ROUND_SET_PLOT_CHOICE）はどれもチャットログを足さない。伏せた値が漏れるのを防ぐためと、卓の邪魔をしないため。値がログに出るのは ROUND_ADVANCE_PHASE の一斉公開だけ。

情報（infoEntries）の区画は body と masks（伏せた語）を対で持ち、本文の目印 `{{n}}` と mask.id が対応する。[[js.store.info]] の buildInfoSection が両方を一緒に受け取って刈るので、片方だけを渡す更新を書かないこと（公開先だけを変えたつもりで伏せ字が全部消える）。伏せた語の中身は他の限定公開と同じく全クライアントへ配られていて、隠しているのは描画だけ（[[js.visibility]] の但し書きと同じ立場）。
<!-- /prose:notes -->
