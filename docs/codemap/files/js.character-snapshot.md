---
source: js/character-snapshot.js
lines: 62
exports: 5
imported_by: 4
api_sha: 2a7d1ad3ea43
prose_sha: 2a7d1ad3ea43
generated: 2026-08-26
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
| 12 | const | TOKEN_SNAPSHOT_FORMAT | `TOKEN_SNAPSHOT_FORMAT` | 外部キャラクターシートツールのJSONや、本アプリの汎用インポート形式（{name, parameters}）とは 区別が必要なため、読み込み時はまずこのマーカーの有無で判定する。 |
| 14 | fn | isTokenSnapshot | `isTokenSnapshot(json)` |  |
| 21 | fn | buildTokenSnapshot | `buildTokenSnapshot(token)` | コマの表示・パラメータ・エフェクト/コンボ等の構成要素・バフをすべて含む完全なスナップショットを作る。 |
| 38 | fn | downloadJSON | `downloadJSON(filename, data)` | JSONデータをファイルとしてダウンロードさせる |
| 54 | fn | parseJsonText | `parseJsonText(text)` | JSONテキストをパースする。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 14 | isTokenSnapshot | `isTokenSnapshot(json)` | 3 | ✓ |
| 21 | buildTokenSnapshot | `buildTokenSnapshot(token)` | 15 | ✓ |
| 38 | downloadJSON | `downloadJSON(filename, data)` | 11 | ✓ |
| 54 | parseJsonText | `parseJsonText(text)` | 8 | ✓ |

## 依存

- import → [[js.untrusted-json]]
- imported by → [[js.board-data-driven]], [[js.character-builder]], [[js.chat-palette]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
