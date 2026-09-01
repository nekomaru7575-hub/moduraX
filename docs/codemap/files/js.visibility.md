---
source: js/visibility.js
lines: 104
exports: 8
imported_by: 11
api_sha: 100a091fb9a3
prose_sha: 100a091fb9a3
generated: 2026-09-01
tags: [codemap]
---

# js/visibility.js

<!-- prose:summary -->
「これは誰に見せるものか」(audience) の解釈を1か所にまとめる共通モジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「これは誰に見せるものか」の解釈を1か所に集めた共通モジュール。軸は2本ある。1本目は宛先（audience）で、GM 判定・閲覧可否・伏せ字マスク・公開範囲の説明文を持つ。コマ・情報・チャットタブ・パラメータのすべてがこの判定を通るので、公開範囲の仕様変更はここから始まる。2本目はシークレットダイスで、宛先ではなく「振った本人だけ」に固定された秘匿。`visibleChatEntry` がチャットログ1件を見せてよい形へ差し替える（画面もログの書き出しも同じこれを通る）。

storeにも DOM にも触らない純粋関数だけを置くこと。状態を読む判定は js/room-authority.js の側にある。
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | const | HIDDEN_VALUE_MASK | `HIDDEN_VALUE_MASK` | 見せられない値の代わりに出す表記。 |
| 21 | fn | isRestricted | `isRestricted(audience)` |  |
| 30 | fn | isGm | `isGm(participants, participantId)` | その人がGMか。 |
| 40 | fn | canView | `canView(audience, participantId)` | 自分がそれを見てよいか。 |
| 58 | const | SECRET_DICE_MASK | `SECRET_DICE_MASK` | 出目の代わりに出す文言。 |
| 67 | fn | canViewSecretDice | `canViewSecretDice(entry, participantId)` | その発言の出目を今の自分が見てよいか。 |
| 83 | fn | visibleChatEntry | `visibleChatEntry(entry, participantId)` | チャットログ1件を、今の自分に見せてよい形にして返す。 |
| 97 | fn | describeAudience | `describeAudience(audience, participants = {})` | 宛先を人間に読める形にする（タブのツールチップ等の表示用）。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 21 | isRestricted | `isRestricted(audience)` | 3 | ✓ |
| 30 | isGm | `isGm(participants, participantId)` | 4 | ✓ |
| 40 | canView | `canView(audience, participantId)` | 6 | ✓ |
| 67 | canViewSecretDice | `canViewSecretDice(entry, participantId)` | 4 | ✓ |
| 83 | visibleChatEntry | `visibleChatEntry(entry, participantId)` | 8 | ✓ |
| 97 | describeAudience | `describeAudience(audience, participants = {})` | 7 | ✓ |

## 依存

- import → なし
- imported by → [[js.audience-picker]], [[js.board-data-driven]], [[js.character-dialog]], [[js.character-panel]], [[js.info-panel]], [[js.log-export]], [[js.main]], [[js.parameters.futarisousa]], [[js.parameters.shinobigami-ougi-box]], [[js.parameters.shinobigami]], [[js.room-authority]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
