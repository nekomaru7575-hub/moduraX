// js/audio-dialog.js
// 部屋の音楽ダイアログ（ヘッダーの「♪」から開く）。音源の登録・再生・停止・削除と、
// 音量調整を行う。実際の再生はjs/audio-player.jsが状態の変化を見て行う。

import { pickFileAsDataUrl } from './file-uploader.js';
import { getChannelVolume, setChannelVolume, isBlockedByAutoplayPolicy } from './audio-player.js';

// 音源はDataURLのまま部屋の状態に入り、WebSocketで全員へ配られてRedisにも保存される。
// 大きいファイルを入れると同期・保存が破綻するため、追加時点で弾く。
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const CHANNEL_LABELS = { bgm: 'BGM', se: '効果音' };

// 今回のUIでは「BGM（ループ）」「効果音（単発）」の2択で、チャンネルとループ有無をまとめて決める。
// 状態側はchannelとloopを別に持っているため、将来「ループする効果音」等へ広げられる。
const TRACK_KINDS = [
  { value: 'bgm', label: 'BGM（ループ）', channel: 'bgm', loop: true },
  { value: 'se', label: '効果音（単発）', channel: 'se', loop: false }
];

// DataURLの実バイト数の目安（base64部分の長さから逆算する）。
function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor(base64.length * 3 / 4) - padding;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 曲名の既定値。「BGM_戦闘.mp3」→「BGM_戦闘」
function stripExtension(filename) {
  return String(filename).replace(/\.[^.]+$/, '');
}

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

// 音源1件分の入力（曲名・種別）。ファイル選択の後に続けて聞く。
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

  const okBtn = document.createElement('button');
  okBtn.type = 'button';
  okBtn.textContent = '登録';
  okBtn.className = 'dialog-confirm-btn';
  okBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('曲名を入力してください。');
      return;
    }
    onSubmit({ name, kind: TRACK_KINDS.find(k => k.value === kindSelect.value) });
  });

  wrap.appendChild(nameInput);
  wrap.appendChild(kindSelect);
  wrap.appendChild(okBtn);
  return wrap;
}

/**
 * 追加・再生・削除は即時反映のため、この画面の確定ボタンは無く「閉じる」だけ。
 * 呼び出し側は状態を変えたあとこの関数を呼び直せば、最新の内容で開き直せる。
 *
 * @param {{
 *   tracks: Record<string, {id:string, name:string, dataUrl:string, channel:string, loop:boolean}>,
 *   playback: Record<string, {trackId:string, playId:string}|null>,
 *   onAdd: (result: {name:string, dataUrl:string, channel:string, loop:boolean}) => void,
 *   onPlay: (track: object) => void,
 *   onStop: (channel: string) => void,
 *   onRemove: (trackId: string) => void
 * }} options
 */
export function showAudioDialog({ tracks, playback, onAdd, onPlay, onStop, onRemove }) {
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
  Object.entries(CHANNEL_LABELS).forEach(([channel, label]) => {
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

  const volumeNote = document.createElement('p');
  volumeNote.className = 'audio-note';
  volumeNote.textContent = '音量はこのブラウザだけの設定です（他の参加者には影響しません）。';
  container.appendChild(volumeNote);

  // --- 再生中 ---
  Object.entries(CHANNEL_LABELS).forEach(([channel, label]) => {
    const entry = playback?.[channel];
    const track = entry ? tracks[entry.trackId] : null;

    const row = document.createElement('div');
    row.className = 'audio-playing-row';

    const text = document.createElement('span');
    text.className = 'audio-playing-text';
    text.textContent = track ? `${label}: ${track.name}` : `${label}: 停止中`;
    row.appendChild(text);

    if (track) {
      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.textContent = '停止';
      stopBtn.addEventListener('click', () => onStop(channel));
      row.appendChild(stopBtn);
    }

    container.appendChild(row);
  });

  // --- 音源一覧 ---
  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  container.appendChild(listEl);

  const trackList = Object.values(tracks);

  if (trackList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dialog-empty-note';
    empty.textContent = 'まだ音源がありません。';
    listEl.appendChild(empty);
  }

  let totalBytes = 0;
  trackList.forEach(track => {
    totalBytes += estimateDataUrlBytes(track.dataUrl);

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'dialog-table-name-btn';
    playBtn.textContent = `▶ ${track.name}`;
    playBtn.title = `${CHANNEL_LABELS[track.channel] || track.channel} として再生`;
    playBtn.addEventListener('click', () => onPlay(track));
    row.appendChild(playBtn);

    const kindLabel = document.createElement('span');
    kindLabel.className = 'audio-track-kind';
    kindLabel.textContent = CHANNEL_LABELS[track.channel] || track.channel;
    row.appendChild(kindLabel);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.addEventListener('click', () => {
      if (!confirm(`音源「${track.name}」を削除しますか？`)) return;
      onRemove(track.id);
    });
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });

  // 音源は部屋の状態ごと全員へ配られるため、増えすぎに気づけるよう合計サイズを出しておく
  if (trackList.length > 0) {
    const totalNote = document.createElement('p');
    totalNote.className = 'audio-note';
    totalNote.textContent = `登録済み ${trackList.length}件 / 合計 ${formatBytes(totalBytes)}`;
    container.appendChild(totalNote);
  }

  // --- 追加 ---
  const addArea = document.createElement('div');
  container.appendChild(addArea);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 音楽ファイルを追加';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.addEventListener('click', async () => {
    const picked = await pickFileAsDataUrl({ accept: 'audio/*' });
    if (!picked) return;

    if (picked.file.size > MAX_AUDIO_BYTES) {
      alert(`ファイルが大きすぎます（${formatBytes(picked.file.size)}）。\n`
        + `音源は部屋のデータとして全員へ共有されるため、${formatBytes(MAX_AUDIO_BYTES)}までにしてください。`);
      return;
    }

    addArea.innerHTML = '';
    addArea.appendChild(buildAddRow(stripExtension(picked.file.name), ({ name, kind }) => {
      onAdd({ name, dataUrl: picked.dataUrl, channel: kind.channel, loop: kind.loop });
    }));
  });
  container.appendChild(addBtn);

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
