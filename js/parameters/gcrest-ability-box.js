// js/parameters/gcrest-ability-box.js
// グランクレストの能力判定値6種と技能をまとめて表示する「ボックス」。
// 能力判定値を大きく、技能をその能力のまとまりの下に小さく並べる
// （見た目の作りはjs/parameters/dx3-ability-box.jsと同じ .ability-box-* を使う）。
//
// 既定は閲覧専用。値はどれもeditable:falseなので、更新ダイアログからは手入力できない
// （js/game-store.jsのSET_PARAMETERが弾く）。編集できるのは部屋の外のコマ作成ツール
// （js/character-builder.jsのallowParameterEdit:true）だけで、書き込みは
// IMPORT_CHARACTER_DATAのvalueOverrides経由（js/parameters/arianrhod-ability-box.jsと同じ経路）。
//
// 判定UIは持たない（表示だけ）。
//
// トップレベルでDOMに触れないこと（server/index.jsがgame-store.js経由でプラグインを
// importするため、Node環境でも読み込める必要がある。docs/plugin-guide.mdの8.1）。

import { createDialogHost } from '../dialog-host.js';

const ensureDialog = createDialogHost('ability-box-dialog');

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * @param {{
 *   readData: () => {
 *     groups: Array<{
 *       abilityParamId: string, abilityLabel: string, abilityValue: number,
 *       skills: Array<{paramId:string, label:string, value:number}>,
 *       free: {prefix:string, label:string}|null,
 *       freeSkills: Array<{paramId:string, label:string, value:number}>
 *     }>,
 *     combatRows: Array<{paramId:string, label:string, value:number}>,
 *     loadRow: {label:string, value:number}
 *   },
 *     **開くたび・枠を足すたびに呼ばれる**。呼び出し側は常に最新のパラメータから組むこと。
 *   editable?: boolean,   部屋の外のコマ作成ツールでのみtrue
 *   onSave?: (valueOverrides: Record<string, number>) => void,
 *   onAddFreeSkill?: (free: {prefix:string, label:string}, label: string) => boolean,
 *     自由記述の技能（専門知識：〜／芸術：〜）を1件足す。足せたらtrueを返すこと。
 *   onRemoveFreeSkill?: (paramId: string) => void
 * }} options
 */
export function showGcrestAbilityBox({
  readData, editable = false, onSave, onAddFreeSkill, onRemoveFreeSkill
}) {
  const dialog = ensureDialog();

  // 編集できるのは保存の渡し先がある場合だけ（保存できないのに入力欄を出さない）
  const canEditValues = editable && typeof onSave === 'function';
  const canEditFreeSkills = canEditValues && typeof onAddFreeSkill === 'function';

  // 画面に出ている入力欄。paramId => input。再描画のたびに作り直す。
  let valueInputs = new Map();

  function buildValueInput(paramId, value) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    input.className = 'ability-box-value-input';
    input.value = Number(value) || 0;
    valueInputs.set(paramId, input);
    return input;
  }

  // 画面の今の入力を、IMPORT_CHARACTER_DATAへ渡す形にする。
  // 空欄・不正な入力は0に丸める（書き込み側はtypeof value === 'number'のものしか反映しない）。
  function collectOverrides() {
    const valueOverrides = {};
    valueInputs.forEach((input, paramId) => {
      valueOverrides[paramId] = Math.trunc(Number(input.value) || 0);
    });
    return valueOverrides;
  }

  // 値を表示する小さな1行（技能・自由記述の技能で共通）。
  function buildSkillEntry({ paramId, label, value }, { removable = false } = {}) {
    const el = createElement('span', 'ability-box-skill');
    if (canEditValues) {
      el.appendChild(createElement('span', null, `${label}: `));
      el.appendChild(buildValueInput(paramId, value));
    } else {
      el.textContent = `${label}: ${value}`;
    }

    if (removable && canEditFreeSkills && typeof onRemoveFreeSkill === 'function') {
      const removeBtn = createElement('button', 'dialog-remove-row', '×');
      removeBtn.type = 'button';
      removeBtn.title = `${label}を消す`;
      removeBtn.addEventListener('click', () => {
        // 枠を消す前に、それまでの入力を保存しておく（再描画で打ちかけが消えないように）
        onSave(collectOverrides());
        onRemoveFreeSkill(paramId);
        render();
      });
      el.appendChild(removeBtn);
    }

    return el;
  }

  function render() {
    const { groups, combatRows, loadRow } = readData();

    dialog.innerHTML = '';
    valueInputs = new Map();

    const form = document.createElement('form');
    form.appendChild(createElement('h3', null, canEditValues ? '能力・技能を編集' : '能力・技能'));

    if (!canEditValues) {
      form.appendChild(createElement('p', 'gcrest-note',
        'これらの値は部屋の中では編集できません。コマ作成ツール（キャラクター作成）で入力してから部屋へ持ち込んでください。'));
    }

    const groupListEl = createElement('div', 'ability-box-group-list');
    form.appendChild(groupListEl);

    groups.forEach(group => {
      const groupEl = createElement('div', 'ability-box-group');

      const abilityRow = createElement('div', 'ability-box-ability-row');
      abilityRow.appendChild(createElement('span', 'ability-box-ability-label', group.abilityLabel));
      if (canEditValues) {
        abilityRow.appendChild(buildValueInput(group.abilityParamId, group.abilityValue));
      } else {
        abilityRow.appendChild(
          createElement('span', 'ability-box-ability-value', String(group.abilityValue))
        );
      }
      groupEl.appendChild(abilityRow);

      const skillListEl = createElement('div', 'ability-box-skill-list');
      group.skills.forEach(skill => skillListEl.appendChild(buildSkillEntry(skill)));
      group.freeSkills.forEach(skill => {
        skillListEl.appendChild(buildSkillEntry(skill, { removable: true }));
      });
      // 自由記述の枠を持つ分類（専門知識・芸術）で、まだ1件も無いことを示す1行。
      if (group.free && group.freeSkills.length === 0) {
        skillListEl.appendChild(
          createElement('span', 'ability-box-skill ability-box-skill-empty', `${group.free.label}：―`)
        );
      }
      groupEl.appendChild(skillListEl);

      // 自由記述の技能を足す口。編集できる画面（コマ作成ツール）にだけ出す。
      if (group.free && canEditFreeSkills) {
        const addRow = createElement('div', 'ability-box-skill-list');
        addRow.style.marginTop = '6px';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `${group.free.label}：の後ろに入れる名前`;
        input.style.flex = '1';

        const addBtn = createElement('button', 'dialog-add-row-btn', `+ ${group.free.label}を追加`);
        addBtn.type = 'button';
        addBtn.addEventListener('click', () => {
          const label = input.value.trim();
          if (!label) {
            alert(`${group.free.label}の名前を入れてください。`);
            return;
          }
          // 枠を足す前に、それまでの入力を保存しておく（再描画で打ちかけが消えないように）
          onSave(collectOverrides());
          if (onAddFreeSkill(group.free, label)) render();
        });

        addRow.appendChild(input);
        addRow.appendChild(addBtn);
        groupEl.appendChild(addRow);
      }

      groupListEl.appendChild(groupEl);
    });

    // --- 攻撃力・防御力・移動力・所持可能重量 ---
    // どれも能力・技能と同じくeditable:falseなので、編集の入口はここにしかない。
    form.appendChild(createElement('h3', null, '戦闘・移動'));

    const combatList = createElement('div', 'dialog-custom-list');
    form.appendChild(combatList);

    const appendCombatRow = (label, valueEl) => {
      const row = createElement('div', 'dialog-custom-row');
      row.appendChild(createElement('label', 'dialog-param-label gcrest-row-label', label));
      row.appendChild(valueEl);
      combatList.appendChild(row);
    };

    combatRows.forEach(row => {
      if (canEditValues) {
        appendCombatRow(row.label, buildValueInput(row.paramId, row.value));
      } else {
        appendCombatRow(row.label, createElement('span', 'gcrest-row-value', String(row.value)));
      }
    });

    // 所持重量は持ち物から自動で決まるので、いつでも表示だけ。
    appendCombatRow(loadRow.label, createElement('span', 'gcrest-row-value', String(loadRow.value)));

    const btnRow = createElement('div', 'dialog-button-row');

    // 保存はこのボックス単独で完結させる（更新ダイアログの「更新」を待たずに即時反映する。
    // 他のボックスと同じ振る舞い）。
    if (canEditValues) {
      const saveBtn = createElement('button', 'dialog-confirm-btn', '保存');
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', () => {
        onSave(collectOverrides());
        dialog.close();
      });
      btnRow.appendChild(saveBtn);
    }

    const closeBtn = createElement('button', 'dialog-confirm-btn', canEditValues ? 'キャンセル' : '閉じる');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => dialog.close());
    btnRow.appendChild(closeBtn);

    form.appendChild(btnRow);
    dialog.appendChild(form);
  }

  render();
  dialog.showModal();
}
