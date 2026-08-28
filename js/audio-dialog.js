// js/audio-dialog.js
// 部屋の音楽ダイアログ（ヘッダーの「♪」から開く）。音源の登録・再生・停止・削除と、
// 音量調整を行う。実際の再生はjs/audio-player.jsが状態の変化を見て行う。

import { pickFile } from './file-uploader.js';
import { getCurrentParticipantId, getCurrentAuthToken } from './local-identity.js';
import { entryPasswordHeaders } from './room-entry.js';
import {
  getChannelVolume, setChannelVolume, getSystemVolume, setSystemVolume,
  isBlockedByAutoplayPolicy, isMuted, setMuted
} from './audio-player.js';
import { AUDIO_CHANNEL_LABELS } from './game-store.js';
import { setIconText } from './icons.js';
import { createDialogHost } from './dialog-host.js';

// サーバーが上限を教えてくれるまでの暫定値（server/index.jsのMAX_AUDIO_MBの既定と同じ）。
// 実際の判定にはサーバーから取得した値を使う（下のcurrentMaxBytes参照）。
const DEFAULT_MAX_AUDIO_BYTES = 20 * 1024 * 1024;

// 音源の追加（アップロード・URL）と削除を止めている理由。ボタンのツールチップと注記に使う。
// 削除も止めるのは、再生中の音源を消せば止まってしまい、停止をGM限定にした意味が無くなるため。
const TRACK_GM_ONLY_NOTE = '音源の追加と削除はGMだけが行えます（再生は全員できます）。';

// 停止を止めている理由。再生中の音は全員で聴いているものなので、勝手に止められないようにし、
// 「自分は聴きたくない」場合の逃げ道としてミュートを案内する。
const STOP_GM_ONLY_NOTE = '再生中の音楽を止められるのはGMだけです。'
  + '自分にだけ聞こえないようにするには「ミュート」をお使いください。';

const PHRASE_PLACEHOLDER = '再生フレーズ（任意）';
const PHRASE_HINT = '発言の末尾がこのフレーズと一致すると再生されます（空欄なら鳴りません）';

// 今回のUIでは「BGM（ループ）」「効果音（単発）」の2択で、チャンネルとループ有無をまとめて決める。
// 状態側はchannelとloopを別に持っているため、将来「ループする効果音」等へ広げられる。
const TRACK_KINDS = [
  { value: 'bgm', label: 'BGM（ループ）', channel: 'bgm', loop: true },
  { value: 'se', label: '効果音（単発）', channel: 'se', loop: false }
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 曲名の既定値。「BGM_戦闘.mp3」→「BGM_戦闘」
function stripExtension(filename) {
  return String(filename).replace(/\.[^.]+$/, '');
}

const ensureDialog = createDialogHost();

// 現在の部屋ID。アップロード先の指定に使う（サーバー側で実在する部屋か検証される）。
function currentRoomId() {
  return new URLSearchParams(location.search).get('room') || '';
}

// サーバーにR2の設定があるか（＝アップロードが使えるか）と、サーバーが許すファイルサイズ。
// 開くたびに問い合わせても仕方ないので一度取ったら保持する。
// 取得できるまではアップロードを有効として扱い、失敗したら実行時に弾かれる。
let uploadCapability = null;

// アップロード前のサイズ判定はサーバーの上限に合わせる。ここが食い違うと、サーバー側で
// 弾かれた際にブラウザには理由が届かず（応答前に接続を切るため）通信失敗にしか見えない。
function currentMaxBytes() {
  return uploadCapability?.maxBytes || DEFAULT_MAX_AUDIO_BYTES;
}

function fetchUploadCapability(onResolved) {
  if (uploadCapability) {
    onResolved(uploadCapability);
    return;
  }
  fetch('/api/audio')
    .then(r => r.json())
    .then(body => {
      uploadCapability = body;
      onResolved(body);
    })
    .catch(() => { /* 取得できなければ従来どおり（実行時に判明する） */ });
}

// 選んだファイルをサーバー経由でR2へ上げ、再生用の公開URLを受け取る。
// ブラウザからR2を直接叩かないので、R2側のCORS設定は不要。
//
// サーバーはアップロードをGM限定にしているため、WebSocketでの名乗りと同じ2つの値を
// ヘッダに載せる（server/index.jsのhandleAudioUpload）。名乗り用のトークンなので、
// ログに残りうるクエリ文字列ではなくヘッダで送る。
async function uploadAudioFile(file) {
  const headers = { 'Content-Type': file.type || 'audio/mpeg', ...entryPasswordHeaders() };
  const participantId = getCurrentParticipantId();
  const authToken = getCurrentAuthToken();
  if (participantId && authToken) {
    headers['X-Participant-Id'] = participantId;
    headers['X-Auth-Token'] = authToken;
  }

  const response = await fetch(`/api/audio?room=${encodeURIComponent(currentRoomId())}`, {
    method: 'POST',
    headers,
    body: file
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `アップロードに失敗しました (${response.status})`);
  }
  return body; // { key, url }
}

// 音源1件分の入力（曲名・種別・再生フレーズ）。ファイル選択／URL入力の後に続けて聞く。
// onSubmitは非同期でもよい（アップロードはここを押してから走る）。待っている間は
// ボタンを止める。二重に押せると同じファイルを2回上げてしまい、片方が孤児になるため。
function buildAddRow(defaultName, onSubmit) {
  const wrap = document.createElement('div');
  wrap.className = 'audio-add-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = defaultName;
  nameInput.placeholder = '曲名';

  const kindSelect = document.createElement('select');
  TRACK_KINDS.forEach(kind => {
    const opt = document.createElement('option');
    opt.value = kind.value;
    opt.textContent = kind.label;
    kindSelect.appendChild(opt);
  });

  const phraseInput = document.createElement('input');
  phraseInput.type = 'text';
  phraseInput.className = 'audio-track-phrase';
  phraseInput.placeholder = PHRASE_PLACEHOLDER;
  phraseInput.title = PHRASE_HINT;

  const okBtn = document.createElement('button');
  okBtn.type = 'button';
  okBtn.textContent = '登録';
  okBtn.className = 'dialog-confirm-btn';
  okBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('曲名を入力してください。');
      return;
    }

    okBtn.disabled = true;
    okBtn.textContent = '登録中…';
    try {
      await onSubmit({
        name,
        kind: TRACK_KINDS.find(k => k.value === kindSelect.value),
        phrase: phraseInput.value.trim()
      });
    } catch (error) {
      // 失敗したら押し直せるように戻す（成功時はダイアログごと開き直されるので戻す必要はない）
      alert(error.message);
      okBtn.disabled = false;
      okBtn.textContent = '登録';
    }
  });

  wrap.appendChild(nameInput);
  wrap.appendChild(kindSelect);
  wrap.appendChild(phraseInput);
  wrap.appendChild(okBtn);
  return wrap;
}

/**
 * 追加・再生・削除は即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
 * 呼び出し側は状態を変えたあとこの関数を呼び直せば、最新の内容で開き直せる。
 *
 * @param {{
 *   tracks: Record<string, {id:string, name:string, url:string, channel:string, loop:boolean, phrase?:string|null}>,
 *   playback: Record<string, {trackId:string, playId:string}|null>,
 *   canAddTrack?: boolean 音源を追加・削除してよいか（GM限定。既定は可）。
 *     falseなら追加・削除のボタンを押せない状態にして理由を示す。再生は制限しない。
 *   canStop?: boolean 再生中の音楽を止めてよいか（GM限定。既定は可）。
 *     falseなら停止ボタンを押せない状態にして、代わりにミュートを案内する。
 *   onAdd: (result: {name:string, url:string, source:string, key:string|null, channel:string, loop:boolean, phrase:string}) => void,
 *   onPlay: (track: object) => void,
 *   onStop: (channel: string) => void,
 *   onRemove: (trackId: string) => void,
 *   onPhraseChange: (result: {id: string, phrase: string}) => void
 *     フレーズの変更だけはダイアログを開き直さない（入力の流れを切らないため）。
 * }} options
 */
export function showAudioDialog({
  tracks, playback, canAddTrack = true, canStop = true,
  onAdd, onPlay, onStop, onRemove, onPhraseChange
}) {
  const dialog = ensureDialog();
  // 操作のたびに開き直す使い方をするため、開いたままのshowModalで例外にならないようにする
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  const container = document.createElement('div');

  const heading = document.createElement('h3');
  heading.textContent = '音楽';
  container.appendChild(heading);

  if (isBlockedByAutoplayPolicy()) {
    const warn = document.createElement('p');
    warn.className = 'audio-note audio-note-warn';
    warn.textContent = 'ブラウザに自動再生を止められました。画面を一度クリックしてから再生してください。';
    container.appendChild(warn);
  }

  // --- 音量（このブラウザだけの設定） ---
  Object.entries(AUDIO_CHANNEL_LABELS).forEach(([channel, label]) => {
    const row = document.createElement('div');
    row.className = 'audio-volume-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'audio-volume-label';
    labelEl.textContent = `${label} 音量`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(getChannelVolume(channel) * 100));

    const valueEl = document.createElement('span');
    valueEl.className = 'audio-volume-value';
    valueEl.textContent = slider.value;

    slider.addEventListener('input', () => {
      setChannelVolume(channel, Number(slider.value) / 100);
      valueEl.textContent = slider.value;
    });

    row.appendChild(labelEl);
    row.appendChild(slider);
    row.appendChild(valueEl);
    container.appendChild(row);
  });

  // システム音（入室音・チャット送信音）の音量。BGM/効果音のチャンネル音量とは別の設定で、
  // 部屋の共有状態（room.audioPlayback / AUDIO_CHANNELS）には乗らない
  // （js/audio-player.jsのgetSystemVolume/setSystemVolume参照）。
  const systemVolumeRow = document.createElement('div');
  systemVolumeRow.className = 'audio-volume-row';

  const systemVolumeLabel = document.createElement('span');
  systemVolumeLabel.className = 'audio-volume-label';
  systemVolumeLabel.textContent = 'システム音（入室・チャット送信） 音量';

  const systemVolumeSlider = document.createElement('input');
  systemVolumeSlider.type = 'range';
  systemVolumeSlider.min = '0';
  systemVolumeSlider.max = '100';
  systemVolumeSlider.value = String(Math.round(getSystemVolume() * 100));

  const systemVolumeValueEl = document.createElement('span');
  systemVolumeValueEl.className = 'audio-volume-value';
  systemVolumeValueEl.textContent = systemVolumeSlider.value;

  systemVolumeSlider.addEventListener('input', () => {
    setSystemVolume(Number(systemVolumeSlider.value) / 100);
    systemVolumeValueEl.textContent = systemVolumeSlider.value;
  });

  systemVolumeRow.appendChild(systemVolumeLabel);
  systemVolumeRow.appendChild(systemVolumeSlider);
  systemVolumeRow.appendChild(systemVolumeValueEl);
  container.appendChild(systemVolumeRow);

  // ミュート（このブラウザだけ）。停止と違って部屋の再生状態には触れないので、GMでなくても押せる。
  const muteRow = document.createElement('div');
  muteRow.className = 'audio-volume-row';

  const muteLabel = document.createElement('span');
  muteLabel.className = 'audio-volume-label';
  muteLabel.textContent = 'ミュート';
  muteRow.appendChild(muteLabel);

  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  function renderMuteBtn() {
    if (isMuted()) {
      setIconText(muteBtn, 'volume-off', 'ミュート中（解除する）');
    } else {
      setIconText(muteBtn, 'volume-on', '自分だけミュートする');
    }
  }
  renderMuteBtn();
  muteBtn.addEventListener('click', () => {
    setMuted(!isMuted());
    renderMuteBtn();
  });
  muteRow.appendChild(muteBtn);
  container.appendChild(muteRow);

  const volumeNote = document.createElement('p');
  volumeNote.className = 'audio-note';
  volumeNote.textContent = '音量とミュートはこのブラウザだけの設定です（他の参加者には影響しません）。';
  container.appendChild(volumeNote);

  // --- 再生中 ---
  Object.entries(AUDIO_CHANNEL_LABELS).forEach(([channel, label]) => {
    const entry = playback?.[channel];
    const track = entry ? tracks[entry.trackId] : null;

    const row = document.createElement('div');
    row.className = 'audio-playing-row';

    const text = document.createElement('span');
    text.className = 'audio-playing-text';
    text.textContent = track ? `${label}: ${track.name}` : `${label}: 停止中`;
    row.appendChild(text);

    if (track) {
      // 停止はGM限定。ボタンを消すと「なぜ出ないのか」が分からないので、
      // 押せない状態で残して理由（とミュートという代わりの手段）を示す。
      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.textContent = '停止';
      stopBtn.disabled = !canStop;
      if (!canStop) stopBtn.title = STOP_GM_ONLY_NOTE;
      stopBtn.addEventListener('click', () => onStop(channel));
      row.appendChild(stopBtn);
    }

    container.appendChild(row);
  });

  if (!canStop) {
    const stopNote = document.createElement('p');
    stopNote.className = 'audio-note';
    stopNote.textContent = STOP_GM_ONLY_NOTE;
    container.appendChild(stopNote);
  }

  // --- 音源一覧 ---
  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  container.appendChild(listEl);

  const phraseNote = document.createElement('p');
  phraseNote.className = 'audio-note';
  phraseNote.textContent = '再生フレーズを設定すると、発言の末尾がそのフレーズと一致したときに鳴ります。'
    + (canStop ? '「演奏停止」と発言すると全て止まります。' : '');
  container.appendChild(phraseNote);

  const trackList = Object.values(tracks);

  if (trackList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだ音源がありません。';
    listEl.appendChild(empty);
  }

  trackList.forEach(track => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'dialog-table-name-btn';
    setIconText(playBtn, 'play', track.name);
    playBtn.title = `${AUDIO_CHANNEL_LABELS[track.channel] || track.channel} として再生`;
    playBtn.addEventListener('click', () => onPlay(track));
    row.appendChild(playBtn);

    const kindLabel = document.createElement('span');
    kindLabel.className = 'audio-track-kind';
    kindLabel.textContent = AUDIO_CHANNEL_LABELS[track.channel] || track.channel;
    row.appendChild(kindLabel);

    // 再生フレーズ。フォーカスを外した時（change）にだけ反映する。
    const phraseInput = document.createElement('input');
    phraseInput.type = 'text';
    phraseInput.className = 'audio-track-phrase';
    phraseInput.placeholder = PHRASE_PLACEHOLDER;
    phraseInput.title = PHRASE_HINT;
    phraseInput.value = track.phrase ?? '';
    phraseInput.addEventListener('change', () => {
      onPhraseChange({ id: track.id, phrase: phraseInput.value.trim() });
    });
    row.appendChild(phraseInput);

    // 削除も追加と同じくGM限定（消せば再生も止まるため、停止の制限の抜け道になる）。
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.disabled = !canAddTrack;
    if (!canAddTrack) removeBtn.title = TRACK_GM_ONLY_NOTE;
    removeBtn.addEventListener('click', () => {
      if (!confirm(`音源「${track.name}」を削除しますか？`)) return;
      onRemove(track.id);
    });
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });

  // --- 追加 ---
  const addArea = document.createElement('div');
  container.appendChild(addArea);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 音楽ファイルを追加';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.addEventListener('click', async () => {
    const file = await pickFile({ accept: 'audio/*' });
    if (!file) return;

    if (file.size > currentMaxBytes()) {
      alert(`ファイルが大きすぎます（${formatBytes(file.size)}）。\n${formatBytes(currentMaxBytes())}までにしてください。`);
      return;
    }

    // アップロードは「登録」を押してから走らせる。先に上げてしまうと、曲名を入れずに
    // ダイアログを閉じた場合にR2へ置いたきり状態から参照されない孤児が残るため
    // （部屋を削除しても消える対象にならない）。
    addArea.innerHTML = '';
    addArea.appendChild(buildAddRow(stripExtension(file.name), async ({ name, kind, phrase }) => {
      const { url, key } = await uploadAudioFile(file);
      onAdd({ name, url, source: 'upload', key, channel: kind.channel, loop: kind.loop, phrase });
    }));
  });
  container.appendChild(addBtn);

  // R2が未設定のサーバーではアップロードできないので、押す前に分かるようにしておく
  // （URLでの追加は設定に関係なく使える）。GM以外には既に別の理由で止めているので、
  // そちらの表示を上書きしないよう問い合わせ自体を行わない。
  if (canAddTrack) fetchUploadCapability(({ uploadEnabled }) => {
    if (uploadEnabled) return;
    addBtn.disabled = true;
    addBtn.textContent = '音楽ファイルのアップロードは利用できません';
    addBtn.title = 'サーバーに音源の保存先が設定されていません。「URLで追加」をご利用ください。';
  });

  // 容量を使いたくないとき用に、他所に置いた音源を参照する経路も用意する
  const addUrlBtn = document.createElement('button');
  addUrlBtn.type = 'button';
  addUrlBtn.textContent = '+ URLで追加';
  addUrlBtn.className = 'dialog-add-row-btn';
  addUrlBtn.addEventListener('click', () => {
    const url = prompt('音源のURLを入力してください（共有ページではなく、ファイル本体のURL）');
    if (url === null) return;

    const trimmed = url.trim();
    // 本番(https)ページからhttpの音源を読むと混在コンテンツで無言で失敗するため、httpsを必須にする。
    // ページ自体がhttpのローカル開発時だけはhttpも通す（その場合は混在コンテンツにならない）。
    const isAllowed = trimmed.startsWith('https://')
      || (location.protocol === 'http:' && trimmed.startsWith('http://'));
    if (!isAllowed) {
      alert('https:// で始まるURLを指定してください。\n'
        + '共有ページのURLではなく、ファイル本体を直接指すURLが必要です。');
      return;
    }

    addArea.innerHTML = '';
    // ファイル名らしき最後のパス要素を曲名の初期値にする
    const defaultName = stripExtension(decodeURIComponent(trimmed.split('/').pop() || '').split('?')[0]);
    addArea.appendChild(buildAddRow(defaultName, ({ name, kind, phrase }) => {
      onAdd({ name, url: trimmed, source: 'external', key: null, channel: kind.channel, loop: kind.loop, phrase });
    }));
  });
  container.appendChild(addUrlBtn);

  // 音源の追加はGM限定（誰がGMかの判定は呼び出し側。js/room-authority.js参照）。
  // ボタンを消すと「なぜ出ないのか」が分からないので、押せない状態で残して理由を示す。
  if (!canAddTrack) {
    [addBtn, addUrlBtn].forEach(btn => {
      btn.disabled = true;
      btn.title = TRACK_GM_ONLY_NOTE;
    });

    const gmNote = document.createElement('p');
    gmNote.className = 'audio-note';
    gmNote.textContent = TRACK_GM_ONLY_NOTE;
    container.appendChild(gmNote);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.addEventListener('click', () => dialog.close());

  btnRow.appendChild(closeBtn);
  container.appendChild(btnRow);

  dialog.appendChild(container);
  dialog.showModal();
}
