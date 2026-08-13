---
tags: [codemap, index]
generated: 2026-08-13
---

# trpg-app コードマップ

エージェントが**ソースを読まずに**構造を把握するためのインデックス。
`node .loop/codemap.mjs` で生成される。表の内容を手で直しても次回の生成で消える。

## 使い方

- ノートのパスはソースパスから決まる: `js/parameters/dx3.js` → `docs/codemap/files/js.parameters.dx3.md`
  この表を読まずに直接 Read してよい。
- symbol の**説明はコード側のコメントが正**。説明を良くしたいときはコードのコメントを直す。
  コメントが無い symbol の説明だけノートに保存される。
- `## 役割` `## 注意` はノート側にのみ存在する。書き換えてよい（生成時に引き継がれる）。

## 全体

| ファイル | export | トップレベル関数 | 役割が未記入 | 散文が要更新 |
|---:|---:|---:|---:|---:|
| 82 | 291 | 654 | 14 | 0 |

エントリポイント（誰からも import されない）: `js/character-builder.js`, `js/main.js`, `js/parameters/gcrest.js`, `js/room-index.js`, `server/dev-local.js`, `server/index.js`

## ファイル一覧

| ファイル | 紹介 | export | 被import |
|---|---|---:|---:|
| [[js.audience-picker\|js/audience-picker.js]] | 「誰に見せるか」(audience)を選ぶ共通UI。 | 2 | 5 |
| [[js.audio-dialog\|js/audio-dialog.js]] | 部屋の音楽ダイアログ（ヘッダーの「♪」から開く）。 | 1 | 1 |
| [[js.audio-phrase\|js/audio-phrase.js]] | 音源に設定した「再生フレーズ」と発言の照合。 | 1 | 1 |
| [[js.audio-player\|js/audio-player.js]] | 部屋の音楽（BGM・効果音）とシステム音（入室音・チャット送信音）の再生エンジン（UIは持たない。操作は[[js.audio-dialog]]側）。 | 10 | 4 |
| [[js.background-dialog\|js/background-dialog.js]] | 盤面の「背景設定」ダイアログ。 | 1 | 1 |
| [[js.bcdice-catalog\|js/bcdice-catalog.js]] | BCDiceの「システム一覧」と「システム情報（command_pattern / help_message）」を 取得するクライアント共通モジュール。 | 4 | 2 |
| [[js.BCdice\|js/BCdice.js]] | BCDice の公開 API を叩いてダイス判定を実行する唯一の口。 | 1 | 2 |
| [[js.board-data-driven\|js/board-data-driven.js]] | 盤面（コマ・パネル・背景）の描画と操作を受け持つ、クライアント最大の UI 層。 | 4 | 6 |
| [[js.buff-dialog\|js/buff-dialog.js]] | コマ（トークン）へのバフ/デバフの付与・一覧表示ダイアログ。 | 2 | 2 |
| [[js.character-builder\|js/character-builder.js]] | 部屋を作らずに、外部キャラクターシートツール（ゆとシート等）のJSON、または 本アプリのコマ丸ごとスナップショットJSONを読み込んで編集し、スナップショット JSONとして書き出す「コマ作成ツール」ページのロジック。 | 0 | 0 |
| [[js.character-dialog\|js/character-dialog.js]] | キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを まとめて入力するためのモーダルダイアログ。 | 5 | 2 |
| [[js.character-json-import\|js/character-json-import.js]] | 汎用（プラグイン未適用時）のキャラクターJSON読み込み。 | 1 | 2 |
| [[js.character-panel\|js/character-panel.js]] | 「キャラクター一覧」：盤面にいるコマと、バックヤード（盤面からしまったコマの個人保管場所）を タブで切り替えて並べる浮動パネル。 | 2 | 1 |
| [[js.character-snapshot\|js/character-snapshot.js]] | コマ丸ごとの保存/復元（バックアップ用途）に使うJSON形式のマーカー・組み立て・ ファイルI/Oをまとめた共有モジュール。 | 5 | 3 |
| [[js.chat-palette\|js/chat-palette.js]] | チャットパレット：ユーザ(ブラウザ)ごとによく使うフレーズを保存し、 クリックだけで即座に送信できるようにする機能。 | 5 | 1 |
| [[js.chat-tab-dialog\|js/chat-tab-dialog.js]] | チャットタブの追加・公開先の変更・削除確認ダイアログ。 | 1 | 1 |
| [[js.context-menu\|js/context-menu.js]] | 汎用の右クリックコンテキストメニュー。 | 1 | 5 |
| [[js.dice-animation\|js/dice-animation.js]] | 盤面の上で3Dダイスを転がす演出（UIは持たない。js/audio-player.jsと同じ構え）。 | 1 | 1 |
| [[js.dice-notation\|js/dice-notation.js]] | BCDice APIが返す出目の配列（rands）を、3Dダイス（vendor/dice-box-threejs）へ渡す ダイス記法へ変換する。 | 2 | 3 |
| [[js.drag-gesture\|js/drag-gesture.js]] | ドラッグと長押しの共通ヘルパー。 | 1 | 3 |
| [[js.EventBus\|js/EventBus.js]] | 購読と発火だけを持つ最小のイベントバス。 | 1 | 12 |
| [[js.file-uploader\|js/file-uploader.js]] | 汎用のファイル選択・読み込みユーティリティ。 | 3 | 5 |
| [[js.floating-panel\|js/floating-panel.js]] | ドラッグで移動・つまみで拡縮できる浮動パネルの汎用ユーティリティ。 | 1 | 4 |
| [[js.game-store\|js/game-store.js]] | 状態遷移ロジック（ImmutableStoreとその状態）だけを持つ、DOM/windowに一切依存しない 純粋なモジュール。 | 27 | 13 |
| [[js.html-escape\|js/html-escape.js]] | 文字列をHTMLへ埋め込む前の始末。 | 2 | 3 |
| [[js.identity-dialog\|js/identity-dialog.js]] | 参加者設定ダイアログ。 | 1 | 1 |
| [[js.image-dimensions\|js/image-dimensions.js]] | 画像の実ピクセルサイズ（naturalWidth/Height）を測る。 | 1 | 3 |
| [[js.image-upload\|js/image-upload.js]] | 背景画像をサーバー経由でR2へ上げ、公開URLを受け取る。 | 5 | 4 |
| [[js.info-entry-dialog\|js/info-entry-dialog.js]] | 「情報」1件を編集するダイアログ。 | 1 | 1 |
| [[js.info-panel\|js/info-panel.js]] | 「情報」：タイトルと内容の組を、浮動パネルのタブとして並べる共有メモ。 | 1 | 1 |
| [[js.local-identity\|js/local-identity.js]] | このブラウザ（デバイス）を指すための、自己申告不要の匿名ローカルID。 | 15 | 13 |
| [[js.log-clear-dialog\|js/log-clear-dialog.js]] | 全タブのログを消す前の確認ダイアログ。 | 1 | 1 |
| [[js.log-edit-dialog\|js/log-edit-dialog.js]] | 既に流れた発言の本文を書き直すダイアログ。 | 1 | 1 |
| [[js.log-export-dialog\|js/log-export-dialog.js]] | 「ログを保存」のタブ選択ダイアログ。 | 1 | 1 |
| [[js.log-export\|js/log-export.js]] | チャットログを「読み物として読めるHTML」へ書き出す。 | 1 | 1 |
| [[js.main\|js/main.js]] |  | 0 | 0 |
| [[js.mobile-layout\|js/mobile-layout.js]] | 狭幅（スマホ）向けの縦積みレイアウト。 | 1 | 1 |
| [[js.net-sync\|js/net-sync.js]] | ブラウザ側のWebSocketクライアント。 | 9 | 3 |
| [[js.no-browser-zoom\|js/no-browser-zoom.js]] | ブラウザ標準のページズームを止める。 | 1 | 1 |
| [[js.original-table-dialog\|js/original-table-dialog.js]] | オリジナル表（ユーザー定義のダイス表）の作成／編集ダイアログ。 | 1 | 1 |
| [[js.original-table-list-dialog\|js/original-table-list-dialog.js]] | 登録済みのオリジナル表（room.originalTables）のタイトル一覧ダイアログ。 | 1 | 1 |
| [[js.panel-dialog\|js/panel-dialog.js]] | パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。 | 1 | 1 |
| [[js.parameters.core\|js/parameters/core.js]] | どのシステムでも共通のデフォルトパラメータ（HP・イニシアチブ）の定義。 | 2 | 2 |
| [[js.parameters.dx3-ability-box\|js/parameters/dx3-ability-box.js]] | DX3の能力値・技能値をまとめて表示する「ボックス」。 | 1 | 1 |
| [[js.parameters.dx3-combo-box\|js/parameters/dx3-combo-box.js]] | DX3の「コンボ」一覧・編集を行うボックス。 | 7 | 1 |
| [[js.parameters.dx3-lois-box\|js/parameters/dx3-lois-box.js]] | DX3の「ロイス」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。 | 10 | 1 |
| [[js.parameters.dx3\|js/parameters/dx3.js]] | DX3（ダブルクロス3rd）のプラグイン記述子。パラメータ定義と各ボックスの束ね役。 | 6 | 1 |
| [[js.parameters.gcrest\|js/parameters/gcrest.js]] | グランクレストのプラグイン記述子（プラグインの書き方の見本）。 | 3 | 0 |
| [[js.parameters.paramFactory\|js/parameters/paramFactory.js]] | パラメータ定義配列を、Store用のparamオブジェクトに変換する共通処理。 | 1 | 5 |
| [[js.parameters.registry\|js/parameters/registry.js]] | システム固有の振る舞いを一手に引き受けるプラグインの登録簿。 | 17 | 8 |
| [[js.parameters.saikoro-fiction.skill-check\|js/parameters/saikoro-fiction/skill-check.js]] | サイコロ・フィクション共通の「特技判定」の実行とチャットへの出力。 | 6 | 2 |
| [[js.parameters.saikoro-fiction.skill-table-box\|js/parameters/saikoro-fiction/skill-table-box.js]] | サイコロ・フィクション共通の「特技表」ボックス。 | 1 | 1 |
| [[js.parameters.saikoro-fiction.skill-table\|js/parameters/saikoro-fiction/skill-table.js]] | サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の データモデルと距離計算。 | 27 | 3 |
| [[js.parameters.shinobigami-skills\|js/parameters/shinobigami-skills.js]] | シノビガミの特技表データ（6分野 × 11行）。 | 3 | 1 |
| [[js.parameters.shinobigami\|js/parameters/shinobigami.js]] | シノビガミのプラグイン記述子。 | 4 | 1 |
| [[js.parameters.skill.skill-box\|js/parameters/skill/skill-box.js]] | スキル一覧を表示・編集するボックス（複数データをまとめて扱うUI）。 | 1 | 3 |
| [[js.parameters.skill.skill-formula\|js/parameters/skill/skill-formula.js]] | スキル（キャラが選んで取得する能力。DX3のエフェクト、シノビガミの忍法等）の各所に書ける 「式」を数値・真偽値へ解決する。 | 9 | 2 |
| [[js.parameters.skill.skill-model\|js/parameters/skill/skill-model.js]] | 「キャラが選んで取得するタイプの能力」＝スキルの、システムに依存しないデータモデル。 | 14 | 5 |
| [[js.parameters.skill.skill-use\|js/parameters/skill/skill-use.js]] | スキルの「使用」。 | 4 | 3 |
| [[js.parameters.stella-knights\|js/parameters/stella-knights.js]] |  | 1 | 1 |
| [[js.read-only-form\|js/read-only-form.js]] | 「見えるが触れない」表示にするための小さなユーティリティ。 | 1 | 5 |
| [[js.resizable-stack\|js/resizable-stack.js]] | 縦に並んだ複数セクション（[data-resizable-section]を持つ要素）の間に ドラッグハンドルを挿入し、高さをユーザーが調整できるようにする汎用ユーティリティ。 | 1 | 1 |
| [[js.room-authority\|js/room-authority.js]] | 「部屋そのものを左右する操作（部屋の削除、システム/プラグインの変更、音源の追加、 セッションデータの読み込み、ラウンド進行）をしてよいのは誰か」の判定を1か所にまとめる。 | 4 | 4 |
| [[js.room-delete-dialog\|js/room-delete-dialog.js]] | 部屋削除の確認ダイアログ。 | 1 | 1 |
| [[js.room-entry-dialog\|js/room-entry-dialog.js]] | 入室パスワードの入力ダイアログ。 | 2 | 1 |
| [[js.room-entry\|js/room-entry.js]] | 部屋の入室パスワードを、このブラウザに覚えておくところ。 | 4 | 5 |
| [[js.room-index\|js/room-index.js]] | 部屋一覧ページ（index.html）のロジック。 | 0 | 0 |
| [[js.room-parameters-dialog\|js/room-parameters-dialog.js]] | ルーム変数（room.parameters）専用の一覧編集ダイアログ。 | 1 | 1 |
| [[js.round-panel\|js/round-panel.js]] | ラウンド進行の状態バー。 | 2 | 1 |
| [[js.round-setup-dialog\|js/round-setup-dialog.js]] | ラウンド進行の参加者選択ダイアログ。 | 1 | 1 |
| [[js.scene-dialog\|js/scene-dialog.js]] | シーンの作成・編集ダイアログ（一覧はscene-list-dialog.js）。 | 1 | 1 |
| [[js.scene-list-dialog\|js/scene-list-dialog.js]] | 登録済みのシーン（room.scenes）の一覧ダイアログ。 | 1 | 1 |
| [[js.stamp-catalog\|js/stamp-catalog.js]] | Core（どのゲームシステムでも使える）スタンプの一覧。 | 3 | 2 |
| [[js.stamp-layer\|js/stamp-layer.js]] | スタンプの表示レイヤー。 | 2 | 2 |
| [[js.stamp-panel\|js/stamp-panel.js]] | 「スタンプ送信」：使えるスタンプを画像で並べ、押すとその場で送る浮動パネル。 | 1 | 1 |
| [[js.stamp-registry\|js/stamp-registry.js]] | 「この部屋で使えるスタンプ」を1か所で決める。 | 5 | 5 |
| [[js.state-import\|js/state-import.js]] | 「部屋の全データ読み込み」で取り込んだ状態を、この部屋で使える形へ均す。 | 1 | 2 |
| [[js.untrusted-json\|js/untrusted-json.js]] | 自分が書いたのではないJSONの読み方。 | 1 | 5 |
| [[js.visibility\|js/visibility.js]] | 「これは誰に見せるものか」(audience) の解釈を1か所にまとめる共通モジュール。 | 5 | 7 |
| [[server.dev-local\|server/dev-local.js]] | 動作確認（検証）用の起動口。 | 0 | 0 |
| [[server.index\|server/index.js]] | 盤面のHTML/JS/画像などの静的ファイル配信と、リアルタイム同期用のWebSocketを 同じNodeサーバー・同じポートで提供する。 | 0 | 0 |
| [[server.r2\|server/r2.js]] | 音源・画像などファイルの実体を置くCloudflare R2への読み書きだけを担う薄いモジュール。 | 11 | 1 |

## 依存の要所

| ファイル | 被import |
|---|---:|
| [[js.game-store\|js/game-store.js]] | 13 |
| [[js.local-identity\|js/local-identity.js]] | 13 |
| [[js.EventBus\|js/EventBus.js]] | 12 |
| [[js.parameters.registry\|js/parameters/registry.js]] | 8 |
| [[js.visibility\|js/visibility.js]] | 7 |
| [[js.board-data-driven\|js/board-data-driven.js]] | 6 |
| [[js.audience-picker\|js/audience-picker.js]] | 5 |
| [[js.context-menu\|js/context-menu.js]] | 5 |
| [[js.file-uploader\|js/file-uploader.js]] | 5 |
| [[js.parameters.paramFactory\|js/parameters/paramFactory.js]] | 5 |
