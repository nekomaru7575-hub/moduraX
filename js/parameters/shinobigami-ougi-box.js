// js/parameters/shinobigami-ougi-box.js
// シノビガミの「奥義」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// ロイス（js/parameters/dx3-lois-box.js）・絆（js/parameters/dracurouge-bond-box.js）と
// 同じ立場で、保存すると即座にonSaveへ新しい配列を渡す。Core側はこの配列の中身を解釈しない
// （components.ougi として丸ごと保持されるだけ）。
//
// 【なぜスキル枠組み（js/parameters/skill/）に乗せないか】
// 忍法は createSkillSpec + showSkillBox に乗っているが、あちらの normalizeSkill が返す形は
// {name, note, fields, expirePhase, limits, mods} に固定で、知らないキーを捨てる。
// 奥義は「奥義改造の配列」と「公開先」を持つので入らない。枠組み側へ入れ子配列と公開先を
// 足すと、DX3・ステラナイツ・ドラクルージュ・忍法の4か所に影響が出るため、
// システム固有の形を自分で持つ専用ボックスにしてある。
//
// 【公開先】
// 奥義は既定で作った本人にしか見えない。宛先の形と解釈はCoreと同じ（js/visibility.js）で、
// GMを自動で宛先に含めることはしない。見えない奥義は行ごと出さない
// （js/character-dialog.js が公開先の合わないパラメータを行ごと出さないのと同じ扱い）。
//
// 【秘匿の水準】隠しているのは画面の側だけで、components自体は全員へ配られている。
// 開発者ツールを開けば読める（docs/plugin-guide.md 8.5 と同じ「うっかり見えない」まで）。
//
// game-store.js は import しない：game-store → registry → shinobigami → このファイル、と
// 循環するため（dx3-lois-box.js 冒頭と同じ理由）。参加者一覧と自分のIDは呼び出し側から貰う。

import { lockFormControls } from '../read-only-form.js';
import { showAudienceDialog } from '../audience-picker.js';
import { canView, isRestricted, describeAudience } from '../visibility.js';
import { setIcon } from '../icons.js';
import { createDialogHost } from '../dialog-host.js';

// components に奥義一覧を保存するときのキー。
export const OUGI_COMPONENT_KEY = 'ougi';

// 1体が持てる奥義と、1つの奥義が持てる改造の上限。卓の運用より十分多いが、
// 際限なく増やせると画面も部屋データも重くなるので歯止めだけ置く。
export const OUGI_MAX = 20;
export const CUSTOMIZATION_MAX = 10;

// 奥義改造の側。値は保存される識別子で、ラベルは画面とチャットログの表記。
export const CUSTOMIZATION_SIDES = [
  { value: 'strength', label: '強み' },
  { value: 'weakness', label: '弱み' }
];

const SIDE_VALUES = CUSTOMIZATION_SIDES.map(side => side.value);

export function customizationSideLabel(side) {
  return CUSTOMIZATION_SIDES.find(item => item.value === side)?.label ?? CUSTOMIZATION_SIDES[0].label;
}

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function toText(value) {
  return value === null || value === undefined ? '' : String(value);
}

// 公開先。nullなら全員に公開、配列ならその参加者だけ。空配列は「誰にも見せない」の意味で
// そのまま保つ（js/game-store.jsのnormalizeAudienceと同じ姿勢で、公開範囲を広げる方向へは倒さない）。
function normalizeAudience(audience) {
  if (!Array.isArray(audience)) return null;
  return [...new Set(audience.filter(id => typeof id === 'string' && id !== ''))];
}

function normalizeCustomization(raw) {
  return {
    id: toText(raw?.id) || nextId('ougi-mod'),
    side: SIDE_VALUES.includes(raw?.side) ? raw.side : SIDE_VALUES[0],
    name: toText(raw?.name),
    effect: toText(raw?.effect)
  };
}

/** 保存済みの1件を、欠けた項目を補った正規形へ揃える。 */
export function normalizeOugi(raw) {
  return {
    id: toText(raw?.id) || nextId('ougi'),
    name: toText(raw?.name),
    kind: toText(raw?.kind),
    effect: toText(raw?.effect),
    skill: toText(raw?.skill),
    audience: normalizeAudience(raw?.audience),
    customizations: Array.isArray(raw?.customizations)
      ? raw.customizations.slice(0, CUSTOMIZATION_MAX).map(normalizeCustomization)
      : []
  };
}

/** components に保存された一覧を正規形の配列にする。名前が空のものは落とす。 */
export function normalizeOugiList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.slice(0, OUGI_MAX).map(normalizeOugi).filter(ougi => ougi.name !== '');
}

/**
 * 自分が見てよい奥義だけを返す。ボタンの件数表示・チャットコマンド・ボックスの描画で
 * 同じ規則を使うために、判定はここへ集約する。
 * @param {Array<object>} rawList components.ougi
 * @param {string|null} myParticipantId 自分の参加者ID（表示名未設定ならnull）
 */
export function listVisibleOugi(rawList, myParticipantId) {
  return normalizeOugiList(rawList).filter(ougi => canView(ougi.audience, myParticipantId));
}

const ensureDialog = createDialogHost('ougi-box-dialog');

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// 指定特技のドロップダウン。選択肢はプラグインから貰う（忍法の指定特技と同じ66件で、
// 分野ごとにoptgroupへ畳む。素で並べると選べないため）。
function buildSkillSelect(choices, value) {
  const select = createElement('select', 'ougi-box-skill');
  const groups = new Map();

  choices.forEach(choice => {
    const option = createElement('option', null, choice.label);
    option.value = choice.value;

    if (!choice.group) {
      select.appendChild(option);
      return;
    }
    let group = groups.get(choice.group);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = choice.group;
      groups.set(choice.group, group);
      select.appendChild(group);
    }
    group.appendChild(option);
  });

  // 選択肢に無い値（表を差し替えた後など）は先頭へ落ちる。保存値と画面がずれないよう、
  // 落ちたことは保存時の値（select.value）に素直に従わせる。
  select.value = value;
  return select;
}

/**
 * 奥義一覧ボックス。
 *
 * ougiListには**常に全件**を渡すこと。見えない行は画面に出さないが、保存時に元の位置へ
 * 混ぜ直して書き戻す。GMや「持ち主なしのコマ」は他人のコマも編集できる
 * （js/room-authority.jsのcanOperateToken）ので、見えている行だけを保存すると
 * 他人の奥義が消えてしまう。
 *
 * @param {{
 *   ougiList: Array<object>,          components.ougi（全件）
 *   skillChoices: {value:string, label:string, group?:string}[],
 *   participants: Record<string, {id:string, nickname:string}>,
 *   myParticipantId: string|null,
 *   readOnly?: boolean,               他人のコマを表示だけしている時（character-dialog.jsのcanEdit）
 *   onSave: (ougiList: Array<object>) => void
 * }} options
 */
export function showOugiBox({
  ougiList = [], skillChoices = [], participants = {}, myParticipantId = null,
  readOnly = false, onSave
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const all = normalizeOugiList(ougiList);
  // 見える行だけを画面に出し、それ以外は触らずに取り置く（保存時に元の位置へ戻す）。
  const editable = [];
  const hidden = [];
  all.forEach((ougi, index) => {
    if (canView(ougi.audience, myParticipantId)) editable.push({ index, ougi });
    else hidden.push({ index, ougi });
  });

  const form = document.createElement('form');
  form.appendChild(createElement('h3', null, '奥義一覧'));

  const summary = createElement('div', 'ougi-box-summary');
  form.appendChild(summary);

  // 表示名が無いと公開先を絞れない（参加者IDを持てないため）。audience-picker.jsが
  // 同じ理由で出している注記と揃える。
  if (!myParticipantId) {
    const note = createElement('p', 'dialog-form-note',
      '公開先を絞るには、ルームメニューの「参加者設定」で表示名を設定してください。'
      + '設定していない間に作った奥義は全員に見えます。');
    form.appendChild(note);
  }

  const listEl = createElement('div', 'ougi-box-list');
  form.appendChild(listEl);

  const rows = [];

  function collectOugi() {
    return rows.map(row => ({
      id: row.id,
      name: row.nameInput.value.trim(),
      kind: row.kindInput.value.trim(),
      effect: row.effectInput.value.trim(),
      skill: row.skillSelect.value,
      audience: row.getAudience(),
      customizations: row.collectCustomizations()
    }));
  }

  // 名前を入れないまま追加した行は保存時に捨てる（名前が無いと使用コマンドで呼べないため）。
  function hasContent(entry) {
    return entry.name !== '';
  }

  let addBtn = null;
  function refreshSummary() {
    const current = collectOugi().filter(hasContent);
    summary.textContent = `登録 ${current.length} / ${OUGI_MAX}件`;
    if (addBtn) addBtn.disabled = rows.length >= OUGI_MAX;
  }

  function addRow(rawOugi) {
    if (rows.length >= OUGI_MAX) return;

    const data = normalizeOugi(rawOugi);

    const item = createElement('div', 'ougi-box-item');

    // --- 1段目: 奥義名・種類・公開先・削除 ---
    const headerRow = createElement('div', 'ougi-box-header-row');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ougi-box-name';
    nameInput.placeholder = '奥義名';
    nameInput.value = data.name;
    nameInput.addEventListener('input', refreshSummary);

    const kindInput = document.createElement('input');
    kindInput.type = 'text';
    kindInput.className = 'ougi-box-kind';
    kindInput.placeholder = '種類';
    kindInput.value = data.kind;

    // 公開先。既定は作った本人だけ（下のnewOugi）。ボタンの見た目はパラメータの
    // 公開先ボタン（js/character-dialog.js）と同じ流儀で、限定公開なら鍵にする。
    let audience = data.audience;
    const audienceBtn = document.createElement('button');
    audienceBtn.type = 'button';
    audienceBtn.className = 'dialog-audience-btn';

    function syncAudienceBtn() {
      setIcon(audienceBtn, isRestricted(audience) ? 'lock' : 'unlock',
        isRestricted(audience) ? '限定公開' : '全員に公開');
      audienceBtn.title = describeAudience(audience, participants);
      audienceBtn.classList.toggle('restricted', isRestricted(audience));
    }
    syncAudienceBtn();

    audienceBtn.addEventListener('click', () => {
      showAudienceDialog({
        title: `「${nameInput.value.trim() || '奥義'}」の公開先`,
        description: 'この奥義を誰に見せるかを選びます。公開先に入っていない人には、奥義があること自体を見せません。',
        audience,
        participants,
        myParticipantId,
        onConfirm: (next) => {
          audience = normalizeAudience(next);
          syncAudienceBtn();
        }
      });
    });

    const removeBtn = createElement('button', 'dialog-remove-row', '×');
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      item.remove();
      const idx = rows.findIndex(r => r.item === item);
      if (idx !== -1) rows.splice(idx, 1);
      refreshSummary();
    });

    headerRow.appendChild(nameInput);
    headerRow.appendChild(kindInput);
    headerRow.appendChild(audienceBtn);
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    // --- 2段目: 指定特技 ---
    const skillRow = createElement('div', 'ougi-box-skill-row');
    skillRow.appendChild(createElement('span', 'ougi-box-label', '指定特技'));
    const skillSelect = buildSkillSelect(skillChoices, data.skill);
    skillRow.appendChild(skillSelect);
    item.appendChild(skillRow);

    // --- 3段目: 効果 ---
    const effectInput = document.createElement('textarea');
    effectInput.className = 'ougi-box-effect';
    effectInput.rows = 2;
    effectInput.placeholder = '効果';
    effectInput.value = data.effect;
    item.appendChild(effectInput);

    // --- 4段目: 奥義改造 ---
    const modsWrap = createElement('div', 'ougi-box-mods');
    modsWrap.appendChild(createElement('div', 'ougi-box-mods-title', '奥義改造'));

    const modsList = createElement('div', 'ougi-box-mod-list');
    modsWrap.appendChild(modsList);

    const modRows = [];

    let addModBtn = null;
    function refreshAddModBtn() {
      if (addModBtn) addModBtn.disabled = modRows.length >= CUSTOMIZATION_MAX;
    }

    function addModRow(rawMod) {
      if (modRows.length >= CUSTOMIZATION_MAX) return;

      const mod = normalizeCustomization(rawMod);
      const modRow = createElement('div', 'ougi-box-mod-row');

      const sideSelect = createElement('select', 'ougi-box-mod-side');
      CUSTOMIZATION_SIDES.forEach(({ value, label }) => {
        const option = createElement('option', null, label);
        option.value = value;
        sideSelect.appendChild(option);
      });
      sideSelect.value = mod.side;

      const modName = document.createElement('input');
      modName.type = 'text';
      modName.className = 'ougi-box-mod-name';
      modName.placeholder = '改造名';
      modName.value = mod.name;

      const modEffect = document.createElement('input');
      modEffect.type = 'text';
      modEffect.className = 'ougi-box-mod-effect';
      modEffect.placeholder = '効果';
      modEffect.value = mod.effect;

      const modRemove = createElement('button', 'dialog-remove-row', '×');
      modRemove.type = 'button';
      modRemove.addEventListener('click', () => {
        modRow.remove();
        const idx = modRows.findIndex(r => r.modRow === modRow);
        if (idx !== -1) modRows.splice(idx, 1);
        refreshAddModBtn();
      });

      modRow.appendChild(sideSelect);
      modRow.appendChild(modName);
      modRow.appendChild(modEffect);
      modRow.appendChild(modRemove);
      modsList.appendChild(modRow);

      modRows.push({ modRow, id: mod.id, sideSelect, modName, modEffect });
      refreshAddModBtn();
    }

    data.customizations.forEach(addModRow);

    addModBtn = createElement('button', 'dialog-add-row-btn ougi-box-add-mod', '＋改造を追加');
    addModBtn.type = 'button';
    addModBtn.addEventListener('click', () => addModRow(null));
    modsWrap.appendChild(addModBtn);
    refreshAddModBtn();

    item.appendChild(modsWrap);
    listEl.appendChild(item);

    rows.push({
      item,
      id: data.id,
      nameInput,
      kindInput,
      effectInput,
      skillSelect,
      getAudience: () => audience,
      // 名前も効果も空の改造行は、追加したまま埋めなかったものとして捨てる
      collectCustomizations: () => modRows
        .map(row => ({
          id: row.id,
          side: row.sideSelect.value,
          name: row.modName.value.trim(),
          effect: row.modEffect.value.trim()
        }))
        .filter(mod => mod.name !== '' || mod.effect !== '')
    });
  }

  editable.forEach(entry => addRow(entry.ougi));

  addBtn = createElement('button', 'dialog-add-row-btn', '＋奥義を追加');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    // 既定の公開先は作った本人だけ。表示名が無い人は参加者IDを持てないので、
    // その場合だけ全員公開（null）で作る（上の注記でその旨を伝えている）。
    addRow({ audience: myParticipantId ? [myParticipantId] : null });
    refreshSummary();
  });
  form.appendChild(addBtn);

  refreshSummary();

  const btnRow = createElement('div', 'dialog-button-row');

  const cancelBtn = createElement('button', null, 'キャンセル');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => dialog.close());

  const saveBtn = createElement('button', 'dialog-confirm-btn', '保存');
  saveBtn.type = 'submit';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  if (readOnly) {
    addBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    cancelBtn.textContent = '閉じる';
    lockFormControls(form, { keep: [cancelBtn] });
  } else {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      // 見えていた行の新しい内容と、触っていない行を、元の並びへ戻す。
      // 添字はhiddenが持つ元の位置で、editableは画面での並び順を保つ。
      const edited = collectOugi().filter(hasContent);
      const merged = [];
      let editedIndex = 0;

      all.forEach((_, index) => {
        const kept = hidden.find(entry => entry.index === index);
        if (kept) {
          merged.push(kept.ougi);
          return;
        }
        // 見えていた枠の順番に、編集後の行を詰めていく（削除された分は詰まる）
        if (editedIndex < edited.length && editable.some(entry => entry.index === index)) {
          merged.push(edited[editedIndex]);
          editedIndex += 1;
        }
      });
      // 追加された行（元の枠より増えた分）は末尾へ
      for (; editedIndex < edited.length; editedIndex += 1) merged.push(edited[editedIndex]);

      dialog.close();
      onSave(merged);
    });
  }

  dialog.appendChild(form);
  dialog.showModal();
}
