// js/parameters/dx3-effect-box.js
// DX3の「エフェクト」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// 保存すると即座にonSaveへ新しい配列を渡す。Core側はこの配列の中身を解釈しない。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

const LIMIT_TYPES = ['scenario', 'scene', 'round'];
const LIMIT_TYPE_LABELS = {
  scenario: 'シナリオ',
  scene: 'シーン',
  round: 'ラウンド'
};

/**
 * @param {{
 *   effects: Array<{ name:string, level:number, encroach:string, note:string, limitType:string, limitCount:number|null }>,
 *   onSave: (effects: Array<object>) => void
 * }} options
 */
export function showEffectBox({ effects = [], onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = 'エフェクト一覧';
  form.appendChild(title);

  const listEl = document.createElement('div');
  listEl.className = 'effect-box-list';
  form.appendChild(listEl);

  const rows = [];

  function addRow(effect) {
    const item = document.createElement('div');
    item.className = 'effect-box-item';

    const headerRow = document.createElement('div');
    headerRow.className = 'effect-box-header-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'effect-box-name';
    nameInput.placeholder = 'エフェクト名';
    nameInput.value = effect?.name ?? '';

    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.className = 'effect-box-level';
    levelInput.placeholder = 'Lv';
    levelInput.value = effect?.level ?? 0;

    const encroachInput = document.createElement('input');
    encroachInput.type = 'text';
    encroachInput.className = 'effect-box-encroach';
    encroachInput.placeholder = '上昇侵蝕率';
    encroachInput.value = effect?.encroach ?? '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      item.remove();
      const idx = rows.findIndex(r => r.item === item);
      if (idx !== -1) rows.splice(idx, 1);
    });

    headerRow.appendChild(nameInput);
    headerRow.appendChild(levelInput);
    headerRow.appendChild(encroachInput);
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    const noteInput = document.createElement('textarea');
    noteInput.className = 'effect-box-note';
    noteInput.placeholder = '効果';
    noteInput.rows = 2;
    noteInput.value = effect?.note ?? '';
    item.appendChild(noteInput);

    const limitRow = document.createElement('div');
    limitRow.className = 'effect-box-limit-row';

    const limitLabel = document.createElement('span');
    limitLabel.className = 'effect-box-limit-label';
    limitLabel.textContent = '回数制限:';
    limitRow.appendChild(limitLabel);

    const limitCheckboxes = {};
    LIMIT_TYPES.forEach(type => {
      const label = document.createElement('label');
      label.className = 'effect-box-limit-checkbox';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = effect?.limitType === type;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          LIMIT_TYPES.forEach(otherType => {
            if (otherType !== type) limitCheckboxes[otherType].checked = false;
          });
        }
      });

      limitCheckboxes[type] = checkbox;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(LIMIT_TYPE_LABELS[type]));
      limitRow.appendChild(label);
    });

    const limitCountInput = document.createElement('input');
    limitCountInput.type = 'number';
    limitCountInput.className = 'effect-box-limit-count';
    limitCountInput.placeholder = '回数';
    limitCountInput.min = '1';
    limitCountInput.value = effect?.limitCount ?? '';
    limitRow.appendChild(limitCountInput);

    const limitSuffix = document.createElement('span');
    limitSuffix.textContent = '回';
    limitRow.appendChild(limitSuffix);

    item.appendChild(limitRow);
    listEl.appendChild(item);

    rows.push({ item, nameInput, levelInput, encroachInput, noteInput, limitCheckboxes, limitCountInput });
  }

  effects.forEach(addRow);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '+ エフェクトを追加';
  addBtn.addEventListener('click', () => addRow(null));
  form.appendChild(addBtn);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => dialog.close());

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '保存';
  saveBtn.className = 'dialog-confirm-btn';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextEffects = rows
      .map(row => {
        const selectedType = LIMIT_TYPES.find(type => row.limitCheckboxes[type].checked) ?? 'none';
        return {
          name: row.nameInput.value.trim(),
          level: Number(row.levelInput.value) || 0,
          encroach: row.encroachInput.value.trim(),
          note: row.noteInput.value,
          limitType: selectedType,
          limitCount: selectedType === 'none' ? null : (Number(row.limitCountInput.value) || null)
        };
      })
      .filter(effect => effect.name !== '');

    dialog.close();
    onSave(nextEffects);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
