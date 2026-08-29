---
source: js/audio-phrase.js
lines: 41
exports: 1
imported_by: 1
api_sha: 7afb51c79476
prose_sha: 7afb51c79476
generated: 2026-08-29
tags: [codemap]
---

# js/audio-phrase.js

<!-- prose:summary -->
音源に設定した「再生フレーズ」と発言の照合。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
発言テキストの末尾が、音源に設定された「再生フレーズ」と一致するかを調べるだけの小さなモジュール。チャット送信時に [[js.main]] から呼ばれ、一致すればその音源の再生へつながる。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 22 | fn | findTrackByPhraseSuffix | `findTrackByPhraseSuffix(tracks, text)` | 発言の末尾に一致する再生フレーズを持つ音源を返す。 |

## トップレベル関数（LOCAL TASKS 候補）（2）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 9 | normalize | `normalize(text)` | 3 |  |
| 22 | findTrackByPhraseSuffix | `findTrackByPhraseSuffix(tracks, text)` | 19 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
