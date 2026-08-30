---
source: js/untrusted-json.js
lines: 29
exports: 1
imported_by: 9
api_sha: b23b7feae826
prose_sha: b23b7feae826
generated: 2026-08-30
tags: [codemap]
---

# js/untrusted-json.js

<!-- prose:summary -->
自分が書いたのではないJSONの読み方。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 26 | fn | parseUntrustedJson | `parseUntrustedJson(text)` | 外から来たJSON文字列を、危険なキーを落として読む。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 26 | parseUntrustedJson | `parseUntrustedJson(text)` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.character-snapshot]], [[js.deck-file]], [[js.main]], [[js.net-host]], [[js.net-signaling]], [[js.net-transport-rtc]], [[js.net-transport-ws]], [[js.room-index]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
