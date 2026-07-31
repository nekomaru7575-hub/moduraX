// js/scene-dialog.js
// シーンの作成・編集ダイアログ（一覧はscene-list-dialog.js）。
// 編集できるのは名前・描写テキスト・遷移時のBGMの3つで、盤面（背景・盤面サイズ・パネル）は
// ここでは触らない。盤面は「今の盤面をそのまま写し取る」方式なので、直したいときは
// 一度そのシーンへ遷移して盤面を作り直し、「この盤面で保存し直す」を押す。
//
// dumbな部品：storeを直接触らず、結果をコールバックで返すだけ。

import { SCENE_BGM_STOP } from './game-store.js';

let dialogEl = null;
let escHandler = null; // dialogElは使い回しなので、前回のEscハンドラを外すために保持する

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

function buildFormGroup(labelText, input) {
  const group = document.createElement('div');
  group.className = 'dialog-form-group';
  const label = document.createElement('label');
  label.textContent = labelText;
  group.appendChild(label);
  group.appendChild(input);
  return group;
}

/**
 * sceneを渡すとその内容を初期表示した編集モードになる。
 *
 * onCancelは「一覧へ戻す」用。この画面は一覧が自分を閉じてから開くため、キャンセルで
 * 何も指定しないと一覧ごと閉じたように見えてしまう（original-table-dialog.jsと同じ事情）。
 *
 * @param {{
 *   scene?: { id:string, name:string, text:string, bgmTrackId:string|null } | null,
 *   tracks: Array<{id:string, name:string}>,  BGMチャンネルの音源だけを渡すこと
 *   onConfirm: (result: { name:string, text:string, bgmTrackId:string|null }) => void,
 *   onOverwriteBoard?: ((result: { name:string, text:string, bgmTrackId:string|null }) => void) | null,
 *   onCancel?: (() => void) | null
 * }} options
 */
export function showSceneDialog({ scene = null, tracks = [], onConfirm, onOverwriteBoard = null, onCancel = null }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 閉じ方（キャンセル／Esc／確定）に関わらず、後続処理は一度だけ走らせる
  let settled = false;

  function closeWithCancel() {
    if (settled) return;
    settled = true;
    dialog.close();
    if (onCancel) onCancel();
  }

  // Escで閉じたときも一覧へ戻したい。<dialog>のcloseイベントは環境によって発火しないため、
  // keydownで自前に処理する。dialogElは使い回しなので前回分を必ず外してから登録する。
  if (escHandler) dialog.removeEventListener('keydown', escHandler);
  escHandler = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeWithCancel();
  };
  dialog.addEventListener('keydown', escHandler);

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = scene ? 'シーン編集' : 'シーンの保存';
  form.appendChild(heading);

  if (!scene) {
    const note = document.createElement('p');
    note.className = 'audio-note';
    note.textContent = '今の背景・盤面サイズ・パネルをこのシーンとして保存します。コマは含みません。';
    form.appendChild(note);
  }

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = '例: 廃教会・地下';
  if (scene) nameInput.value = scene.name;
  form.appendChild(buildFormGroup('シーン名', nameInput));

  const textInput = document.createElement('textarea');
  textInput.rows = 10;
  textInput.placeholder = '読み上げる描写やNPCのセリフなどを書いておけます。';
  if (scene) textInput.value = scene.text || '';
  form.appendChild(buildFormGroup('シナリオ描写・NPCのセリフ', textInput));

  // BGM欄。「変更しない」と「停止する」を先頭に置き、その後ろにBGMチャンネルの曲を並べる。
  const bgmSelect = document.createElement('select');
  const bgmOptions = [
    { value: '', label: '変更しない' },
    { value: SCENE_BGM_STOP, label: '停止する' },
    ...tracks.map(track => ({ value: track.id, label: track.name }))
  ];
  bgmOptions.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    bgmSelect.appendChild(option);
  });
  // 参照先の音源が削除されていると選択肢に無いので、その場合は「変更しない」に落ちる
  bgmSelect.value = scene?.bgmTrackId || '';
  if (bgmSelect.value !== (scene?.bgmTrackId || '')) bgmSelect.value = '';
  form.appendChild(buildFormGroup('遷移時のBGM', bgmSelect));

  if (tracks.length === 0) {
    const trackNote = document.createElement('p');
    trackNote.className = 'audio-note';
    trackNote.textContent = 'BGMに使える音源がまだありません（ヘッダーの「♪」から登録できます）。';
    form.appendChild(trackNote);
  }

  function collect() {
    return {
      name: nameInput.value.trim(),
      text: textInput.value,
      bgmTrackId: bgmSelect.value || null
    };
  }

  // 編集モードのみ。「遷移→盤面を直す→上書き保存」の受け皿で、今の盤面を写し直す。
  if (scene && onOverwriteBoard) {
    const overwriteBtn = document.createElement('button');
    overwriteBtn.type = 'button';
    overwriteBtn.className = 'dialog-add-row-btn';
    overwriteBtn.textContent = 'この盤面で保存し直す';
    overwriteBtn.title = '今の背景・盤面サイズ・パネルで、このシーンの内容を置き換えます';
    overwriteBtn.addEventListener('click', () => {
      const result = collect();
      if (!result.name) {
        alert('シーン名を入力してください。');
        return;
      }
      if (!confirm(`シーン「${result.name}」の盤面を、今の背景・盤面サイズ・パネルで置き換えますか？`)) return;
      settled = true;
      dialog.close();
      onOverwriteBoard(result);
    });
    form.appendChild(overwriteBtn);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', closeWithCancel);

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.className = 'dialog-confirm-btn';
  confirmBtn.textContent = scene ? '保存' : '登録';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = collect();
    if (!result.name) {
      alert('シーン名を入力してください。');
      return;
    }
    settled = true;
    dialog.close();
    onConfirm(result);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
