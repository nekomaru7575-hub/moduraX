---
source: js/audio-player.js
lines: 109
exports: 6
imported_by: 3
api_sha: fd8f602654b2
prose_sha: fd8f602654b2
generated: 2026-08-07
tags: [codemap]
---

# js/audio-player.js

<!-- prose:summary -->
部屋の音楽の再生エンジン（UIは持たない。操作はjs/audio-dialog.js側）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
音の再生エンジン。UI を一切持たず、チャンネルごとの音量・ミュート状態と、ブラウザの自動再生ポリシーによる再生ブロックの検出を担う。状態は [[js.game-store]] から取り、変化は [[js.EventBus]] 経由で受ける。操作 UI は [[js.audio-dialog]]。
<!-- /prose:role -->

## export（6）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 28 | fn | getChannelVolume | `getChannelVolume(channel)` |  |
| 34 | fn | setChannelVolume | `setChannelVolume(channel, value)` |  |
| 40 | fn | isMuted | `isMuted()` |  |
| 46 | fn | setMuted | `setMuted(muted)` | ミュート中でも再生自体は続いている（音が出ないだけ）。 |
| 55 | fn | isBlockedByAutoplayPolicy | `isBlockedByAutoplayPolicy()` | ページを一度もクリックしていない状態ではブラウザがplay()を拒否する。 |
| 95 | fn | initAudioPlayer | `initAudioPlayer()` |  |

## トップレベル関数・非export（1）

`## LOCAL TASKS` の候補。行数が大きいものはローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 |
|---:|---|---|---:|
| 59 | applyChannel | `applyChannel(channel, entry, tracks)` | 35 |

## 依存

- import → [[js.EventBus]], [[js.game-store]]
- imported by → [[js.audio-dialog]], [[js.dice-animation]], [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
