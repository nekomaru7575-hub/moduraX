---
source: js/log-edit-dialog.js
lines: 88
exports: 1
imported_by: 1
api_sha: 71c378e412d7
prose_sha: 71c378e412d7
generated: 2026-08-17
tags: [codemap]
---

# js/log-edit-dialog.js

<!-- prose:summary -->
既に流れた発言の本文を書き直すダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
ログ欄の右クリック（タッチは長押し）から開く、発言1件の本文を書き直すダイアログ。[[js.log-clear-dialog]] と同じ dumb な部品で、入力を受け取ってコールバックへ渡すだけ。「誰が編集してよいか」（[[js.room-authority]] の canEditChatEntry）も、どの発言を指しているか（entryId）も、EDIT_CHAT_MESSAGE の dispatch も、すべて呼び出し側の [[js.main]] が持つ。直せるのは本文だけで、キャラ名・発言時刻・コマンド・出目内訳はこのダイアログに出てこない。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 23 | fn | showLogEditDialog | `showLogEditDialog({ resultText = '', onConfirm })` | onConfirmは中身が実際に変わったときだけ呼ばれる。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 11 | ensureDialog | `ensureDialog()` | 7 |  |
| 23 | showLogEditDialog | `showLogEditDialog({ resultText = '', onConfirm })` | 65 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
本文を空にしての確定はここで断っている（発言そのものを消す機能は無い）。削除を足すなら、このダイアログではなく [[js.main]] のメニュー側に別の項目として置くこと。
<!-- /prose:notes -->
