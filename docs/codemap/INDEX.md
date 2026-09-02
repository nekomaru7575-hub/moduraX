---
tags: [codemap, index]
generated: 2026-09-02
---

# trpg-app コードマップ

エージェントが**ソースを読まずに**構造を把握するためのインデックス。
`node tools/codemap.mjs` で生成される。表の内容を手で直しても次回の生成で消える。

## 使い方

- ノートのパスはソースパスから決まる: `js/parameters/dx3.js` → `docs/codemap/files/js.parameters.dx3.md`
  この表を読まずに直接 Read してよい。
- symbol の**説明はコード側のコメントが正**。説明を良くしたいときはコードのコメントを直す。
  コメントが無い symbol の説明だけノートに保存される。
- `## 役割` `## 注意` はノート側にのみ存在する。書き換えてよい（生成時に引き継がれる）。

## 全体

| ファイル | export | トップレベル関数 | 役割が未記入 | 散文が要更新 |
|---:|---:|---:|---:|---:|
| 150 | 673 | 1160 | 58 | 2 |

エントリポイント（誰からも import されない）: `js/character-builder.js`, `js/ice-probe.js`, `js/main.js`, `js/room-index.js`, `js/site-nav.js`, `server/dev-local.js`, `server/index.js`

## ファイル一覧

| ファイル | 紹介 | export | 被import |
|---|---|---:|---:|
| [[js.asset-base\|js/asset-base.js]] | 「このアプリが画面に出す絵のうち、リポジトリに置いていないもの」の置き場所を1か所で持つ。 | 4 | 3 |
| [[js.asset-store\|js/asset-store.js]] | P2P卓で使う、画像・音源の実体の置き場（IndexedDB）。中身のSHA-256を名前にし、状態には /asset/<hash> の参照だけを載せる。状態を歩いて集める・差し替える道具もここ。 | 19 | 8 |
| [[js.asset-sync\|js/asset-sync.js]] | P2P卓で、画像・音源の実体をピアの間で行き来させる。 | 5 | 4 |
| [[js.audience-picker\|js/audience-picker.js]] | 「誰に見せるか」(audience)を選ぶ共通UI。 | 2 | 6 |
| [[js.audio-dialog\|js/audio-dialog.js]] | 部屋の音楽ダイアログ（ヘッダーの「♪」から開く）。 | 1 | 1 |
| [[js.audio-phrase\|js/audio-phrase.js]] | 音源に設定した「再生フレーズ」と発言の照合。 | 1 | 1 |
| [[js.audio-player\|js/audio-player.js]] | 部屋の音楽（BGM・効果音）とシステム音（入室音・チャット送信音）の再生エンジン（UIは持たない。操作は[[js.audio-dialog]]側）。 | 10 | 4 |
| [[js.background-dialog\|js/background-dialog.js]] | 盤面の「背景設定」ダイアログ。 | 1 | 1 |
| [[js.bcdice-catalog\|js/bcdice-catalog.js]] | BCDiceの「システム一覧」と「システム情報（command_pattern / help_message）」を 取得するクライアント共通モジュール。 | 4 | 2 |
| [[js.BCdice\|js/BCdice.js]] | BCDice の公開 API を叩いてダイス判定を実行する唯一の口。 | 1 | 2 |
| [[js.board-data-driven\|js/board-data-driven.js]] | 盤面（コマ・パネル・カード／デッキ・背景）の描画と操作を受け持つ、クライアント最大の UI 層。 | 11 | 7 |
| [[js.buff-dialog\|js/buff-dialog.js]] | コマ（トークン）へのバフ/デバフの付与・一覧表示ダイアログ。 | 2 | 2 |
| [[js.card-catalog\|js/card-catalog.js]] | 「盤面に置けるカードの束（デッキ）」の既定の中身を持つ表。 | 7 | 2 |
| [[js.character-builder\|js/character-builder.js]] | 部屋を作らずに、外部キャラクターシートツール（ゆとシート等）のJSON、または 本アプリのコマ丸ごとスナップショットJSONを読み込んで編集し、スナップショット JSONとして書き出す「コマ作成ツール」ページのロジック。 | 0 | 0 |
| [[js.character-dialog\|js/character-dialog.js]] | キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを まとめて入力するためのモーダルダイアログ。 | 5 | 2 |
| [[js.character-json-import\|js/character-json-import.js]] | 汎用（プラグイン未適用時）のキャラクターJSON読み込み。 | 1 | 2 |
| [[js.character-panel\|js/character-panel.js]] | 「キャラクター一覧」：盤面にいるコマと、バックヤード（盤面からしまったコマの個人保管場所）を タブで切り替えて並べる浮動パネル。 | 2 | 1 |
| [[js.character-sheet-import\|js/character-sheet-import.js]] | 「キャラクターシートのURLから取り込む」の共通部分。 | 3 | 2 |
| [[js.character-snapshot\|js/character-snapshot.js]] | コマ丸ごとの保存/復元（バックアップ用途）に使うJSON形式のマーカー・組み立て・ ファイルI/Oをまとめた共有モジュール。 | 5 | 4 |
| [[js.chat-palette\|js/chat-palette.js]] | チャットパレット：ユーザ(ブラウザ)ごとによく使うフレーズを保存し、選ぶだけで送れるようにする機能。 | 6 | 1 |
| [[js.chat-tab-dialog\|js/chat-tab-dialog.js]] | チャットタブの追加・公開先の変更・削除確認ダイアログ。 | 1 | 1 |
| [[js.context-menu\|js/context-menu.js]] | 汎用の右クリックコンテキストメニュー。 | 1 | 6 |
| [[js.deck-dialog\|js/deck-dialog.js]] | 盤面のカードを操作する小さなダイアログ3種：裏向きのカードを自分だけ確認する／何枚どこへ引くか／ストッカーのカードを送る。 | 3 | 1 |
| [[js.deck-editor-dialog\|js/deck-editor-dialog.js]] | デッキ（カードの束）の作成／編集ダイアログ。 | 1 | 1 |
| [[js.deck-file\|js/deck-file.js]] | デッキの定義（room.deckTemplates の1件）をJSONファイルへ書き出す／読み込む。 | 5 | 1 |
| [[js.deck-list-dialog\|js/deck-list-dialog.js]] | デッキ一覧。 | 1 | 1 |
| [[js.dialog-host\|js/dialog-host.js]] | モーダルダイアログの入れ物（<dialog>要素）を1つだけ用意して使い回すための小道具。 | 2 | 35 |
| [[js.dice-animation\|js/dice-animation.js]] | 盤面の上で3Dダイスを転がす演出（UIは持たない。js/audio-player.jsと同じ構え）。 | 1 | 1 |
| [[js.dice-draft-panel\|js/dice-draft-panel.js]] | 「ダイスドラフト」：振ってプールに溜めた目を1個ずつドラッグし、スキルの上に乗せて発動する 浮動パネル。 | 1 | 1 |
| [[js.dice-notation\|js/dice-notation.js]] | BCDice APIが返す出目の配列（rands）を、3Dダイス（vendor/dice-box-threejs）へ渡す ダイス記法へ変換する。 | 2 | 3 |
| [[js.drag-gesture\|js/drag-gesture.js]] | ドラッグと長押しの共通ヘルパー。 | 2 | 4 |
| [[js.EventBus\|js/EventBus.js]] | 購読と発火だけを持つ最小のイベントバス。 | 1 | 17 |
| [[js.file-uploader\|js/file-uploader.js]] | 汎用のファイル選択・読み込みユーティリティ。 | 4 | 7 |
| [[js.floating-panel\|js/floating-panel.js]] | ドラッグで移動・つまみで拡縮できる浮動パネルの汎用ユーティリティ。 | 1 | 5 |
| [[js.game-store\|js/game-store.js]] | 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。 | 4 | 16 |
| [[js.help.help-content\|js/help/help-content.js]] | 部屋の中のヘルプ（「？ヘルプ」タブ）で読ませる文章そのもの。 | 6 | 1 |
| [[js.help.help-panel\|js/help/help-panel.js]] | 「？ヘルプ」タブの中身。 | 1 | 1 |
| [[js.host-persistence\|js/host-persistence.js]] | P2P卓の永続化。 | 1 | 1 |
| [[js.html-escape\|js/html-escape.js]] | 文字列をHTMLへ埋め込む前の始末。 | 2 | 3 |
| [[js.ice-probe-rules\|js/ice-probe-rules.js]] | 「この回線からP2Pが張れるか」の判定そのもの。 | 5 | 1 |
| [[js.ice-probe\|js/ice-probe.js]] | 「この回線からP2Pの部屋に入れるか」を、相手を用意せずに1台だけで測る道具（/ice-probe.html）。 | 0 | 0 |
| [[js.icons\|js/icons.js]] | 画面の操作部品に置くアイコンを、ここでだけ定義する。 | 4 | 12 |
| [[js.identity-dialog\|js/identity-dialog.js]] | 参加者設定ダイアログ。 | 1 | 1 |
| [[js.image-dimensions\|js/image-dimensions.js]] | 画像の実ピクセルサイズ（naturalWidth/Height）を測る。 | 1 | 3 |
| [[js.image-upload\|js/image-upload.js]] | 画像をサーバー経由でR2へ上げ、公開URLを受け取る。P2P卓ではR2を通さず、このブラウザへしまう（js/asset-store.js）。 | 5 | 6 |
| [[js.info-entry-dialog\|js/info-entry-dialog.js]] | 「情報」1件を編集するダイアログ。 | 1 | 1 |
| [[js.info-panel\|js/info-panel.js]] | 「情報」：タイトルと内容の組を、浮動パネルのタブとして並べる共有メモ。 | 1 | 1 |
| [[js.local-identity\|js/local-identity.js]] | このブラウザ（デバイス）を指すための、自己申告不要の匿名ローカルID。 | 15 | 14 |
| [[js.log-clear-dialog\|js/log-clear-dialog.js]] | 全タブのログを消す前の確認ダイアログ。 | 1 | 1 |
| [[js.log-edit-dialog\|js/log-edit-dialog.js]] | 既に流れた発言の本文を書き直すダイアログ。 | 1 | 1 |
| [[js.log-export-dialog\|js/log-export-dialog.js]] | 「ログを保存」のタブ選択ダイアログ。 | 1 | 1 |
| [[js.log-export\|js/log-export.js]] | チャットログを「読み物として読めるHTML」へ書き出す。 | 1 | 1 |
| [[js.main\|js/main.js]] |  | 0 | 0 |
| [[js.mobile-layout\|js/mobile-layout.js]] | 狭幅（スマホ）向けの縦積みレイアウト。 | 1 | 1 |
| [[js.net-chunk\|js/net-chunk.js]] | DataChannelで大きなメッセージを運ぶための分割と組み直し。 | 5 | 2 |
| [[js.net-host-rules\|js/net-host-rules.js]] | ホスト権威P2Pのホスト役（js/net-host.js）が使う判定そのもの。連打よけ・記入中の集計・入室メッセージの重複判定・控えを送る間引き。サーバーと共有する上限もここに置く。 | 9 | 3 |
| [[js.net-host\|js/net-host.js]] | ホスト権威P2Pの「ホスト役」。GMのタブが wss.on('connection') の仕事を引き受ける。永続化と開発用の合言葉だけは持てない。 | 1 | 1 |
| [[js.net-signaling\|js/net-signaling.js]] | P2P卓でサーバーとの間に1本だけ張る細い口。SDPとICE候補のほか、サーバーにしか決められない3つ（入室パスワードの照合・ホスト役の資格・部屋の削除）を運ぶ。役割はサーバーが決める。 | 2 | 4 |
| [[js.net-sync\|js/net-sync.js]] | ブラウザ側のWebSocketクライアント。 | 9 | 3 |
| [[js.net-transport-rtc\|js/net-transport-rtc.js]] | ホスト（GMのタブ）とDataChannelを1本張る、ゲスト側のトランスポート。開いたシグナリングを受け取って使い、大きいメッセージは js/net-chunk.js で組み直す。 | 1 | 1 |
| [[js.net-transport-ws\|js/net-transport-ws.js]] | js/net-transport.jsの契約を、今までどおりのWebSocketで満たす実装。 | 2 | 2 |
| [[js.net-transport\|js/net-transport.js]] | 「同期のメッセージを運ぶ道」の契約と、切断の理由。どちらを使うかは決めない（P2P卓の組み立ては役割が決まってからなので js/net-sync.js にある）。 | 3 | 5 |
| [[js.no-browser-zoom\|js/no-browser-zoom.js]] | ブラウザ標準のページズームを止める。 | 1 | 1 |
| [[js.original-table-dialog\|js/original-table-dialog.js]] | オリジナル表（ユーザー定義のダイス表）の作成／編集ダイアログ。 | 1 | 1 |
| [[js.original-table-list-dialog\|js/original-table-list-dialog.js]] | 登録済みのオリジナル表（room.originalTables）のタイトル一覧ダイアログ。 | 1 | 1 |
| [[js.p2p-import-handoff\|js/p2p-import-handoff.js]] | P2P卓を「ファイルから作る」ときに、読み込んだ状態を部屋一覧ページから盤面ページへ渡す。 | 4 | 2 |
| [[js.panel-dialog\|js/panel-dialog.js]] | パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。 | 1 | 1 |
| [[js.parameters.arianrhod-ability-box\|js/parameters/arianrhod-ability-box.js]] | アリアンロッドの「能力ボーナス」7種とレベル（CL）をまとめて表示・編集するボックス。 | 3 | 1 |
| [[js.parameters.arianrhod-action-set-box\|js/parameters/arianrhod-action-set-box.js]] | アリアンロッドの「行動セット」＝ムーブ／マイナー／メジャーで何を行うかという宣言の組。 | 11 | 1 |
| [[js.parameters.arianrhod\|js/parameters/arianrhod.js]] | アリアンロッドRPG 2E のプラグイン記述子。 | 11 | 1 |
| [[js.parameters.core\|js/parameters/core.js]] | どのシステムでも共通の、コマのパラメータ（HP・イニシアチブ）とルーム変数（現在のラウンド）の定義。 | 4 | 4 |
| [[js.parameters.dice-draft.dice-draft-model\|js/parameters/dice-draft/dice-draft-model.js]] | ダイスドラフト（振った目を1個ずつ取っておき、スキルへ割り当てて使う仕組み）のデータモデル。 | 16 | 6 |
| [[js.parameters.dice-draft.dice-draft-pool\|js/parameters/dice-draft/dice-draft-pool.js]] | ダイスドラフトのプールを、振らずに直接動かす操作。 | 4 | 3 |
| [[js.parameters.dice-draft.dice-draft-roll\|js/parameters/dice-draft/dice-draft-roll.js]] | 「ダイスを振ってドラフトのプールへ入れる」共通処理。 | 3 | 5 |
| [[js.parameters.dice-draft.dice-draft-use\|js/parameters/dice-draft/dice-draft-use.js]] | ダイスドラフトの「発動」。 | 1 | 2 |
| [[js.parameters.dracurouge-bond-box\|js/parameters/dracurouge-bond-box.js]] | ドラクルージュの「絆」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。 | 10 | 1 |
| [[js.parameters.dracurouge\|js/parameters/dracurouge.js]] | ドラクルージュのプラグイン記述子。 | 2 | 1 |
| [[js.parameters.dx3-ability-box\|js/parameters/dx3-ability-box.js]] | DX3の能力値・技能値をまとめて表示する「ボックス」。 | 1 | 1 |
| [[js.parameters.dx3-combo-box\|js/parameters/dx3-combo-box.js]] | DX3の「コンボ」一覧・編集を行うボックス。 | 7 | 1 |
| [[js.parameters.dx3-lois-box\|js/parameters/dx3-lois-box.js]] | DX3の「ロイス」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。 | 10 | 1 |
| [[js.parameters.dx3\|js/parameters/dx3.js]] | DX3（ダブルクロス3rd）のプラグイン記述子。パラメータ定義と各ボックスの束ね役。 | 7 | 1 |
| [[js.parameters.futarisousa-skill-box\|js/parameters/futarisousa-skill-box.js]] | フタリソウサの「技能」を表示・編集するボックス。 | 5 | 1 |
| [[js.parameters.futarisousa\|js/parameters/futarisousa.js]] | バディサスペンスTRPG フタリソウサ のプラグイン記述子。 | 2 | 1 |
| [[js.parameters.gcrest-ability-box\|js/parameters/gcrest-ability-box.js]] | グランクレストの能力判定値6種と技能をまとめて表示する「ボックス」。 | 1 | 1 |
| [[js.parameters.gcrest-unit-box\|js/parameters/gcrest-unit-box.js]] | グランクレストの「部隊」（マスコンバット）を編集するボックス。 | 1 | 1 |
| [[js.parameters.gcrest\|js/parameters/gcrest.js]] | グランクレスト戦記RPGのプラグイン記述子。 | 28 | 1 |
| [[js.parameters.paramFactory\|js/parameters/paramFactory.js]] | パラメータ定義配列を、Store用のparamオブジェクトに変換する共通処理。 | 1 | 8 |
| [[js.parameters.registry\|js/parameters/registry.js]] | システム固有の振る舞いを一手に引き受けるプラグインの登録簿。 | 23 | 16 |
| [[js.parameters.saikoro-fiction.skill-check\|js/parameters/saikoro-fiction/skill-check.js]] | サイコロ・フィクション共通の「特技判定」の実行とチャットへの出力。 | 5 | 2 |
| [[js.parameters.saikoro-fiction.skill-table-box\|js/parameters/saikoro-fiction/skill-table-box.js]] | サイコロ・フィクション共通の「特技表」ボックス。 | 1 | 1 |
| [[js.parameters.saikoro-fiction.skill-table\|js/parameters/saikoro-fiction/skill-table.js]] | サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。 | 32 | 3 |
| [[js.parameters.sheet-source\|js/parameters/sheet-source.js]] | 「キャラクターシートのURLから取り込む」ときの受け付け先の宣言と、シートの値を読む小道具。 | 4 | 5 |
| [[js.parameters.shinobigami-ougi-box\|js/parameters/shinobigami-ougi-box.js]] | シノビガミの「奥義」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。 | 9 | 1 |
| [[js.parameters.shinobigami-skills\|js/parameters/shinobigami-skills.js]] | シノビガミの特技表データ（6分野 × 11行）。 | 4 | 1 |
| [[js.parameters.shinobigami\|js/parameters/shinobigami.js]] | シノビガミのプラグイン記述子。 | 9 | 1 |
| [[js.parameters.skill.item-use\|js/parameters/skill/item-use.js]] | アイテム（createItemSpecで宣言した、個数を持つ持ち物）の使用と増減。 | 5 | 3 |
| [[js.parameters.skill.skill-box\|js/parameters/skill/skill-box.js]] | スキル一覧を表示・編集するボックス（複数データをまとめて扱うUI）。 | 1 | 7 |
| [[js.parameters.skill.skill-formula\|js/parameters/skill/skill-formula.js]] | スキル（キャラが選んで取得する能力。DX3のエフェクト、シノビガミの忍法等）の各所に書ける 「式」を数値・真偽値へ解決する。 | 9 | 2 |
| [[js.parameters.skill.skill-model\|js/parameters/skill/skill-model.js]] | 「キャラが選んで取得するタイプの能力」＝スキルの、システムに依存しないデータモデル。 | 18 | 12 |
| [[js.parameters.skill.skill-use\|js/parameters/skill/skill-use.js]] | スキルの「使用」。 | 4 | 8 |
| [[js.parameters.stella-knights\|js/parameters/stella-knights.js]] |  | 1 | 1 |
| [[js.pwa\|js/pwa.js]] | 「ホーム画面／デスクトップへのアプリとして追加」まわり。 | 2 | 3 |
| [[js.read-only-form\|js/read-only-form.js]] | 「見えるが触れない」表示にするための小さなユーティリティ。 | 1 | 12 |
| [[js.room-authority-rules\|js/room-authority-rules.js]] | 「部屋そのものを左右する操作をしてよいのは誰か」の規則そのもの。 | 2 | 3 |
| [[js.room-authority\|js/room-authority.js]] | 「部屋そのものを左右する操作（部屋の削除、システム/プラグインの変更、音源の追加、 セッションデータの読み込み、ラウンド進行）をしてよいのは誰か」の判定を1か所にまとめる。 | 4 | 5 |
| [[js.room-delete-dialog\|js/room-delete-dialog.js]] | 部屋削除の確認ダイアログ。 | 1 | 1 |
| [[js.room-entry-dialog\|js/room-entry-dialog.js]] | 入室パスワードの入力ダイアログ。 | 2 | 1 |
| [[js.room-entry\|js/room-entry.js]] | 部屋の入室パスワードを、このブラウザに覚えておくところ。 | 4 | 5 |
| [[js.room-index\|js/room-index.js]] | 部屋一覧ページ（index.html）のロジック。 | 0 | 0 |
| [[js.room-parameters-dialog\|js/room-parameters-dialog.js]] | ルーム変数（room.parameters）専用の一覧編集ダイアログ。 | 1 | 1 |
| [[js.round-panel\|js/round-panel.js]] | ラウンド進行の状態バー。 | 2 | 1 |
| [[js.round-setup-dialog\|js/round-setup-dialog.js]] | ラウンド進行の参加者選択ダイアログ。 | 1 | 1 |
| [[js.scene-dialog\|js/scene-dialog.js]] | シーンの作成・編集ダイアログ（一覧はscene-list-dialog.js）。 | 1 | 1 |
| [[js.scene-list-dialog\|js/scene-list-dialog.js]] | 登録済みのシーン（room.scenes）の一覧ダイアログ。 | 1 | 1 |
| [[js.site-nav\|js/site-nav.js]] | 部屋の外にある3ページ（部屋入口・コマ作成ツール・このサービスについて）の行き来。 | 0 | 0 |
| [[js.sound-config\|js/sound-config.js]] | 入室音・チャット送信音のURLを1か所で持つ。 | 3 | 2 |
| [[js.stamp-catalog\|js/stamp-catalog.js]] | Core（どのゲームシステムでも使える）スタンプの一覧。 | 3 | 3 |
| [[js.stamp-layer\|js/stamp-layer.js]] | スタンプの表示レイヤー。 | 2 | 2 |
| [[js.stamp-panel\|js/stamp-panel.js]] | 「スタンプ送信」：使えるスタンプを画像で並べ、押すとその場で送る浮動パネル。 | 1 | 1 |
| [[js.stamp-registry\|js/stamp-registry.js]] | 「この部屋で使えるスタンプ」を1か所で決める。 | 5 | 6 |
| [[js.state-import\|js/state-import.js]] | 「部屋の全データ読み込み」で取り込んだ状態を、この部屋で使える形へ均す。 | 2 | 4 |
| [[js.store.audio\|js/store/audio.js]] | 音楽（BGM・効果音）まわりの語彙。 | 3 | 4 |
| [[js.store.buffs\|js/store/buffs.js]] | バフ/デバフの終了条件（フェーズ）と、フェーズ終了時の後始末。 | 8 | 4 |
| [[js.store.cards\|js/store/cards.js]] | カード・デッキ・カードストッカーの形を整える処理と、その上限。 | 36 | 3 |
| [[js.store.chat\|js/store/chat.js]] | チャットタブとログへの追記。 | 9 | 6 |
| [[js.store.handlers.audio\|js/store/handlers/audio.js]] | 部屋の音楽（BGM・効果音）の登録と再生。 | 1 | 1 |
| [[js.store.handlers.board\|js/store/handlers/board.js]] | 盤面に載るもののうち、コマ以外――パネル（マップタイル状のオブジェクト）と カード・デッキ・カードストッカー、そしてデッキの作り置き（deckTemplates）。 | 1 | 1 |
| [[js.store.handlers.buffs\|js/store/handlers/buffs.js]] | バフ/デバフの付け外しと、フェーズ終了による消滅。 | 1 | 1 |
| [[js.store.handlers.characters\|js/store/handlers/characters.js]] | コマそのものの作成・削除と、コマが持つパラメータの操作。 | 1 | 1 |
| [[js.store.handlers.chat\|js/store/handlers/chat.js]] | チャットのタブとログ。 | 1 | 1 |
| [[js.store.handlers.index\|js/store/handlers/index.js]] | アクション名 → ハンドラの一枚の表。 | 1 | 1 |
| [[js.store.handlers.info\|js/store/handlers/info.js]] | 「情報」（タイトル＋区画の共有メモ）の作成・更新と、伏せ字の開示。 | 1 | 1 |
| [[js.store.handlers.participants\|js/store/handlers/participants.js]] | 参加者一覧（表示名から導出した公開IDで識別する）と、スタンプの集計。 | 1 | 1 |
| [[js.store.handlers.room\|js/store/handlers/room.js]] | 部屋そのものの設定（名前・システム・プラグイン・背景・盤面の振る舞い）と、 部屋に置いておくもの（ルーム変数・オリジナル表）。 | 1 | 1 |
| [[js.store.handlers.round\|js/store/handlers/round.js]] | ラウンド進行（Core機能）。 | 1 | 1 |
| [[js.store.handlers.scenes\|js/store/handlers/scenes.js]] | シーン（GMが場面ごとに盤面の見た目を保存し、1クリックで切り替えるための入れ物）。 | 1 | 1 |
| [[js.store.ids\|js/store/ids.js]] | 盤面のオブジェクト（コマ・パネル・カード・デッキ・バフ・プロット枠・情報）のIDを作る。 | 9 | 1 |
| [[js.store.info\|js/store/info.js]] | 「情報」（タイトル＋区画の共有メモ）の形を整える処理と、伏せ字（masks）の扱い。 | 9 | 2 |
| [[js.store.params\|js/store/params.js]] | パラメータマップ（コマの parameters / room.parameters）を差し替えるための道具立て。 | 6 | 4 |
| [[js.store.patch\|js/store/patch.js]] | dispatch 内で繰り返し現れる更新パターンの共通処理。 | 8 | 15 |
| [[js.store.room\|js/store/room.js]] | 部屋そのものの既定値と、部屋の設定を読むための小さな述語。 | 10 | 7 |
| [[js.store.round-state\|js/store/round-state.js]] | ラウンド進行（Core機能）の状態そのものと、その状態から導ける読み取り。 | 23 | 4 |
| [[js.untrusted-json\|js/untrusted-json.js]] | 自分が書いたのではないJSONの読み方。 | 1 | 9 |
| [[js.visibility\|js/visibility.js]] | 「これは誰に見せるものか」(audience) の解釈を1か所にまとめる共通モジュール。 | 8 | 11 |
| [[server.bcdice-cache-rules\|server/bcdice-cache-rules.js]] | BCDiceの中継キャッシュ（server/index.jsのloadBcdiceCached）の判断そのもの。 | 7 | 1 |
| [[server.dev-local\|server/dev-local.js]] | 動作確認（検証）用の起動口。 | 0 | 0 |
| [[server.index\|server/index.js]] | 盤面のHTML/JS/画像などの静的ファイル配信と、リアルタイム同期用のWebSocketを 同じNodeサーバー・同じポートで提供する。 | 0 | 0 |
| [[server.memory-budget\|server/memory-budget.js]] | 重い操作（部屋の取り込み・書き出し・ファイルのアップロード）が使うメモリを、実際に 読み込む前に見積もって予約する。 | 7 | 1 |
| [[server.r2\|server/r2.js]] | 音源・画像などファイルの実体を置くCloudflare R2への読み書きだけを担う薄いモジュール。 | 11 | 1 |
| [[server.room-directory\|server/room-directory.js]] | 全部屋の要約（名前・プラグイン・BCDiceシステム・鍵の有無・最終更新）を1か所に集めた 「部屋の名簿」。 | 8 | 1 |

## 依存の要所

| ファイル | 被import |
|---|---:|
| [[js.dialog-host\|js/dialog-host.js]] | 35 |
| [[js.EventBus\|js/EventBus.js]] | 17 |
| [[js.game-store\|js/game-store.js]] | 16 |
| [[js.parameters.registry\|js/parameters/registry.js]] | 16 |
| [[js.store.patch\|js/store/patch.js]] | 15 |
| [[js.local-identity\|js/local-identity.js]] | 14 |
| [[js.icons\|js/icons.js]] | 12 |
| [[js.parameters.skill.skill-model\|js/parameters/skill/skill-model.js]] | 12 |
| [[js.read-only-form\|js/read-only-form.js]] | 12 |
| [[js.visibility\|js/visibility.js]] | 11 |

## 散文が要更新

export の顔ぶれかシグネチャが変わったのに `## 役割` が書き直されていないファイル。

- [[js.board-data-driven\|js/board-data-driven.js]]
- [[js.card-catalog\|js/card-catalog.js]]
