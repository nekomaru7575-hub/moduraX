// js/store/handlers/audio.js
// 部屋の音楽（BGM・効果音）の登録と再生。
//
// 音の実体は状態に入れずURLだけを持つ（実体を入れると、アクションのたびに状態ごと
// Redisへ書き直されて帯域を食い潰すため）。実体は Cloudflare R2 にあり、
// アップロードは server/r2.js 経由。

import { AUDIO_CHANNELS } from '../audio.js';
import { withBgmLog } from '../chat.js';
import { ownEntry, withMapEntry, withoutMapEntry } from '../patch.js';

export const AUDIO_HANDLERS = {
  // --- 音楽（BGM／効果音） ---
  // 状態に入るのはURLとメタデータだけ。音の実体はR2側にあり、ここには乗らない。
  ADD_AUDIO_TRACK({ prevState, payload, commit }) {
    const { id, name, url, source, key = null, channel, loop, phrase = null } = payload;
    if (!id || !name || !url) return;
    const room = prevState.room;

    const track = Object.freeze({
      id,
      name,
      url,
      source: source === 'upload' ? 'upload' : 'external',
      key: source === 'upload' ? key : null,
      channel: channel === 'se' ? 'se' : 'bgm',
      loop: Boolean(loop),
      // 発言の末尾がこのフレーズと一致したら鳴らす（js/audio-phrase.js）。空/未設定は鳴らさない。
      phrase: typeof phrase === 'string' && phrase.trim() !== '' ? phrase.trim() : null
    });

    commit({
      room: { ...room, audioTracks: withMapEntry(room.audioTracks, id, track) }
    });
  },

  // 登録済みの音源の再生フレーズだけを変更する（音楽ダイアログの入力欄から）。
  SET_AUDIO_TRACK_PHRASE({ prevState, payload, commit }) {
    const { id, phrase } = payload;
    const room = prevState.room;
    const track = room.audioTracks?.[id];
    if (!track) return;

    const nextPhrase = typeof phrase === 'string' && phrase.trim() !== '' ? phrase.trim() : null;

    commit({
      room: {
        ...room,
        audioTracks: withMapEntry(room.audioTracks, id, Object.freeze({ ...track, phrase: nextPhrase }))
      }
    });
  },

  // 音源を削除する。再生中のものを消した場合は、そのチャンネルも止めておかないと
  // 存在しないtrackIdを指したまま残ってしまう。
  REMOVE_AUDIO_TRACK({ prevState, payload, commit }) {
    const { id } = payload;
    const room = prevState.room;
    if (!room.audioTracks?.[id]) return;

    const playback = room.audioPlayback || { bgm: null, se: null };
    const nextPlayback = {};
    AUDIO_CHANNELS.forEach(channel => {
      nextPlayback[channel] = playback[channel]?.trackId === id
        ? null
        : (playback[channel] ? Object.freeze({ ...playback[channel] }) : null);
    });

    commit({
      room: {
        ...room,
        audioTracks: withoutMapEntry(room.audioTracks, id),
        audioPlayback: Object.freeze(nextPlayback)
      }
    });
  },

  // 指定チャンネルで音源を鳴らす。再生は全員が行える（再生フレーズも同じ経路）。
  // 止めるのは別アクション（STOP_AUDIO_PLAYBACK）。ここでtrackId: nullを受け付けると
  // 停止をGM限定にした意味が無くなるので、必ず鳴らす音源を伴うこと。
  SET_AUDIO_PLAYBACK({ prevState, payload, commit }) {
    const { channel, trackId, playId } = payload;
    if (!AUDIO_CHANNELS.includes(channel)) return;
    const room = prevState.room;
    // 素の audioTracks?.[trackId] だと '__proto__' がObject.prototypeに当たって
    // 「実在する音源」を通ってしまう（ownEntryのコメント参照）。trackIdは部屋データ経由で
    // 外から来る（パネルのクリックオプション）ので、ここは持ち物として引く
    if (!ownEntry(room.audioTracks, trackId)) return;

    const playback = room.audioPlayback || { bgm: null, se: null };

    // 曲が実際に変わったときだけ曲名を残す。同じ曲の鳴らし直し（playIdだけの更新）では
    // 何も書かない：効果音のように連打される使い方でログが埋まらないようにするため。
    const bgmChanged = channel === 'bgm' && playback.bgm?.trackId !== trackId;

    commit({
      room: {
        ...room,
        audioPlayback: withMapEntry(playback, channel, Object.freeze({ trackId, playId }))
      },
      ...(bgmChanged
        ? { chatLogs: withBgmLog(prevState.chatLogs, room.audioTracks, trackId, payload?.time) }
        : {})
    });
  },

  // 指定チャンネルの再生を止める。再生と分けてあるのは、停止だけをGM限定にするため
  // （server/index.jsのGM_ONLY_ACTIONS。「みんなで聴いている音を他人が止められる」のを
  // 防ぐためで、自分にだけ聞こえないようにするミュートはjs/audio-player.js側にある）。
  STOP_AUDIO_PLAYBACK({ prevState, payload, commit }) {
    const { channel } = payload;
    if (!AUDIO_CHANNELS.includes(channel)) return;

    const room = prevState.room;
    const playback = room.audioPlayback || { bgm: null, se: null };
    if (!playback[channel]) return;

    commit({
      room: { ...room, audioPlayback: withMapEntry(playback, channel, null) },
      ...(channel === 'bgm'
        ? { chatLogs: withBgmLog(prevState.chatLogs, room.audioTracks, null, payload?.time) }
        : {})
    });
  },
};