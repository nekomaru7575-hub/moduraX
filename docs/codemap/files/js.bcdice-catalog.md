---
source: js/bcdice-catalog.js
lines: 121
exports: 4
imported_by: 2
api_sha: 0fd78808c734
prose_sha: 0fd78808c734
generated: 2026-08-26
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
| 36 | fn | fetchGameSystems | `fetchGameSystems()` | BCDiceのシステム一覧を取得する。 |
| 63 | fn | fetchGameSystemInfo | `fetchGameSystemInfo(systemId)` | 指定システムのcommand_pattern・help_messageを取得する。 |
| 96 | fn | getCommandPattern | `async getCommandPattern(systemId)` | 指定システムのコマンド判定用の正規表現を返す。 |
| 117 | fn | prefetchGameSystemInfo | `prefetchGameSystemInfo(systemId)` | 指定システムの情報をあらかじめ取りに行く（結果は待たない）。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 26 | fetchJson | `async fetchJson(url)` | 5 |  |
| 36 | fetchGameSystems | `fetchGameSystems()` | 21 | ✓ |
| 63 | fetchGameSystemInfo | `fetchGameSystemInfo(systemId)` | 25 | ✓ |
| 96 | getCommandPattern | `async getCommandPattern(systemId)` | 14 | ✓ |
| 117 | prefetchGameSystemInfo | `prefetchGameSystemInfo(systemId)` | 4 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
