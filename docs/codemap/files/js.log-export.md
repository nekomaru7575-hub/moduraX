---
source: js/log-export.js
lines: 104
exports: 1
imported_by: 1
api_sha: bb80684fee9d
prose_sha: bb80684fee9d
generated: 2026-08-21
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
| 57 | fn | buildLogExportHtml | `buildLogExportHtml({ roomName, tabs, chatLogs })` | 選択されたタブのログを、単体で開ける1枚のHTML文書にまとめて返す。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | buildEntryHtml | `buildEntryHtml({ character = '', comment = '', resultText = '', diceDetail = '', color = null, time, editedAt = null })` | 22 |  |
| 39 | buildTabHtml | `buildTabHtml(tab, entries)` | 7 |  |
| 57 | buildLogExportHtml | `buildLogExportHtml({ roomName, tabs, chatLogs })` | 47 | ✓ |

## 依存

- import → [[js.html-escape]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
