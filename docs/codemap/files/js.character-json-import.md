---
source: js/character-json-import.js
lines: 37
exports: 1
imported_by: 2
api_sha: 14b713383b38
prose_sha: 14b713383b38
generated: 2026-08-07
tags: [codemap]
---

# js/character-json-import.js

<!-- prose:summary -->
汎用（プラグイン未適用時）のキャラクターJSON読み込み。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
プラグインが当たっていないときの汎用キャラクター JSON 取り込み。プラグインがある場合は [[js.parameters.registry]] 側の取り込みが優先され、こちらはフォールバックとして呼ばれる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 18 | fn | importCharacterJsonGeneric | `importCharacterJsonGeneric(json)` | name?: string, valueOverrides: Record<string, number>, labelOverrides: Record<string, string>, newParameters… |

## トップレベル関数・非export（0）

なし。

## 依存

- import → なし
- imported by → [[js.board-data-driven]], [[js.character-builder]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
