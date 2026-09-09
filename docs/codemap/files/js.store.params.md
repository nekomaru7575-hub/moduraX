---
source: js/store/params.js
lines: 74
exports: 6
imported_by: 4
api_sha: 8648bfb091d8
prose_sha: 8648bfb091d8
generated: 2026-09-09
tags: [codemap]
---

# js/store/params.js

<!-- prose:summary -->
パラメータマップ（コマの parameters / room.parameters）を差し替えるための道具立て。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 14 | fn | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 指定パラメータの実効値（基礎値＋アクティブなバフ/デバフの合計）を返す。 |
| 31 | fn | withParamFields | `withParamFields(params, paramId, fields)` | パラメータマップ（コマのparameters / room.parameters）の1件を差し替える。 |
| 39 | fn | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 上記の「手入力による直接編集」版。 |
| 48 | fn | withoutParam | `withoutParam(params, paramId, label)` | パラメータ1件を削除する。 |
| 60 | fn | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | ユーザー定義パラメータ（source:'user'）1件の定義を作る。 |
| 69 | fn | withNewUserParam | `withNewUserParam(params, def)` | ユーザー定義パラメータを1件追加する。 |

## トップレベル関数（LOCAL TASKS 候補）（6）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 14 | getEffectiveParameterValue | `getEffectiveParameterValue(token, paramId)` | 14 | ✓ |
| 31 | withParamFields | `withParamFields(params, paramId, fields)` | 5 | ✓ |
| 39 | withEditableParamFields | `withEditableParamFields(params, paramId, fields, label)` | 7 | ✓ |
| 48 | withoutParam | `withoutParam(params, paramId, label)` | 9 | ✓ |
| 60 | buildUserParam | `buildUserParam({ key, label, value, visible, audience })` | 7 | ✓ |
| 69 | withNewUserParam | `withNewUserParam(params, def)` | 5 | ✓ |

## 依存

- import → [[js.store.patch]]
- imported by → [[js.game-store]], [[js.store.handlers.characters]], [[js.store.handlers.room]], [[js.store.round-state]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
