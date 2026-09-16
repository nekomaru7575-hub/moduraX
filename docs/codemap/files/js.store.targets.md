---
source: js/store/targets.js
lines: 82
exports: 4
imported_by: 3
api_sha: fb64e217030e
prose_sha: fb64e217030e
generated: 2026-09-16
tags: [codemap]
---

# js/store/targets.js

<!-- prose:summary -->
ターゲット（Core機能）：参加者が「いま狙っているコマ」を1体だけ指定する仕組みの、状態の形と読み取り。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（4）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | fn | normalizeTargetedBy | `normalizeTargetedBy(value)` | コマのtargetedByを読める形へ均す。 |
| 38 | fn | withTarget | `withTarget(tokensState, participantId, tokenId)` | SET_TARGETの中身。 |
| 63 | fn | findTargetOf | `findTargetOf(tokens, participantId)` | その参加者のいまのターゲット（盤面にいるコマ）。 |
| 77 | fn | listTargeterNames | `listTargeterNames(token, participants)` | そのコマをターゲットにしている参加者の表示名。 |

## トップレベル関数（LOCAL TASKS 候補）（5）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | isParticipantId | `isParticipantId(value)` | 3 |  |
| 25 | normalizeTargetedBy | `normalizeTargetedBy(value)` | 4 | ✓ |
| 38 | withTarget | `withTarget(tokensState, participantId, tokenId)` | 19 | ✓ |
| 63 | findTargetOf | `findTargetOf(tokens, participantId)` | 6 | ✓ |
| 77 | listTargeterNames | `listTargeterNames(token, participants)` | 5 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.main]], [[js.store.handlers.characters]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
