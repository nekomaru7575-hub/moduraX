---
source: js/audio-player.js
lines: 155
exports: 10
imported_by: 4
api_sha: 571e45c043d8
prose_sha: 571e45c043d8
generated: 2026-08-30
tags: [codemap]
---

# js/audio-player.js

<!-- prose:summary -->
部屋の音楽（BGM・効果音）とシステム音（入室音・チャット送信音）の再生エンジン（UIは持たない。操作は[[js.audio-dialog]]側）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
room.audioPlayback（BGM・効果音のチャンネル）の再生をAUDIO_CHANNELSごとのAudio要素で管理し、STATE_CHANGEDを購読して同期する。入室音・チャット送信音（playEntrySound/playChatSendSound）は一回きりの再生で、このチャンネル管理には乗せず、localStorageの専用キー（システム音量）だけを掛ける。このシステム音量は部屋の共有状態（AUDIO_CHANNELSやroom.audioPlayback）には入らない別系統で、isMuted/setMutedによるミュートも適用されない（消したい場合はシステム音量を0にする）。UIは持たず、操作は[[js.audio-dialog]]側。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 28 | fn | getChannelVolume | `getChannelVolume(channel)` |  |
| 34 | fn | setChannelVolume | `setChannelVolume(channel, value)` |  |
| 45 | fn | getSystemVolume | `getSystemVolume()` |  |
| 51 | fn | setSystemVolume | `setSystemVolume(value)` |  |
| 56 | fn | isMuted | `isMuted()` |  |
| 62 | fn | setMuted | `setMuted(muted)` | ミュート中でも再生自体は続いている（音が出ないだけ）。 |
| 71 | fn | isBlockedByAutoplayPolicy | `isBlockedByAutoplayPolicy()` | ページを一度もクリックしていない状態ではブラウザがplay()を拒否する。 |
| 114 | fn | playEntrySound | `playEntrySound(url)` | 入室音。 |
| 129 | fn | playChatSendSound | `playChatSendSound(url)` | チャット送信音。 |
| 141 | fn | initAudioPlayer | `initAudioPlayer()` |  |

## トップレベル関数（LOCAL TASKS 候補）（11）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | getChannelVolume | `getChannelVolume(channel)` | 5 | ✓ |
| 34 | setChannelVolume | `setChannelVolume(channel, value)` | 5 | ✓ |
| 45 | getSystemVolume | `getSystemVolume()` | 5 | ✓ |
| 51 | setSystemVolume | `setSystemVolume(value)` | 4 | ✓ |
| 56 | isMuted | `isMuted()` | 3 | ✓ |
| 62 | setMuted | `setMuted(muted)` | 6 | ✓ |
| 71 | isBlockedByAutoplayPolicy | `isBlockedByAutoplayPolicy()` | 3 | ✓ |
| 75 | applyChannel | `applyChannel(channel, entry, tracks)` | 35 |  |
| 114 | playEntrySound | `playEntrySound(url)` | 11 | ✓ |
| 129 | playChatSendSound | `playChatSendSound(url)` | 11 | ✓ |
| 141 | initAudioPlayer | `initAudioPlayer()` | 14 | ✓ |

## 依存

- import → [[js.EventBus]], [[js.game-store]]
- imported by → [[js.audio-dialog]], [[js.dice-animation]], [[js.main]], [[js.net-sync]]

## 注意

<!-- prose:notes -->
入室音・チャット送信音は `room.audioPlayback` に乗らない（BGM/効果音と違い同期対象の状態ではなく、ACTION メッセージの payload だけで一回きり運ばれる）。**状態を見てもこの2つの再生履歴は追えない。**
<!-- /prose:notes -->
