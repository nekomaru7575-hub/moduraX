// js/audio-player.js
// 部屋の音楽の再生エンジン（UIは持たない。操作はjs/audio-dialog.js側）。
// room.audioPlaybackの変化を購読し、チャンネルごとに用意したAudio要素へ反映する。
// BGMを流したまま効果音を重ねられるよう、チャンネルごとに独立したAudio要素を持つ。
//
// 再生位置（何秒目か）は同期しない。新しいplayIdを見たクライアントは0秒から鳴らす。
// 数秒のずれは実用上問題にならず、位置同期は複雑さに見合わないため。

import { EventBus } from './EventBus.js';
import { AUDIO_CHANNELS } from './game-store.js';

// 音量は「聴く側の好み」なので同期せず、このブラウザだけの設定として保存する
// （local-identity.jsのニックネームと同じ方針）。
const VOLUME_KEY_PREFIX = 'mojulaX:audioVolume:';
const DEFAULT_VOLUME = 0.5;

// チャンネルごとのAudio要素と、最後に適用した再生状態（playId）
const channels = {};

// 自動再生ポリシーで弾かれたことがあるか。ダイアログ側の注意書き表示に使う。
let blockedByAutoplayPolicy = false;

export function getChannelVolume(channel) {
  const saved = localStorage.getItem(VOLUME_KEY_PREFIX + channel);
  const value = Number(saved);
  return Number.isFinite(value) && saved !== null ? value : DEFAULT_VOLUME;
}

export function setChannelVolume(channel, value) {
  const clamped = Math.min(1, Math.max(0, Number(value) || 0));
  localStorage.setItem(VOLUME_KEY_PREFIX + channel, String(clamped));
  if (channels[channel]) channels[channel].audio.volume = clamped;
}

// ページを一度もクリックしていない状態ではブラウザがplay()を拒否する。
// 例外で他の処理を巻き込まないよう握りつぶし、事実だけ記録して伝える。
export function isBlockedByAutoplayPolicy() {
  return blockedByAutoplayPolicy;
}

function applyChannel(channel, entry, tracks) {
  const state = channels[channel];
  const audio = state.audio;

  if (!entry) {
    if (state.appliedPlayId !== null) {
      audio.pause();
      audio.removeAttribute('src');
      state.appliedPlayId = null;
    }
    return;
  }

  // 同じ再生（同じplayId）が続いている間は触らない。触ると毎回頭出しに戻ってしまう。
  if (state.appliedPlayId === entry.playId) return;

  const track = tracks[entry.trackId];
  if (!track) return;

  state.appliedPlayId = entry.playId;
  audio.src = track.dataUrl;
  audio.loop = Boolean(track.loop);
  audio.volume = getChannelVolume(channel);
  audio.currentTime = 0;

  const played = audio.play();
  if (played && typeof played.catch === 'function') {
    played.catch(() => {
      blockedByAutoplayPolicy = true;
      console.warn('[audio] 自動再生がブラウザに拒否されました。画面を一度クリックすると音が出ます。');
    });
  }
}

export function initAudioPlayer() {
  AUDIO_CHANNELS.forEach(channel => {
    const audio = new Audio();
    audio.volume = getChannelVolume(channel);
    channels[channel] = { audio, appliedPlayId: null };
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    const tracks = state.room?.audioTracks || {};
    const playback = state.room?.audioPlayback || {};
    AUDIO_CHANNELS.forEach(channel => applyChannel(channel, playback[channel], tracks));
  });
}
