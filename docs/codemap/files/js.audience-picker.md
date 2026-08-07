---
source: js/audience-picker.js
lines: 189
exports: 2
imported_by: 5
api_sha: 755efa722885
prose_sha: 755efa722885
generated: 2026-08-07
tags: [codemap]
---

# js/audience-picker.js

<!-- prose:summary -->
「誰に見せるか」(audience)を選ぶ共通UI。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
「誰に見せるか」(audience) を選ぶ UI 部品と、それをモーダルとして出す関数を提供する。可視判定そのものは持たず、判断ロジックは [[js.visibility]] にある。コマ・チャットタブ・情報の各ダイアログから共通で呼ばれる。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 24 | fn | buildAudiencePicker | `buildAudiencePicker({ audience, participants, myParticipantId, everyoneLabel = '全員に公開', limitedLabel = '選んだ参加者だけに公開', showNote = true })` | 公開範囲（全員／選んだ人だけ）と、その宛先チェックリストを組み立てる。 |
| 141 | fn | showAudienceDialog | `showAudienceDialog({ title, description, audience, participants, myParticipantId, onConfirm })` | 宛先だけを決める小さなダイアログ（パラメータ1件・パネルのテキスト等から使う）。 |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 24 | buildAudiencePicker | `buildAudiencePicker({ audience, participants, myParticipantId, everyoneLabel = '全員に公開', limitedLabel = '選んだ参加者だけに公開', showNote = true })` | 95 | ✓ |
| 122 | ensureDialog | `ensureDialog()` | 7 |  |
| 141 | showAudienceDialog | `showAudienceDialog({ title, description, audience, participants, myParticipantId, onConfirm })` | 48 | ✓ |

## 依存

- import → [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.character-dialog]], [[js.chat-tab-dialog]], [[js.info-entry-dialog]], [[js.info-panel]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
