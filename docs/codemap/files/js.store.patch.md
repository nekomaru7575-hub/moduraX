---
source: js/store/patch.js
lines: 92
exports: 9
imported_by: 16
api_sha: 618acb12243d
prose_sha: 618acb12243d
generated: 2026-09-09
tags: [codemap]
---

# js/store/patch.js

<!-- prose:summary -->
dispatch 内で繰り返し現れる更新パターンの共通処理。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
dispatch の中で繰り返し現れる更新パターンを畳んだ道具立て。case 側が「どのスライスをどう変えるか」だけを書けるようにするためのもので、凍結（Object.freeze）はここが面倒を見るので case 側は原則 freeze を書かない。マップの1件追加・更新・削除（withMapEntry / withoutMapEntry）、コマ1件の差し替え（patchCharacter）、シーンで使うパネルマップの深い凍結（freezePanelMap）、公開先と重なり順の正規化（normalizeAudience / normalizeStackOrder）、undefined のキー落とし（definedFields）、そしてアクション名でテーブルを引く fieldPatchFor と、自分の持ち物としてマップを引く ownEntry。個々のアクションの意味は知らず、それは [[js.game-store]] と js/store/handlers/ の各ファイルが持つ。
<!-- /prose:role -->

## export（9）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 15 | fn | patchCharacter | `patchCharacter(tokensState, id, fields)` | 作業用トークンマップ（dispatch冒頭のnextTokensState）の1コマだけを差し替える。 |
| 20 | fn | withMapEntry | `withMapEntry(map, key, value)` | キー付きマップ（panels / room.originalTables / room.audioTracks / parameters等）の1件追加・更新。 |
| 25 | fn | withoutMapEntry | `withoutMapEntry(map, key)` | 同じマップからの1件削除。 |
| 43 | fn | ownEntry | `ownEntry(map, id)` | マップから自分の持ち物としての1件を引く。 |
| 50 | fn | freezePanelMap | `freezePanelMap(panels)` | パネルのマップを入れ子まで凍らせて写し取る（シーンの保存・適用で使う）。 |
| 59 | fn | normalizeAudience | `normalizeAudience(audience)` | 公開先(audience)を正規化する。 |
| 69 | fn | normalizeStackOrder | `normalizeStackOrder(value)` | パネルの重なり順（stackOrder）を0以上の整数にそろえる。 |
| 75 | fn | definedFields | `definedFields(patch)` | 値がundefinedのキーを落とす。 |
| 89 | fn | fieldPatchFor | `fieldPatchFor(table, action)` | アクション名で規則のテーブルを引く（js/game-store.js の *_FIELD_PATCHES 4種）。 |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 15 | patchCharacter | `patchCharacter(tokensState, id, fields)` | 3 | ✓ |
| 20 | withMapEntry | `withMapEntry(map, key, value)` | 3 | ✓ |
| 25 | withoutMapEntry | `withoutMapEntry(map, key)` | 5 | ✓ |
| 43 | ownEntry | `ownEntry(map, id)` | 4 | ✓ |
| 50 | freezePanelMap | `freezePanelMap(panels)` | 5 | ✓ |
| 59 | normalizeAudience | `normalizeAudience(audience)` | 4 | ✓ |
| 69 | normalizeStackOrder | `normalizeStackOrder(value)` | 3 | ✓ |
| 75 | definedFields | `definedFields(patch)` | 3 | ✓ |
| 89 | fieldPatchFor | `fieldPatchFor(table, action)` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.game-store]], [[js.store.cards]], [[js.store.chat]], [[js.store.handlers.audio]], [[js.store.handlers.board]], [[js.store.handlers.buffs]], [[js.store.handlers.characters]], [[js.store.handlers.chat]], [[js.store.handlers.info]], [[js.store.handlers.participants]], [[js.store.handlers.room]], [[js.store.handlers.scenes]], [[js.store.info]], [[js.store.params]], [[js.store.round-state]]

## 注意

<!-- prose:notes -->
`ownEntry` と `fieldPatchFor` は、素の `map[id]` / `TABLE[action]` で引いてはいけないために在る。`'__proto__'` や `'toString'` を渡されると Object.prototype 上の値に当たって「実在しないのに真」になる。実際、パネルのクリックオプションに `sceneId:'__proto__'` を仕込んだ部屋データを読ませたところ、APPLY_SCENE が処理を続けて盤面のパネルが全部消えた。**必ずここを通すこと。**

`normalizeStackOrder` は描画側（[[js.board-data-driven]]）も読むときに同じ関数を通す。片方だけ変えると、状態に入っている値と画面上の重なりがずれる。

`normalizeAudience` は空配列を「全員に公開」へ丸めない。呼び出し側が配列を渡した以上は限定公開の意図なので、不具合が情報漏れの側へ倒れないようにしてある。
<!-- /prose:notes -->
