// js/parameters/stella-knights-stage-box.js
// 舞台のルーチン一覧を編集するボックス（セット／アクション／EXのうち1種別ぶん）。
// 「⋯」→「拡張ルーム設定」→「舞台」のボタンから、モーダルを重ねて開く。
//
// 【なぜ拡張ルーム設定に直接並べないか】1件が名前・効果・EX移行・操作ボタン5つで
// 130px前後あり、3列ぶんを1枚に並べると空でも約560px、各列3件で約1800pxになる。
// 目的の列へ着くまで毎回スクロールすることになるので、列ごとに切り出した。
//
// 【なぜ共通のスキル枠組み（js/parameters/skill/skill-box.js）に乗せないか】
// あちらは「配列を渡して onSave(配列) で丸ごと受け取る」形。舞台は UPDATE_ROOM_EXTENSION の
// 操作（op）で送るので、丸ごと書き戻すと「2人が同時に触っても片方が消えない」という
// 拡張ルーム設定の前提（js/parameters/registry.js）を壊す。ループ設定と「次はこれ」の印も
// spec に居場所がない。専用ボックスにする判断は js/parameters/shinobigami-ougi-box.js と同じ。
//
// 【画面に出す文字は必ず textContent】値は部屋の誰か（GM）が入力したもの。

import { createDialogHost } from '../dialog-host.js';
import { generateRoomExtensionItemId } from '../store/ids.js';
import {
  MAX_ROUTINE_EFFECT_LENGTH, MAX_ROUTINE_NAME_LENGTH, MAX_ROUTINES_PER_KIND,
  normalizeStage, ROUTINE_KIND_LABELS, routineNumberLabel
} from './stella-knights-stage.js';

const ensureDialog = createDialogHost('stage-box-dialog');

const KIND_NOTES = {
  set: 'ラウンドの最初の「セット」で、上から1ラウンドに1つずつ発動します。',
  action: '種別「ブリンガー」の手番の前に「予兆」として予告し、手番の終了で適用します。末尾まで行くとNo.1へ戻ります。',
  ex: 'EXへ移行した後、アクションルーチンの代わりに発動します。末尾まで行くとNo.1へ戻ります。'
};

// 直前まで触っていた欄と、その中のカーソル位置。並べ替えや追加で一覧を組み直した後、
// 同じ場所へ戻すために覚えておく（このブラウザの画面だけの状態で、部屋には載せない）。
// 古い記憶でフォーカスを奪わないよう、時間で切る。
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

// --- ルーチン1件 ---------------------------------------------------------------

function renderRoutineRow(list, stage, kind, routine, index, { dispatchOp, redraw }) {
  const row = document.createElement('div');
  row.className = 'dialog-custom-row stage-routine';
  // いま次に発動するものが一目で分かるようにする（拡張ルーム設定の進行の行と同じことを示す）
  if (stage.cursor[kind] === index) row.classList.add('stage-routine-next');

  const no = document.createElement('span');
  no.className = 'stage-routine-no';
  // ログと同じ言い方で番号を出す（卓とGMが同じ番号を指せるように）
  no.textContent = routineNumberLabel(kind, index);
  row.appendChild(no);

  const fields = document.createElement('div');
  fields.className = 'stage-routine-fields';

  // 【名前・効果の編集では組み直さない】入力欄には既に打った値が入っているので、
  // ここで組み直すとフォーカスとカーソル位置を奪うだけになる。
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
  actions.appendChild(button('ここから', () => redraw('setCursor', { kind, index }), {
    title: '次に発動するものをこれにする'
  }));
  actions.appendChild(button('今すぐ発動', () => dispatchOp('fireNow', { kind, id: routine.id }), {
    title: 'この1件をMainへ流す（次に発動する位置は動かない）'
  }));
  actions.appendChild(button('↑', () => redraw('moveRoutine', { kind, id: routine.id, direction: 'up' }), {
    title: '1つ上へ', disabled: index === 0
  }));
  actions.appendChild(button('↓', () => redraw('moveRoutine', { kind, id: routine.id, direction: 'down' }), {
    title: '1つ下へ', disabled: index === stage[kind].length - 1
  }));
  actions.appendChild(button('×', () => redraw('removeRoutine', { kind, id: routine.id }), {
    title: 'この1件を削除'
  }));
  row.appendChild(actions);

  list.appendChild(row);
}

// --- セットのループ設定 ---------------------------------------------------------

function renderLoop(container, stage, { redraw }) {
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

  // 繰り返すかどうかで範囲の欄の出し入れが変わるので、ここは組み直す
  const send = () => redraw('setLoop', {
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

// --- ボックス -------------------------------------------------------------------

/**
 * 1種別ぶんのルーチン一覧を編集するボックスを開く。
 *
 * @param {{
 *   kind: 'set'|'action'|'ex',
 *   getValue: () => object,                  最新の舞台を読む（拡張ルーム設定から渡ってくる）
 *   dispatchOp: (op: string, args: object) => void,
 *   onClose?: () => void                     閉じたときに呼ぶ（呼び出し側の件数バッジの引き直し）
 * }} options
 */
export function showStageBox({ kind, getValue, dispatchOp, onClose = null }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const body = document.createElement('div');
  body.addEventListener('focusin', event => rememberFocus(event.target));
  body.addEventListener('keyup', event => rememberFocus(event.target));

  // 操作を送ったうえで一覧を組み直す。dispatchはローカルへ即時に当たる（js/net-sync.js）ので、
  // 直後に getValue() を読めば新しい値が返る。
  // 【組み直すのは並びや印が変わる操作だけ】名前と効果の編集で組み直すと、
  // 打ち終えた直後にフォーカスを奪ってしまう（renderRoutineRow のコメント参照）。
  const redraw = (op, args) => {
    if (op) dispatchOp(op, args);
    render();
  };

  function render() {
    const stage = normalizeStage(getValue());
    body.innerHTML = '';

    body.appendChild(labelled(KIND_NOTES[kind]));

    const list = document.createElement('div');
    list.className = 'dialog-custom-list';
    body.appendChild(list);

    if (stage[kind].length === 0) {
      list.appendChild(labelled('まだありません。', 'dialog-plugin-placeholder'));
    }
    stage[kind].forEach((routine, index) =>
      renderRoutineRow(list, stage, kind, routine, index, { dispatchOp, redraw }));

    if (kind === 'set' && stage.set.length > 0) renderLoop(list, stage, { redraw });

    const full = stage[kind].length >= MAX_ROUTINES_PER_KIND;
    body.appendChild(button('＋ 追加', () =>
      redraw('addRoutine', { kind, id: generateRoomExtensionItemId() }), {
      className: 'dialog-add-row-btn',
      disabled: full,
      title: full ? `1つの列に登録できるのは${MAX_ROUTINES_PER_KIND}件までです` : ''
    }));

    restoreFocus(body);
  }

  const heading = document.createElement('h3');
  heading.textContent = `${ROUTINE_KIND_LABELS[kind]}ルーチン`;
  dialog.appendChild(heading);
  dialog.appendChild(body);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(closeBtn);
  dialog.appendChild(btnRow);

  // 閉じたら呼び出し側へ知らせる（拡張ルーム設定のボタンの件数を引き直すため）。
  // 同じホストを使い回すので、購読は毎回1回きりにする。
  if (onClose) dialog.addEventListener('close', onClose, { once: true });

  render();
  if (!dialog.open) dialog.showModal();
}
