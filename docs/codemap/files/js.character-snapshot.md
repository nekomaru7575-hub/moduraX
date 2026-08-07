---
source: js/character-snapshot.js
lines: 58
exports: 5
imported_by: 3
api_sha: 2a7d1ad3ea43
prose_sha: 2a7d1ad3ea43
generated: 2026-08-07
tags: [codemap]
---

# js/character-snapshot.js

<!-- prose:summary -->
コマ丸ごとの保存/復元（バックアップ用途）に使うJSON形式のマーカー・組み立て・ ファイルI/Oをまとめた共有モジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマ1体を丸ごと JSON に固める形式（マーカー・組み立て・読み書き）を定義する。この形式はコマ作成ツールとチャットパレットの入出力で共有されるため、フィールドを増やすときは両方の読み込み側を確認する必要がある。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 10 | const | TOKEN_SNAPSHOT_FORMAT | `TOKEN_SNAPSHOT_FORMAT` | 外部キャラクターシートツールのJSONや、本アプリの汎用インポート形式（{name, parameters}）とは 区別が必要なため、読み込み時はまずこのマーカーの有無で判定する。 |
| 12 | fn | isTokenSnapshot | `isTokenSnapshot(json)` |  |
| 19 | fn | buildTokenSnapshot | `buildTokenSnapshot(token)` | コマの表示・パラメータ・エフェクト/コンボ等の構成要素・バフをすべて含む完全なスナップショットを作る。 |
| 36 | fn | downloadJSON | `downloadJSON(filename, data)` | JSONデータをファイルとしてダウンロードさせる |
| 50 | fn | parseJsonText | `parseJsonText(text)` | JSONテキストをパースする。 |

## トップレベル関数・非export（0）

なし。

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.character-builder]], [[js.chat-palette]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
