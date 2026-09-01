---
source: js/audio-dialog.js
lines: 514
exports: 1
imported_by: 1
api_sha: d08a5809b47e
prose_sha: d08a5809b47e
generated: 2026-09-01
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
| 200 | fn | showAudioDialog | `showAudioDialog({ tracks, playback, canAddTrack = true, canStop = true, onAdd, onPlay, onStop, onRemove, onPhraseChange })` | 追加・再生・削除は即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 42 | formatBytes | `formatBytes(bytes)` | 5 |  |
| 49 | stripExtension | `stripExtension(filename)` | 3 |  |
| 56 | currentRoomId | `currentRoomId()` | 3 |  |
| 67 | currentMaxBytes | `currentMaxBytes()` | 5 |  |
| 73 | fetchUploadCapability | `fetchUploadCapability(onResolved)` | 13 |  |
| 93 | uploadAudioFile | `async uploadAudioFile(file)` | 27 |  |
| 124 | buildAddRow | `buildAddRow(defaultName, onSubmit)` | 56 |  |
| 200 | showAudioDialog | `showAudioDialog({ tracks, playback, canAddTrack = true, canStop = true, onAdd, onPlay, onStop, onRemove, onPhraseChange })` | **314** | ✓ |

## 依存

- import → [[js.asset-store]], [[js.asset-sync]], [[js.audio-player]], [[js.dialog-host]], [[js.file-uploader]], [[js.game-store]], [[js.icons]], [[js.local-identity]], [[js.net-transport]], [[js.room-entry]]
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
