// js/parameters/stella-knights-stage-section.js
// 「⋯」→「拡張ルーム設定」に出す、銀剣のステラナイツの「舞台」の欄（GMだけに出る）。
// 状態の形・進行の規則は js/parameters/stella-knights-stage.js。
// ここは描くことと、操作を dispatchOp へ渡すことだけをする。
//
// 【入力欄は change（確定時）で送る】1文字ごとに送ると、部屋の状態が変わるたびに
// 欄が組み直されて（js/room-extension-dialog.js の render）打鍵のたびに描き直しになる。
// それでも組み直しは起きるので、直前まで触っていた欄へカーソルごと戻す（restoreFocus）。
//
// 【画面に出す文字は必ず textContent】値は部屋の誰か（GM）が入力したもの。

import { generateRoomExtensionItemId } from '../store/ids.js';
import {
  describeCursor, MAX_ROUTINE_EFFECT_LENGTH, MAX_ROUTINE_NAME_LENGTH, MAX_ROUTINES_PER_KIND,
  MAX_STAGE_NAME_LENGTH, normalizeStage, ROUTINE_KIND_LABELS
} from './stella-knights-stage.js';

// 直前まで触っていた欄と、その中のカーソル位置。誰かの操作で欄が組み直された後、
// 同じ場所へ戻すために覚えておく（このブラウザの画面だけの状態で、部屋には載せない）。
// 古い記憶で他人の画面のフォーカスを奪わないよう、時間で切る。
let focusMemo = null;
const FOCUS_MEMO_MS = 3000;

function rememberFocus(element) {
  const key = element?.dataset?.focusKey;
  if (!key) return;
  focusMemo = {
    key,
    start: element.selectionStart ?? null,
    end: element.selectionEnd ?? null,
    at: Date.now()
  };
}

function restoreFocus(container) {
  if (!focusMemo || Date.now() - focusMemo.at > FOCUS_MEMO_MS) return;
  const target = container.querySelector(`[data-focus-key="${CSS.escape(focusMemo.key)}"]`);
  if (!target) return;
  target.focus();
  if (focusMemo.start !== null && typeof target.setSelectionRange === 'function') {
    try { target.setSelectionRange(focusMemo.start, focusMemo.end); } catch { /* 範囲外は諦める */ }
  }
}

function labelled(text, className = 'dialog-form-note') {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
}

function button(text, onClick, { className = 'dialog-remove-row', title = '', disabled = false } = {}) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  if (title) element.title = title;
  element.disabled = disabled;
  element.addEventListener('click', onClick);
  return element;
}

function textField({ value, placeholder, maxLength, focusKey, multiline = false }) {
  const element = document.createElement(multiline ? 'textarea' : 'input');
  if (!multiline) element.type = 'text';
  else element.rows = 2;
  element.className = 'stage-field';
  element.value = value;
  element.placeholder = placeholder;
  element.maxLength = maxLength;
  element.dataset.focusKey = focusKey;
  element.setAttribute('aria-label', placeholder);
  return element;
}

// --- 進行の現在地 -------------------------------------------------------------

function renderProgress(container, stage, dispatchOp) {
  const box = document.createElement('div');
  box.className = 'dialog-custom-list stage-progress';

  // アクションとEXは同時に走らないので、いま動いている側だけを出す
  ['set', stage.cursor.inEx ? 'ex' : 'action'].forEach(kind => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const info = document.createElement('span');
    info.className = 'buff-row-info';
    info.textContent = describeCursor(stage, kind);
    row.appendChild(info);

    row.appendChild(button('← 戻す', () => dispatchOp('stepBack', { kind }), {
      title: `${ROUTINE_KIND_LABELS[kind]}ルーチンの発動を1つ巻き戻す`
    }));
    row.appendChild(button('進める →', () => dispatchOp('stepForward', { kind }), {
      title: `${ROUTINE_KIND_LABELS[kind]}ルーチンの発動を1つ飛ばす`
    }));
    box.appendChild(row);
  });

  const exRow = document.createElement('label');
  exRow.className = 'dialog-custom-row stage-ex-toggle';
  const exCheck = document.createElement('input');
  exCheck.type = 'checkbox';
  exCheck.checked = stage.cursor.inEx;
  exCheck.addEventListener('change', () => dispatchOp('setExMode', { on: exCheck.checked }));
  const exText = document.createElement('span');
  exText.textContent = 'EXルーチンへ移行済み';
  exRow.append(exCheck, exText);
  box.appendChild(exRow);

  const resetRow = document.createElement('div');
  resetRow.className = 'dialog-custom-row';
  resetRow.appendChild(button('進行を最初へ戻す', () => dispatchOp('resetProgress', {}), {
    title: '登録した内容はそのままで、次に発動する位置だけを最初へ戻す'
  }));
  box.appendChild(resetRow);

  container.appendChild(box);
}

// --- ルーチン1件 ---------------------------------------------------------------

function renderRoutineRow(list, stage, kind, routine, index, dispatchOp) {
  const row = document.createElement('div');
  row.className = 'dialog-custom-row stage-routine';
  // いま次に発動するものが一目で分かるようにする（進行の行と同じことを列の側でも示す）
  if (stage.cursor[kind] === index) row.classList.add('stage-routine-next');

  const no = document.createElement('span');
  no.className = 'stage-routine-no';
  no.textContent = `No.${index + 1}`;
  row.appendChild(no);

  const fields = document.createElement('div');
  fields.className = 'stage-routine-fields';

  const name = textField({
    value: routine.name,
    placeholder: '名前',
    maxLength: MAX_ROUTINE_NAME_LENGTH,
    focusKey: `${kind}:${routine.id}:name`
  });
  name.addEventListener('change', () =>
    dispatchOp('editRoutine', { kind, id: routine.id, field: 'name', value: name.value }));

  const effect = textField({
    value: routine.effect,
    placeholder: '効果',
    maxLength: MAX_ROUTINE_EFFECT_LENGTH,
    focusKey: `${kind}:${routine.id}:effect`,
    multiline: true
  });
  effect.addEventListener('change', () =>
    dispatchOp('editRoutine', { kind, id: routine.id, field: 'effect', value: effect.value }));

  fields.append(name, effect);

  // EXへ移行する印。EXルーチン自身は移行先なので持たない
  if (kind !== 'ex') {
    const toEx = document.createElement('label');
    toEx.className = 'stage-to-ex';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = routine.toEx === true;
    check.addEventListener('change', () =>
      dispatchOp('editRoutine', { kind, id: routine.id, field: 'toEx', value: check.checked }));
    const text = document.createElement('span');
    text.textContent = 'この後EXへ移行';
    toEx.append(check, text);
    fields.appendChild(toEx);
  }

  row.appendChild(fields);

  const actions = document.createElement('div');
  actions.className = 'stage-routine-actions';
  actions.appendChild(button('ここから', () => dispatchOp('setCursor', { kind, index }), {
    title: '次に発動するものをこれにする'
  }));
  actions.appendChild(button('今すぐ発動', () => dispatchOp('fireNow', { kind, id: routine.id }), {
    title: 'この1件をMainへ流す（次に発動する位置は動かない）'
  }));
  actions.appendChild(button('↑', () => dispatchOp('moveRoutine', { kind, id: routine.id, direction: 'up' }), {
    title: '1つ上へ', disabled: index === 0
  }));
  actions.appendChild(button('↓', () => dispatchOp('moveRoutine', { kind, id: routine.id, direction: 'down' }), {
    title: '1つ下へ', disabled: index === stage[kind].length - 1
  }));
  actions.appendChild(button('×', () => dispatchOp('removeRoutine', { kind, id: routine.id }), {
    title: 'この1件を削除'
  }));
  row.appendChild(actions);

  list.appendChild(row);
}

// --- セットのループ設定 ---------------------------------------------------------

function renderLoop(container, stage, dispatchOp) {
  const row = document.createElement('div');
  row.className = 'dialog-custom-row stage-loop';

  const lead = document.createElement('span');
  lead.textContent = '撃ち切った後:';
  row.appendChild(lead);

  const mode = document.createElement('select');
  mode.className = 'starting-room-face';
  mode.setAttribute('aria-label', 'セットルーチンを撃ち切った後の扱い');
  [
    { value: 'stop', label: '以降は実行しない' },
    { value: 'repeat', label: '指定の範囲を繰り返す' }
  ].forEach(option => {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    mode.appendChild(element);
  });
  mode.value = stage.loop.mode;
  row.appendChild(mode);

  const max = Math.max(stage.set.length, 1);
  const range = (value, key) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'stage-loop-no';
    input.min = 1;
    input.max = max;
    input.value = value;
    input.dataset.focusKey = `loop:${key}`;
    input.setAttribute('aria-label', key === 'from' ? '繰り返しの開始No.' : '繰り返しの終了No.');
    return input;
  };
  const from = range(stage.loop.from, 'from');
  const to = range(stage.loop.to, 'to');

  const send = () => dispatchOp('setLoop', {
    mode: mode.value, from: Number(from.value), to: Number(to.value)
  });
  mode.addEventListener('change', send);
  from.addEventListener('change', send);
  to.addEventListener('change', send);

  const between = document.createElement('span');
  between.textContent = '〜';
  const suffix = document.createElement('span');
  suffix.textContent = 'を繰り返す';

  const rangeBox = document.createElement('span');
  rangeBox.className = 'stage-loop-range';
  rangeBox.append(document.createTextNode('No.'), from, between, to, suffix);
  // 「以降は実行しない」のときは範囲に意味が無いので触らせない（保存値は残す）
  if (stage.loop.mode !== 'repeat') rangeBox.classList.add('stage-loop-range-off');
  from.disabled = stage.loop.mode !== 'repeat';
  to.disabled = stage.loop.mode !== 'repeat';
  row.appendChild(rangeBox);

  container.appendChild(row);
}

// --- ルーチンの列 ---------------------------------------------------------------

const KIND_NOTES = {
  set: 'ラウンドの最初の「セット」で、上から1ラウンドに1つずつ発動します。',
  action: '種別「ブリンガー」の手番の前に「予兆」として予告し、手番の終了で適用します。末尾まで行くとNo.1へ戻ります。',
  ex: 'EXへ移行した後、アクションルーチンの代わりに発動します。末尾まで行くとNo.1へ戻ります。'
};

function renderKind(container, stage, kind, dispatchOp) {
  const heading = document.createElement('h5');
  heading.className = 'stage-kind-heading';
  heading.textContent = `${ROUTINE_KIND_LABELS[kind]}ルーチン`;
  container.appendChild(heading);
  container.appendChild(labelled(KIND_NOTES[kind]));

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  if (stage[kind].length === 0) {
    list.appendChild(labelled('まだありません。', 'dialog-plugin-placeholder'));
  }
  stage[kind].forEach((routine, index) =>
    renderRoutineRow(list, stage, kind, routine, index, dispatchOp));

  if (kind === 'set' && stage.set.length > 0) renderLoop(list, stage, dispatchOp);

  const full = stage[kind].length >= MAX_ROUTINES_PER_KIND;
  container.appendChild(button('＋ 追加', () =>
    dispatchOp('addRoutine', { kind, id: generateRoomExtensionItemId() }), {
    className: 'dialog-add-row-btn',
    disabled: full,
    title: full ? `1つの列に登録できるのは${MAX_ROUTINES_PER_KIND}件までです` : ''
  }));
}

/**
 * @param {{
 *   container: HTMLElement,
 *   value: object,
 *   dispatchOp: (op: string, args: object) => void,
 *   roundActive: boolean,
 *   isGm: boolean
 * }} context
 */
export function renderStageSection({ container, value, dispatchOp, roundActive }) {
  const stage = normalizeStage(value);

  container.addEventListener('focusin', event => rememberFocus(event.target));
  container.addEventListener('keyup', event => rememberFocus(event.target));

  container.appendChild(labelled(
    'GMだけに見える欄です。登録したルーチンは、ラウンド進行に合わせて自動でMainへ流れます'
    + '（予告は「予兆」、適用は「舞台」として出ます）。'
  ));
  if (!roundActive) {
    container.appendChild(labelled('ラウンド進行を始めると発動が動き出します。'));
  }

  // --- 舞台名 ---
  const nameRow = document.createElement('div');
  nameRow.className = 'dialog-custom-row';
  const name = textField({
    value: stage.name,
    placeholder: '舞台名（任意）',
    maxLength: MAX_STAGE_NAME_LENGTH,
    focusKey: 'stage:name'
  });
  name.addEventListener('change', () => dispatchOp('setName', { value: name.value }));
  nameRow.appendChild(name);
  container.appendChild(nameRow);

  renderProgress(container, stage, dispatchOp);
  ['set', 'action', 'ex'].forEach(kind => renderKind(container, stage, kind, dispatchOp));

  restoreFocus(container);
}
