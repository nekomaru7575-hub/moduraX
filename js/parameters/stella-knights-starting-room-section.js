// js/parameters/stella-knights-starting-room-section.js
// 「⋯」→「拡張ルーム設定」に出す、銀剣のステラナイツの「始まりの部屋」の欄。
// 状態の形・発動と解除の規則・ダイスの変換は js/parameters/stella-knights-starting-room.js。
// ここは描くことと、操作を dispatchOp へ渡すことだけをする。
//
// 部屋の他の人が発動・解除した結果は、ダイアログ側（js/room-extension-dialog.js）が
// 描き直しで映すので、ここは渡された value をそのまま描けばよい。

import { generateRoomExtensionItemId } from '../store/ids.js';
import { buildFaceMap, MAX_STARTING_ROOM_RULES } from './stella-knights-starting-room.js';

const FACES = [1, 2, 3, 4, 5, 6];

// 最後に選んだ a・b。誰かが発動・解除するたびに欄ごと描き直されるので、控えておかないと
// 選びかけのプルダウンが既定へ戻る（このブラウザの画面だけの状態で、部屋には載せない）
const lastChoice = { from: 1, to: 6 };

function createFaceSelect(initial, labelText) {
  const select = document.createElement('select');
  select.className = 'starting-room-face';
  select.setAttribute('aria-label', labelText);
  FACES.forEach(face => {
    const option = document.createElement('option');
    option.value = String(face);
    option.textContent = String(face);
    select.appendChild(option);
  });
  select.value = String(initial);
  return select;
}

/**
 * @param {{
 *   container: HTMLElement,
 *   value: { rules: {id:string, from:number, to:number}[] },
 *   dispatchOp: (op: string, args: object) => void,
 *   roundActive: boolean
 * }} context
 */
export function renderStartingRoomSection({ container, value, dispatchOp, roundActive }) {
  const rules = value?.rules ?? [];

  const description = document.createElement('p');
  description.className = 'dialog-form-note';
  description.textContent = '発動中は、振ったd6の出目aをbとして扱います。複数発動でき、上から発動した順に変換します'
    + '（変換後の目も、後の発動で続けて変換されます）。';
  container.appendChild(description);

  // --- 発動中の一覧（発動した順） ---
  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  if (rules.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dialog-plugin-placeholder';
    empty.textContent = '発動中の始まりの部屋はありません。';
    list.appendChild(empty);
  }

  rules.forEach((rule, index) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row starting-room-rule';

    // 順番が結果を変える（1→6, 6→1 と 6→1, 1→6 は別物）ので、何番目に当たるかを見せる
    const info = document.createElement('span');
    info.className = 'buff-row-info';
    info.textContent = `${index + 1}. ${rule.from}の目 → ${rule.to}の目`;
    row.appendChild(info);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.textContent = '解除';
    removeBtn.addEventListener('click', () => dispatchOp('remove', { id: rule.id }));
    row.appendChild(removeBtn);

    list.appendChild(row);
  });

  // 連鎖を全部当てた結果。並びを読んで頭の中で追わなくても、今どの目が何になるかが分かる
  if (rules.length > 0) {
    const faceMap = buildFaceMap(rules);
    const changes = [...faceMap].filter(([face, to]) => face !== to);
    const outcome = document.createElement('p');
    outcome.className = 'dialog-form-note starting-room-outcome';
    outcome.textContent = changes.length > 0
      ? `振った目の扱い：${changes.map(([face, to]) => `${face}→${to}`).join('、')}`
      : '振った目の扱い：変換が一巡して元の目に戻るため、変わる目はありません';
    list.appendChild(outcome);
  }

  // --- 発動 ---
  const addRow = document.createElement('div');
  addRow.className = 'dialog-custom-row starting-room-add';

  const fromSelect = createFaceSelect(lastChoice.from, '変換前の出目');
  const toSelect = createFaceSelect(lastChoice.to, '変換後の出目');
  const arrow = document.createElement('span');
  arrow.textContent = 'の目 →';
  const toSuffix = document.createElement('span');
  toSuffix.textContent = 'の目';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '発動';

  const isFull = rules.length >= MAX_STARTING_ROOM_RULES;
  const syncAddBtn = () => {
    lastChoice.from = Number(fromSelect.value);
    lastChoice.to = Number(toSelect.value);
    const same = fromSelect.value === toSelect.value;
    addBtn.disabled = same || isFull;
    addBtn.title = isFull ? `同時に発動できるのは${MAX_STARTING_ROOM_RULES}個までです`
      : same ? '同じ目への変換は発動できません' : '';
  };
  fromSelect.addEventListener('change', syncAddBtn);
  toSelect.addEventListener('change', syncAddBtn);
  syncAddBtn();

  addBtn.addEventListener('click', () => {
    const from = Number(fromSelect.value);
    const to = Number(toSelect.value);
    if (from === to) return;
    dispatchOp('add', { id: generateRoomExtensionItemId(), from, to });
  });

  addRow.append(fromSelect, arrow, toSelect, toSuffix, addBtn);
  container.appendChild(addRow);

  const note = document.createElement('p');
  note.className = 'dialog-form-note';
  note.textContent = roundActive
    ? 'ラウンド終了時にすべて解除されます。'
    : 'ラウンド終了時にすべて解除されます（ラウンド進行をしていない間は、解除するまで続きます）。';
  container.appendChild(note);
}
