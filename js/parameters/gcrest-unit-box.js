// js/parameters/gcrest-unit-box.js
// グランクレストの「部隊」（マスコンバット）を編集するボックス。
//
// コマ1体につき部隊を1つ持つ。中身は MC（マスコンバット中か）・ポジション（FW/CT）・
// 部隊名・士気・修正値で、共通のスキル枠組みでは書けない形（1件だけのレコード＋
// 項目ごとの修正値）なのでここに専用のUIを持つ。
//
// このボックスは値を集めて onSave へ渡すだけで、修正値をバフにする・士気の表示を
// 切り替えるといった判断は js/parameters/gcrest.js が持つ（あちらがstore操作の持ち主）。
//
// 士気だけはパラメータ（GCREST:morale）が唯一の真実で、componentsには持たない。
// 両方に持つと、どちらが正しいのかが決まらなくなるため。
//
// トップレベルでDOMに触れないこと（docs/plugin-guide.mdの8.1）。

import { createDialogHost } from '../dialog-host.js';
import { lockFormControls } from '../read-only-form.js';

const ensureDialog = createDialogHost('effect-box-dialog');

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// 押すたびに選択肢を回すボタン（skill-box.jsのtoggleと同じ見た目・同じ操作感）。
function buildToggle(options, value, title) {
  const button = createElement('button', 'effect-box-toggle');
  button.type = 'button';
  button.title = `${title}（クリックで切り替え）`;

  const indexOf = (target) => {
    const index = options.findIndex(option => option.value === target);
    return index === -1 ? 0 : index;
  };

  const show = (target) => {
    const index = indexOf(target);
    const option = options[index];
    button.value = option?.value ?? '';
    button.textContent = option?.label ?? '';
    button.classList.toggle('is-alt', index > 0);
  };

  button.addEventListener('click', () => {
    show(options[(indexOf(button.value) + 1) % options.length].value);
  });

  show(value);
  return button;
}

function buildNumberInput(value) {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.value = Math.trunc(Number(value) || 0);
  // 幅は .dialog-custom-row input[type="number"]（38px固定）が持つ。ここで指定しても効かない。
  return input;
}

/**
 * @param {{
 *   unit: {mc:boolean, position:'FW'|'CT', name:string, mods:Record<string, number>},
 *     正規化済みの部隊データ（gcrest.jsのnormalizeGcrestUnitを通したもの）。
 *   modGroups: Array<{label:string, rows:Array<{key:string, label:string}>}>,
 *     修正値の入力欄。大きい括りごとにまとめて描く。
 *   morale: {label:string, value:number},   士気（パラメータの今の値）
 *   readOnly?: boolean,
 *   onSave: (result: {unit: object, morale: number}) => void
 * }} options
 */
export function showGcrestUnitBox({ unit, modGroups = [], morale, readOnly = false, onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');
  form.appendChild(createElement('h3', null, '部隊'));

  form.appendChild(createElement('p', 'gcrest-note',
    'MCをオンにすると、下の修正値が自分へのバフとして掛かり、部隊特技が使えるようになります。オフにすると修正は外れます。'));

  // --- 1行目：MC と ポジション ---
  const stateRow = createElement('div', 'effect-box-header-row');

  const mcLabel = createElement('label', 'gcrest-check-row');
  const mcCheck = document.createElement('input');
  mcCheck.type = 'checkbox';
  mcCheck.checked = unit.mc === true;
  mcLabel.appendChild(mcCheck);
  mcLabel.appendChild(document.createTextNode('MC（マスコンバット）'));
  stateRow.appendChild(mcLabel);

  const positionToggle = buildToggle(
    [{ value: 'FW', label: 'FW' }, { value: 'CT', label: 'CT' }],
    unit.position,
    'ポジション'
  );
  stateRow.appendChild(positionToggle);
  form.appendChild(stateRow);

  // --- 部隊名・士気 ---
  const infoList = createElement('div', 'dialog-custom-list');
  form.appendChild(infoList);

  const appendInfoRow = (labelText, control) => {
    const row = createElement('div', 'dialog-custom-row');
    row.appendChild(createElement('label', 'dialog-param-label gcrest-row-label', labelText));
    row.appendChild(control);
    infoList.appendChild(row);
  };

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = unit.name ?? '';
  nameInput.placeholder = '部隊名';
  appendInfoRow('部隊名', nameInput);

  const moraleInput = buildNumberInput(morale?.value);
  appendInfoRow(morale?.label ?? '士気', moraleInput);

  // --- 修正値 ---
  // 大きい括りごとに見出しを付け、中身は格子に畳む。1列で並べると14件で839pxになり、
  // ノートPCの画面に収まらずスクロールして、上のMCとポジションが見えなくなるため
  // （css/character-dialog.css の .gcrest-mod-grid）。
  const modInputs = new Map();

  modGroups.forEach(group => {
    const groupEl = createElement('div', 'gcrest-mod-group');
    groupEl.appendChild(createElement('div', 'gcrest-mod-group-title', group.label));

    const grid = createElement('div', 'gcrest-mod-grid');
    group.rows.forEach(row => {
      const rowEl = createElement('div', 'dialog-custom-row');
      rowEl.appendChild(createElement('label', 'dialog-param-label gcrest-row-label', row.label));

      const input = buildNumberInput(unit.mods?.[row.key]);
      modInputs.set(row.key, input);
      rowEl.appendChild(input);
      grid.appendChild(rowEl);
    });

    groupEl.appendChild(grid);
    form.appendChild(groupEl);
  });

  // --- ボタン ---
  const btnRow = createElement('div', 'dialog-button-row');

  const cancelBtn = createElement('button', null, readOnly ? '閉じる' : 'キャンセル');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(cancelBtn);

  const saveBtn = createElement('button', 'dialog-confirm-btn', '保存');
  saveBtn.type = 'submit';
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  if (readOnly) {
    saveBtn.style.display = 'none';
    lockFormControls(form, { keep: [cancelBtn] });
  } else {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const mods = {};
      modInputs.forEach((input, key) => {
        mods[key] = Math.trunc(Number(input.value) || 0);
      });

      dialog.close();
      onSave({
        unit: {
          mc: mcCheck.checked,
          position: positionToggle.value === 'CT' ? 'CT' : 'FW',
          name: nameInput.value.trim(),
          mods
        },
        morale: Math.trunc(Number(moraleInput.value) || 0)
      });
    });
  }

  dialog.appendChild(form);
  dialog.showModal();
}
