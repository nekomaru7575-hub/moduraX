---
source: js/room-authority-rules.js
lines: 93
exports: 2
imported_by: 3
api_sha: e51908621897
prose_sha: e51908621897
generated: 2026-08-21
tags: [codemap]
---

# js/room-authority-rules.js

<!-- prose:summary -->
「部屋そのものを左右する操作をしてよいのは誰か」の規則そのもの。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 27 | fn | canParticipantOperateAsGm | `canParticipantOperateAsGm(participants, participantId)` | 部屋レベルの操作をしてよいか。 |
| 40 | const | GM_ONLY_ACTIONS | `GM_ONLY_ACTIONS` | GMだけが行えるアクション。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 27 | canParticipantOperateAsGm | `canParticipantOperateAsGm(participants, participantId)` | 6 | ✓ |

## 依存

- import → なし
- imported by → [[js.net-host]], [[js.room-authority]], [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
