---
source: js/store/audio.js
lines: 17
exports: 3
imported_by: 4
api_sha: 1e0581007e69
prose_sha: 1e0581007e69
generated: 2026-09-02
tags: [codemap]
---

# js/store/audio.js

<!-- prose:summary -->
音楽（BGM・効果音）まわりの語彙。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 8 | const | AUDIO_CHANNELS | `AUDIO_CHANNELS` | 音楽のチャンネル。 |
| 11 | const | AUDIO_CHANNEL_LABELS | `AUDIO_CHANNEL_LABELS` | チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。 |
| 16 | const | SCENE_BGM_STOP | `SCENE_BGM_STOP` | シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。 |

## トップレベル関数（LOCAL TASKS 候補）（0）

なし（`function 名(...) {}` 宣言がトップレベルに無い）。

## 依存

- import → なし
- imported by → [[js.game-store]], [[js.store.chat]], [[js.store.handlers.audio]], [[js.store.handlers.scenes]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
