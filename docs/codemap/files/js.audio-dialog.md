---
source: js/audio-dialog.js
lines: 468
exports: 1
imported_by: 1
api_sha: d08a5809b47e
prose_sha: d08a5809b47e
generated: 2026-08-07
tags: [codemap]
---

# js/audio-dialog.js

<!-- prose:summary -->
部屋の音楽ダイアログ（ヘッダーの「♪」から開く）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
部屋の音楽の操作 UI。音源の追加・削除・再生指示・チャンネル音量の変更をここで受け、実際の再生は [[js.audio-player]] が行う。音源ファイルのアップロードは [[js.file-uploader]] 経由でサーバーへ渡る。
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 194 | fn | showAudioDialog | `showAudioDialog({ tracks, playback, canAddTrack = true, canStop = true, onAdd, onPlay, onStop, onRemove, onPhraseChange })` | 追加・再生・削除は即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数・非export（8）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 36 | formatBytes | `formatBytes(bytes)` | 5 |
| 43 | stripExtension | `stripExtension(filename)` | 3 |
| 49 | ensureDialog | `ensureDialog()` | 7 |
| 58 | currentRoomId | `currentRoomId()` | 3 |
| 69 | currentMaxBytes | `currentMaxBytes()` | 3 |
| 73 | fetchUploadCapability | `fetchUploadCapability(onResolved)` | 13 |
| 93 | uploadAudioFile | `async uploadAudioFile(file)` | 21 |
| 118 | buildAddRow | `buildAddRow(defaultName, onSubmit)` | 56 |

## 依存

- import → [[js.audio-player]], [[js.file-uploader]], [[js.game-store]], [[js.local-identity]], [[js.room-entry]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
