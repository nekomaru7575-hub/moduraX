// js/parameters/arianrhod-ability-box.js
// アリアンロッドの「能力ボーナス」7種とレベル（CL）をまとめて表示・編集するボックス。
//
// これらはeditable:falseのパラメータで、キャラクター更新ダイアログからは手入力できない
// （js/game-store.jsのSET_PARAMETERが弾く）。DX3の能力値・技能値と同じ扱いで、
// 部屋の外のコマ作成ツール（js/character-builder.jsのallowParameterEdit:true）でだけ
// このボックスから編集でき、書き込みはIMPORT_CHARACTER_DATAのvalueOverridesで行う
// （js/parameters/dx3-ability-box.jsと同じ経路）。
//
// トップレベルでDOMに触れないこと（server/index.jsがgame-store.js経由でプラグインを
// importするため、Node環境でも読み込める必要がある。docs/plugin-guide.mdの8.1）。

// 能力ボーナスの並び。行動セットの能力選択（js/parameters/arianrhod-action-set-box.js）も
// この並びを使うため、対応表はarianrhod.js側が持ち、このボックスは渡された分だけを描く。

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog effect-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{
 *   parameters: Record<string, {label:string, value:number}>,
 *   rows: Array<{paramId:string, label:string}>,  表示する行（能力ボーナス7種＋CL）
 *   editable?: boolean,   部屋の外のコマ作成ツールでのみtrue
 *   onSave?: (valueOverrides: Record<string, number>) => void
 * }} options
 */
export function showArianrhodAbilityBox({ parameters = {}, rows = [], editable = false, onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 編集できるのは保存の渡し先がある場合だけ（保存できないのに入力欄を出さない）
  const canEditValues = editable && typeof onSave === 'function';
  const valueInputs = new Map();

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = canEditValues ? '能力ボーナス・レベルを編集' : '能力ボーナス・レベル';
  form.appendChild(title);

  if (!canEditValues) {
    const note = document.createElement('p');
    note.style.color = '#888';
    note.style.fontSize = '0.8rem';
    note.textContent = 'これらの値は部屋の中では編集できません。コマ作成ツール（キャラクター作成）で入力してから部屋へ持ち込んでください。';
    form.appendChild(note);
  }

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  form.appendChild(list);

  rows.forEach(({ paramId, label: fallbackLabel }) => {
    const param = parameters[paramId];

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    // 一覧の見出しと食い違わないよう、コマが実際に持っているラベルを優先して読む
    label.textContent = param?.label ?? fallbackLabel;
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';
    row.appendChild(label);

    if (canEditValues) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '1';
      input.value = Number(param?.value) || 0;
      valueInputs.set(paramId, input);
      row.appendChild(input);
    } else {
      const valueEl = document.createElement('span');
      valueEl.style.color = '#fff';
      valueEl.textContent = String(Number(param?.value) || 0);
      row.appendChild(valueEl);
    }

    list.appendChild(row);
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-buttons';

  // 保存はこのボックス単独で完結させる（更新ダイアログの「保存」を待たずに即時反映する。
  // DX3の各ボックスと同じ振る舞い）。
  if (canEditValues) {
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '保存';
    saveBtn.className = 'dialog-confirm-btn';
    saveBtn.addEventListener('click', () => {
      const valueOverrides = {};
      valueInputs.forEach((input, paramId) => {
        // 空欄・不正な入力は0に丸める。書き込み側（IMPORT_CHARACTER_DATA）は
        // typeof value === 'number' のものしか反映しないため、NaNを渡さない。
        valueOverrides[paramId] = Math.trunc(Number(input.value) || 0);
      });
      onSave(valueOverrides);
      dialog.close();
    });
    btnRow.appendChild(saveBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = canEditValues ? 'キャンセル' : '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(closeBtn);

  form.appendChild(btnRow);
  dialog.appendChild(form);
  dialog.showModal();
}
