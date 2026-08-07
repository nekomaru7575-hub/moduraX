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

// ミュートも同じくこのブラウザだけの設定。再生の停止（STOP_AUDIO_PLAYBACK）はGM限定なので、
// 「今は聴きたくない」人はこちらで自分の環境だけ黙らせる。音量0と違って、元の音量を
// 覚えたまま切り替えられるようにするため別の設定として持つ。
const MUTED_KEY = 'mojulaX:audioMuted';

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

export function isMuted() {
  return localStorage.getItem(MUTED_KEY) === '1';
}

// ミュート中でも再生自体は続いている（音が出ないだけ）。解除した時点の続きから聞こえるのは、
// 部屋のみんなと同じところを聴くという意味では自然な振る舞いなのでそのままにしている。
export function setMuted(muted) {
  localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  AUDIO_CHANNELS.forEach(channel => {
    if (channels[channel]) channels[channel].audio.muted = !!muted;
  });
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
  // dataUrlへのフォールバックは、URL参照へ移行する前に登録された部屋のデータを鳴らすため
  audio.src = track.url || track.dataUrl;
  audio.loop = Boolean(track.loop);
  audio.volume = getChannelVolume(channel);
  audio.muted = isMuted();
  audio.currentTime = 0;

  const played = audio.play();
  if (played && typeof played.catch === 'function') {
    played.catch(() => {
      blockedByAutoplayPolicy = true;
      console.warn('[audio] 自動再生がブラウザに拒否されました。画面を一度クリックすると音が出ます。');
    });
  }
}

// 入室音。room.audioTracksに登録された曲とは別枠の一回きりの再生で、チャンネルの
// 音量・ミュート管理（channels/getChannelVolume等）には乗せない。urlが無ければ
// （サーバーのENTRY_SOUND_URL未設定）何もしない＝Audio()自体を作らない。
export function playEntrySound(url) {
  if (!url) return;
  const audio = new Audio(url);
  const played = audio.play();
  if (played && typeof played.catch === 'function') {
    played.catch(() => {
      console.warn('[audio] 入室音の自動再生がブラウザに拒否されました。');
    });
  }
}

export function initAudioPlayer() {
  AUDIO_CHANNELS.forEach(channel => {
    const audio = new Audio();
    audio.volume = getChannelVolume(channel);
    audio.muted = isMuted();
    channels[channel] = { audio, appliedPlayId: null };
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    const tracks = state.room?.audioTracks || {};
    const playback = state.room?.audioPlayback || {};
    AUDIO_CHANNELS.forEach(channel => applyChannel(channel, playback[channel], tracks));
  });
}
