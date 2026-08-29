---
source: js/store/patch.js
lines: 75
exports: 8
imported_by: 15
api_sha: 7358b35fc536
prose_sha: 7358b35fc536
generated: 2026-08-29
tags: [codemap]
---

# js/store/patch.js

<!-- prose:summary -->
dispatch 内で繰り返し現れる更新パターンの共通処理。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（8）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | fn | patchCharacter | `patchCharacter(tokensState, id, fields)` | 作業用トークンマップ（dispatch冒頭のnextTokensState）の1コマだけを差し替える。 |
| 20 | fn | withMapEntry | `withMapEntry(map, key, value)` | キー付きマップ（panels / room.originalTables / room.audioTracks / parameters等）の1件追加・更新。 |
| 25 | fn | withoutMapEntry | `withoutMapEntry(map, key)` | 同じマップからの1件削除。 |
| 33 | fn | freezePanelMap | `freezePanelMap(panels)` | パネルのマップを入れ子まで凍らせて写し取る（シーンの保存・適用で使う）。 |
| 42 | fn | normalizeAudience | `normalizeAudience(audience)` | 公開先(audience)を正規化する。 |
| 52 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 58 | fn | definedFields | `definedFields(patch)` | 値がundefinedのキーを落とす。 |
| 72 | fn | fieldPatchFor | `fieldPatchFor(table, action)` | アクション名で規則のテーブルを引く（js/game-store.js の *_FIELD_PATCHES 4種）。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 15 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 | ✓ |
| 20 | withMapEntry | `withMapEntry(map, key, value)` | 3 | ✓ |
| 25 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 | ✓ |
| 33 | freezePanelMap | `freezePanelMap(panels)` | 5 | ✓ |
| 42 | normalizeAudience | `normalizeAudience(audience)` | 4 | ✓ |
| 52 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 58 | definedFields | `definedFields(patch)` | 3 | ✓ |
| 72 | fieldPatchFor | `fieldPatchFor(table, action)` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.game-store]], [[js.store.cards]], [[js.store.chat]], [[js.store.handlers.audio]], [[js.store.handlers.board]], [[js.store.handlers.buffs]], [[js.store.handlers.characters]], [[js.store.handlers.chat]], [[js.store.handlers.info]], [[js.store.handlers.participants]], [[js.store.handlers.room]], [[js.store.handlers.scenes]], [[js.store.info]], [[js.store.params]], [[js.store.round-state]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
