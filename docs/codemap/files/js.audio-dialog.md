---
source: js/audio-dialog.js
lines: 504
exports: 1
imported_by: 1
api_sha: d08a5809b47e
prose_sha: d08a5809b47e
generated: 2026-08-27
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
| 196 | fn | showAudioDialog | `showAudioDialog({ tracks, playback, canAddTrack = true, canStop = true, onAdd, onPlay, onStop, onRemove, onPhraseChange })` | 追加・再生・削除は即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数（LOCAL TASKS 候補）（9）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 38 | formatBytes | `formatBytes(bytes)` | 5 |  |
| 45 | stripExtension | `stripExtension(filename)` | 3 |  |
| 51 | ensureDialog | `ensureDialog()` | 7 |  |
| 60 | currentRoomId | `currentRoomId()` | 3 |  |
| 71 | currentMaxBytes | `currentMaxBytes()` | 3 |  |
| 75 | fetchUploadCapability | `fetchUploadCapability(onResolved)` | 13 |  |
| 95 | uploadAudioFile | `async uploadAudioFile(file)` | 21 |  |
| 120 | buildAddRow | `buildAddRow(defaultName, onSubmit)` | 56 |  |
| 196 | showAudioDialog | `showAudioDialog({ tracks, playback, canAddTrack = true, canStop = true, onAdd, onPlay, onStop, onRemove, onPhraseChange })` | **308** | ✓ |

## 依存

- import → [[js.audio-player]], [[js.file-uploader]], [[js.game-store]], [[js.icons]], [[js.local-identity]], [[js.room-entry]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
