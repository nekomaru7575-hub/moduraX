---
source: js/visibility.js
lines: 59
exports: 5
imported_by: 7
api_sha: beb5c210042e
prose_sha: beb5c210042e
generated: 2026-08-07
tags: [codemap]
---

# js/visibility.js

<!-- prose:summary -->
「これは誰に見せるものか」(audience) の解釈を1か所にまとめる共通モジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「これは誰に見せるものか」(audience) の解釈を1か所に集めた共通モジュール。GM 判定、閲覧可否、伏せ字マスク、公開範囲の説明文を持つ。コマ・情報・チャットタブ・パラメータのすべてがこの判定を通るので、公開範囲の仕様変更はここから始まる。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | const | HIDDEN_VALUE_MASK | `HIDDEN_VALUE_MASK` | 見せられない値の代わりに出す表記。 |
| 21 | fn | isRestricted | `isRestricted(audience)` |  |
| 30 | fn | isGm | `isGm(participants, participantId)` | その人がGMか。 |
| 40 | fn | canView | `canView(audience, participantId)` | 自分がそれを見てよいか。 |
| 52 | fn | describeAudience | `describeAudience(audience, participants = {})` | 宛先を人間に読める形にする（タブのツールチップ等の表示用）。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | isRestricted | `isRestricted(audience)` | 3 | ✓ |
| 30 | isGm | `isGm(participants, participantId)` | 4 | ✓ |
| 40 | canView | `canView(audience, participantId)` | 6 | ✓ |
| 52 | describeAudience | `describeAudience(audience, participants = {})` | 7 | ✓ |

## 依存

- import → なし
- imported by → [[js.audience-picker]], [[js.board-data-driven]], [[js.character-dialog]], [[js.character-panel]], [[js.info-panel]], [[js.main]], [[js.room-authority]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
