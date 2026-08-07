---
source: js/log-export.js
lines: 100
exports: 1
imported_by: 1
api_sha: bb80684fee9d
prose_sha: bb80684fee9d
generated: 2026-08-07
tags: [codemap]
---

# js/log-export.js

<!-- prose:summary -->
チャットログを「読み物として読めるHTML」へ書き出す。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
チャットログを読み物として読める単体 HTML へ組み立てる純粋関数。スタイルを埋め込んだ自己完結の文字列を返すだけで、ファイル保存は呼び出し側が行う。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 55 | fn | buildLogExportHtml | `buildLogExportHtml({ roomName, tabs, chatLogs })` | 選択されたタブのログを、単体で開ける1枚のHTML文書にまとめて返す。 |

## トップレベル関数・非export（3）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 14 | escapeHtml | `escapeHtml(text)` | 7 |
| 24 | buildEntryHtml | `buildEntryHtml({ character = '', comment = '', resultText = '', diceDetail = '', color = null })` | 1 |
| 37 | buildTabHtml | `buildTabHtml(tab, entries)` | 7 |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
