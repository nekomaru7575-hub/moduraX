---
source: js/bcdice-catalog.js
lines: 109
exports: 4
imported_by: 2
api_sha: 0fd78808c734
prose_sha: 0fd78808c734
generated: 2026-08-07
tags: [codemap]
---

# js/bcdice-catalog.js

<!-- prose:summary -->
BCDiceの「システム一覧」と「システム情報（command_pattern / help_message）」を 取得するクライアント共通モジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
BCDice のシステム一覧とシステム個別情報（`command_pattern` / `help_message`）を取得してキャッシュするクライアント。ダイスを振る [[js.BCdice]] とは別で、こちらは「どんなシステムがあるか」「どんなコマンドが打てるか」を扱う。部屋一覧ページとルーム本体の両方から使われる。
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 28 | fn | fetchGameSystems | `fetchGameSystems()` | BCDiceのシステム一覧を取得する。 |
| 53 | fn | fetchGameSystemInfo | `fetchGameSystemInfo(systemId)` | 指定システムのcommand_pattern・help_messageを取得する。 |
| 84 | fn | getCommandPattern | `async getCommandPattern(systemId)` | 指定システムのコマンド判定用の正規表現を返す。 |
| 105 | fn | prefetchGameSystemInfo | `prefetchGameSystemInfo(systemId)` | 指定システムの情報をあらかじめ取りに行く（結果は待たない）。 |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 18 | fetchJson | `async fetchJson(url)` | 5 |

## 依存

- import → なし
- imported by → [[js.main]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
