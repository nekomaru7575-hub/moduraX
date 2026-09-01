---
source: js/identity-dialog.js
lines: 185
exports: 1
imported_by: 1
api_sha: 9282b795cb6f
prose_sha: 9282b795cb6f
generated: 2026-09-01
tags: [codemap]
---

# js/identity-dialog.js

<!-- prose:summary -->
参加者設定ダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
参加者名（ニックネーム）と GM 用パスフレーズの入力ダイアログ。値の保存先は [[js.local-identity]]。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 91 | fn | showIdentityDialog | `showIdentityDialog({ participants, myParticipantId, nickname, devPassphrase, onSubmit, onSetGm, onRemove })` | participants: Record<string, {id:string, nickname:string, isGm:boolean}>, myParticipantId: string \| null, ni… |

## トップレベル関数（LOCAL TASKS 候補）（3）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 11 | buildFormGroup | `buildFormGroup(labelText, input)` | 9 |  |
| 23 | buildParticipantList | `buildParticipantList({ participants, myParticipantId, amGm, onSetGm, onRemove, rerender })` | 56 |  |
| 91 | showIdentityDialog | `showIdentityDialog({ participants, myParticipantId, nickname, devPassphrase, onSubmit, onSetGm, onRemove })` | 94 | ✓ |

## 依存

- import → [[js.dialog-host]], [[js.local-identity]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
