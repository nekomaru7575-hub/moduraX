---
source: js/room-import.js
lines: 757
exports: 0
imported_by: 0
api_sha: 97d170e1550e
prose_sha: 97d170e1550e
generated: 2026-09-09
tags: [codemap]
---

# js/room-import.js

<!-- prose:summary -->
部屋データの取り込み（room-import.html）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（0）

なし（エントリポイント、または副作用のみのモジュール）。

## トップレベル関数（LOCAL TASKS 候補）（15）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | log | `log(msg, cls)` | 7 |  |
| 35 | progress | `progress(done, total)` | 3 |  |
| 55 | inflateRaw | `async inflateRaw(bytes)` | 4 |  |
| 60 | findEocd | `findEocd(b)` | 8 |  |
| 69 | listZipEntries | `listZipEntries(b)` | 22 |  |
| 92 | readZipEntry | `async readZipEntry(b, entry)` | 9 |  |
| 108 | isAnimatedWebp | `isAnimatedWebp(b)` | 12 |  |
| 127 | blobToDataUrl | `blobToDataUrl(blob)` | 8 |  |
| 143 | shrinkToWebp | `async shrinkToWebp(bytes, mime, targetW, targetH, quality)` | 18 |  |
| 178 | buildStackRanks | `buildStackRanks(data)` | 14 |  |
| 201 | toPanel | `toPanel(id, src, field, stackOrder, keepOnSceneChange, clickAction = null)` | 19 |  |
| 240 | toClickAction | `toClickAction(src, sceneIdByName, report)` | 25 |  |
| 287 | findHoistableMarkers | `findHoistableMarkers(scenes)` | 24 |  |
| 322 | fitToBudget | `async fitToBudget(encoded, refCounts, budgetBytes, options, log)` | 25 |  |
| 351 | convert | `async convert(zipBytes, options)` | **330** |  |

## 依存

- import → なし
- imported by → なし（エントリポイント）

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
