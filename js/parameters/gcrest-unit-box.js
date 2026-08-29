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
 *   modGroups: Array<{
 *     label: string,
 *     layout?: 'grid'|'flow',   既定grid（3列の格子）。'flow'は横一列に流す（防御力の4つ）
 *     rows: Array<{key:string, label:string, short?:string, hideLabel?:boolean}>
 *   }>,
 *     修正値の入力欄。大きい括りごとにまとめて描く。
 *     shortを宣言した行はそちらを見出しに出す（既に群の見出しが「防御力」なので、
 *     行では「武器」だけを出す）。hideLabelは群の見出しが行の名前を兼ねる場合（攻撃力）。
 *   morale: {label:string, value:number},   士気（パラメータの今の値）
 *   unitArts?: {noun:string, count:() => number, open:(onSaved:() => void) => void},
 *     部隊特技の一覧を開く口。一覧そのものは共通の枠組み（showSkillBox）が描くので、
 *     ここは件数を出してボタンを押すところまでしか持たない。省略すると出さない。
 *     openへ渡すonSavedは、一覧が保存されたときに呼び返してもらう（件数を引き直すため）。
 *   readOnly?: boolean,
 *   onSave: (result: {unit: object, morale: number}) => void
 * }} options
 */
export function showGcrestUnitBox({
  unit, modGroups = [], morale, unitArts = null, readOnly = false, onSave
}) {
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

  // --- 部隊特技 ---
  // 士気の直後に置く（部隊特技のコストは士気なので、残量と並べて読めるようにする）。
  // 一覧は別のダイアログを重ねて開く。あちらは保存すると即座にcomponentsへ書くので、
  // この部隊ボックスの「保存」を待たない（他のボックスと同じ振る舞い）。
  if (unitArts) {
    const artsBtn = createElement('button', 'dialog-add-row-btn gcrest-open-btn');
    artsBtn.type = 'button';

    const artsLabel = createElement('span', null, unitArts.noun);
    const artsBadge = createElement('span', 'gcrest-badge');
    const syncArtsBadge = () => { artsBadge.textContent = `${unitArts.count()}件`; };
    syncArtsBadge();

    artsBtn.appendChild(artsLabel);
    artsBtn.appendChild(artsBadge);
    // showSkillBoxは開いたまま戻ってくるので、押した直後に数えても件数は変わらない。
    // 保存されたときに呼び返してもらう。
    artsBtn.addEventListener('click', () => unitArts.open(syncArtsBadge));
    form.appendChild(artsBtn);
  }

  // --- 修正値 ---
  // 大きい括りごとに見出しを付け、中身は格子に畳む。1列で並べると14件で839pxになり、
  // ノートPCの画面に収まらずスクロールして、上のMCとポジションが見えなくなるため
  // （css/character-dialog.css の .gcrest-mod-grid）。
  const modInputs = new Map();

  modGroups.forEach(group => {
    const groupEl = createElement('div', 'gcrest-mod-group');
    groupEl.appendChild(createElement('div', 'gcrest-mod-group-title', group.label));

    const isFlow = group.layout === 'flow';
    const body = createElement('div', isFlow ? 'gcrest-mod-row-flow' : 'gcrest-mod-grid');

    group.rows.forEach(row => {
      const rowEl = createElement('div', `dialog-custom-row${row.hideLabel ? ' is-unlabeled' : ''}`);
      // 群の見出しで足りる行（攻撃力）は入力欄だけにする。見出しを2回読ませない。
      rowEl.appendChild(createElement(
        'label', 'dialog-param-label gcrest-row-label', row.short ?? row.label
      ));

      const input = buildNumberInput(unit.mods?.[row.key]);
      modInputs.set(row.key, input);
      rowEl.appendChild(input);
      body.appendChild(rowEl);
    });

    groupEl.appendChild(body);
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
