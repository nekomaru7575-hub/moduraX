// js/parameters/stella-knights-stage-section.js
// 「⋯」→「拡張ルーム設定」に出す、銀剣のステラナイツの「舞台」の欄（GMだけに出る）。
// 状態の形・進行の規則は js/parameters/stella-knights-stage.js。
// ここは描くことと、操作を dispatchOp へ渡すことだけをする。
//
// 【ここに置くのは、卓の最中に一番見るものだけ】進行の現在地と、次に何が来るか。
// ルーチンの登録と編集は列ごとのボックス（js/parameters/stella-knights-stage-box.js）へ出した。
// 3列ぶんを1枚に並べると空でも約560px、各列3件で約1800pxになり、目的の列へ着くまで
// 毎回スクロールすることになるため。
//
// 【画面に出す文字は必ず textContent】値は部屋の誰か（GM）が入力したもの。

import {
  describeCursor, MAX_STAGE_NAME_LENGTH, normalizeStage, ROUTINE_KIND_LABELS
} from './stella-knights-stage.js';
import { showStageBox } from './stella-knights-stage-box.js';

function labelled(text, className = 'dialog-form-note') {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
}

function button(text, onClick, { className = 'dialog-remove-row', title = '' } = {}) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  if (title) element.title = title;
  element.addEventListener('click', onClick);
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

// --- ルーチンの列を開くボタン ------------------------------------------------------

function renderKindButtons(container, stage, { getValue, dispatchOp }) {
  const row = document.createElement('div');
  row.className = 'dialog-custom-row stage-kind-buttons';

  ['set', 'action', 'ex'].forEach(kind => {
    // 件数はボタンの文字に出す。ボックスを閉じたときに引き直す（閉じるまで変わらないので、
    // 開いている間に数え直す必要はない）。
    const label = () => `${ROUTINE_KIND_LABELS[kind]}ルーチン（${normalizeStage(getValue())[kind].length}）`;
    const open = button(label(), () => {
      showStageBox({
        kind,
        getValue,
        dispatchOp,
        onClose: () => { open.textContent = label(); }
      });
    }, { className: 'dialog-add-row-btn stage-kind-button' });
    row.appendChild(open);
  });

  container.appendChild(row);
}

/**
 * @param {{
 *   container: HTMLElement,
 *   value: object,
 *   getValue: () => object,
 *   dispatchOp: (op: string, args: object) => void,
 *   roundActive: boolean,
 *   isGm: boolean
 * }} context
 */
export function renderStageSection({ container, value, getValue, dispatchOp, roundActive }) {
  const stage = normalizeStage(value);

  container.appendChild(labelled(
    'GMだけに見える欄です。登録したルーチンは、ラウンド進行のボタンを押すたびにMainへ流れます'
    + (roundActive ? '。' : '（ラウンド進行を始めると動き出します）。')
  ));

  // --- 舞台名 ---
  const nameRow = document.createElement('div');
  nameRow.className = 'dialog-custom-row';
  const name = document.createElement('input');
  name.type = 'text';
  name.className = 'stage-field';
  name.value = stage.name;
  name.placeholder = '舞台名（任意）';
  name.maxLength = MAX_STAGE_NAME_LENGTH;
  name.setAttribute('aria-label', '舞台名（任意）');
  name.addEventListener('change', () => dispatchOp('setName', { value: name.value }));
  nameRow.appendChild(name);
  container.appendChild(nameRow);

  renderProgress(container, stage, dispatchOp);
  renderKindButtons(container, stage, { getValue, dispatchOp });
}
