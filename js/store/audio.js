// js/store/audio.js
// 音楽（BGM・効果音）まわりの語彙。再生エンジンは js/audio-player.js 側にあり、
// ここが持つのは状態に載る値の名前だけ。


// 音楽のチャンネル。BGMを流したまま効果音を重ねられるよう2枠に分けてある
// （js/audio-player.jsが枠ごとに1つずつAudio要素を持つ）。
export const AUDIO_CHANNELS = ['bgm', 'se'];

// チャンネルの表示名（音楽ダイアログの見出し・チャットへの再生ログで共通に使う）。
export const AUDIO_CHANNEL_LABELS = { bgm: 'BGM', se: '効果音' };

// シーンのbgmTrackIdに入れると「遷移時にBGMを止める」を意味する特別な値。
// nullは「BGMを変えない」なので、1つのフィールドで3通り（変えない/止める/この曲）を表す。
// 音源のidは必ず 'audio-' で始まる（js/main.jsの採番）ため、実在の曲と衝突しない。
export const SCENE_BGM_STOP = 'stop';
