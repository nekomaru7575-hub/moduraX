---
source: js/net-transport.js
lines: 85
exports: 3
imported_by: 1
api_sha: 5a6cff8a3b51
prose_sha: 5a6cff8a3b51
generated: 2026-08-27
tags: [codemap]
---

# js/net-transport.js

<!-- prose:summary -->
「同期のメッセージを運ぶ道」の契約と、どの実装を使うかの選択。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 31 | const | CLOSE_CODES | `CLOSE_CODES` | 切断の理由。 |
| 48 | fn | isHostMode | `isHostMode()` | この画面がホスト役として動くか。 |
| 64 | fn | createTransport | `createTransport(handlers)` | このページで使うトランスポートを1本作る。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 48 | isHostMode | `isHostMode()` | 4 | ✓ |
| 64 | createTransport | `createTransport(handlers)` | 21 | ✓ |

## 依存

- import → [[js.net-transport-rtc]], [[js.net-transport-ws]]
- imported by → [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
