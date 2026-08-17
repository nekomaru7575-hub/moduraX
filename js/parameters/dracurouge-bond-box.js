// js/parameters/dracurouge-bond-box.js
// ドラクルージュの「絆」一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// ロイス一覧（dx3-lois-box.js）と同じく、保存すると即座にonSaveへ新しい配列を渡し、
// Core側はこの配列の中身を解釈しない（components.bondsとして丸ごと保持されるだけ）。
//
// 1行は「1つの名称に対するノワール側の絆とルージュ側の絆」の2つを持つ。
// 同じ名称でもルージュとノワールは別の絆として数えるため、5つ埋まったかどうかの判定も、
// 埋まった後の始末（封印 or 積み直し）も左右それぞれ独立している。
//
// 5つ埋まった側の始末は「消えざる絆」のチェックで変わる（settleFilledBonds）:
//   チェック無し … 封印（sealed）して以後編集させない。加算は1回きり
//   チェック有り … 封印せず、最初の1つだけ残して積み直させる。積むたびに加算される
//
// パラメータ「潤い」「渇き」への加算はここでは行わない。片側が5つ埋まった数だけを
// onSaveの第2引数で報告し、dispatchはdracurouge.js側が行う。ここでgame-store.jsを
// 直接importすると game-store.js → registry.js → dracurouge.js →
// dracurouge-bond-box.js → game-store.js の循環importになる
// （dx3-lois-box.js冒頭のコメントと同じ理由）。

import { lockFormControls } from '../read-only-form.js';

// components に絆一覧を保存するときのキー。
export const BOND_COMPONENT_KEY = 'bonds';

// ルージュ／ノワールそれぞれの枠の数。5つ埋まると潤い／渇きが1増える。
export const BOND_SLOT_COUNT = 5;

// 絆の件数に上限は無い。ただし壊れた（あるいは意図的に膨らませた）保存データで
// 状態が肥大しないよう、読み出し時にこの件数で切る。
const BOND_LIST_SAFETY_MAX = 100;

// ------------------------------------------------------------------
// ルージュ／ノワールのドロップダウンの中身（仮）。正式な表が確定したら
// この2つの配列を差し替えるだけでよい。
// ここを書き換えても保存済みデータは壊れない：枠は選んだものを「文字列」として持つため、
// リストに無い値（旧リストの値）は、その枠の選択肢として一時的に追加される
// （buildSlotSelect参照。dx3-lois-box.jsの感情表（仮）と同じ手当て）。
// ------------------------------------------------------------------
export const BOND_ROUGE_OPTIONS = ['憐', '友', '信', '恋', '敬', '主'];
export const BOND_NOIR_OPTIONS = ['侮', '妬', '欲', '怒', '殺', '仇'];

/** 空の絆1件ぶんの片側（ルージュ or ノワール）。 */
function createEmptyBondSide() {
  return {
    eternal: false,                                  // 消えざる絆
    slots: Array(BOND_SLOT_COUNT).fill(''),
    sealed: false                                    // 5つ埋まって潤い／渇きへ加算済み
  };
}

/**
 * 空の絆1件。
 * @returns {{name:string, noir:object, rouge:object}}
 */
export function createEmptyBond() {
  return { name: '', noir: createEmptyBondSide(), rouge: createEmptyBondSide() };
}

// 保存済みの片側を正規化する。枠は必ず長さBOND_SLOT_COUNTの文字列配列にする。
// sealedは「加算済み」の印なので、枠が埋まっていなくてもtrueならtrueのまま残す
// （保存データを手で書き換えられても、同じ絆で二度加算させないため）。
function normalizeBondSide(raw) {
  const base = createEmptyBondSide();
  if (!raw || typeof raw !== 'object') return base;

  const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
  const slots = Array.from({ length: BOND_SLOT_COUNT }, (_, index) => (
    typeof rawSlots[index] === 'string' ? rawSlots[index] : ''
  ));

  return { eternal: raw.eternal === true, slots, sealed: raw.sealed === true };
}

/**
 * 保存済みの絆1件を、欠けたフィールドを補って正規化する。
 * 途中でデータ形式を足しても古いコマが壊れないよう、読み出しは必ずここを通す。
 */
export function normalizeBond(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyBond();
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    noir: normalizeBondSide(raw.noir),
    rouge: normalizeBondSide(raw.rouge)
  };
}

export function normalizeBondList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.slice(0, BOND_LIST_SAFETY_MAX).map(normalizeBond);
}

/** その側の枠が5つとも埋まっているか。 */
export function isBondSideFilled(side) {
  return normalizeBondSide(side).slots.every(value => value !== '');
}

// 消えざる絆が一巡したときに残す枠の数。1つ残すのは、その絆自体は消えていないことを
// 盤面に留めておくため（消えるのは今回の加算に使った分だけ）。
const ETERNAL_KEEP_COUNT = 1;

// 5つ埋まった側を、加算した後どうするか。
//   消えざる絆でない … 封印する（sealed）。以後その側は編集できず、二度と加算されない
//   消えざる絆       … 封印せず、最初の1つだけ残して残りを空に戻す。また5つ積めば再び加算される
function settleFilledSide(side) {
  if (!side.eternal) return { ...side, sealed: true };

  return {
    ...side,
    slots: side.slots.map((value, index) => (index < ETERNAL_KEEP_COUNT ? value : ''))
  };
}

/**
 * 保存時に、5つ埋まった側を清算して「今回新たに加算する数」を数える。
 * 既にsealedの側は数えない＝二重加算しない。
 *
 * @param {Array<object>} bonds 正規化済みの絆一覧
 * @param {{ recycleEternal?: boolean }} [options]
 *   recycleEternal … 消えざる絆の側を封印せず積み直させるか（既定true）。
 *     falseにすると消えざる絆も封印する。シートからの取り込みだけがこちらを使う
 *     （取り込み元に既に5つ入っている絆を積み直すと、その4つを黙って捨てることになるため。
 *     js/parameters/dracurouge.jsのimportDracurougeBondsFromSheet）。
 * @returns {{bonds: Array<object>, rougeSealed: number, noirSealed: number}}
 */
export function settleFilledBonds(bonds, { recycleEternal = true } = {}) {
  let rougeSealed = 0;
  let noirSealed = 0;

  const settle = (side) => (recycleEternal ? settleFilledSide(side) : { ...side, sealed: true });

  const nextBonds = bonds.map(bond => {
    let rouge = { ...bond.rouge };
    let noir = { ...bond.noir };

    if (!rouge.sealed && isBondSideFilled(rouge)) {
      rouge = settle(rouge);
      rougeSealed += 1;
    }
    if (!noir.sealed && isBondSideFilled(noir)) {
      noir = settle(noir);
      noirSealed += 1;
    }

    return { ...bond, rouge, noir };
  });

  return { bonds: nextBonds, rougeSealed, noirSealed };
}

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog bond-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

// 枠1つぶんのドロップダウン。表（仮）に無い値でも、現在の値であれば選択肢として足しておく
// （表を差し替える前に保存した値が消えないようにするため）。
function buildSlotSelect(options, currentValue, title) {
  const select = document.createElement('select');
  select.className = 'bond-box-slot';
  select.title = title;

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '－';
  select.appendChild(blank);

  const values = options.includes(currentValue) || !currentValue
    ? options
    : [...options, currentValue];

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = currentValue || '';
  return select;
}

// 列の見出し1行。行（addRow）と同じクラスで組み立てるので、幅の定義は1か所（CSS）で済み、
// 枠の幅を変えても見出しが勝手にずれない。
function buildHeadRow() {
  const head = document.createElement('div');
  head.className = 'bond-box-row bond-box-head';

  const sideLabel = (kind, text) => {
    const cell = document.createElement('div');
    cell.className = `bond-box-side bond-box-side-${kind}`;
    cell.textContent = text;
    return cell;
  };
  const markLabel = (title) => {
    const cell = document.createElement('div');
    cell.className = 'bond-box-eternal';
    cell.textContent = '消';
    cell.title = title;
    return cell;
  };

  head.appendChild(sideLabel('noir', 'ノワール'));
  head.appendChild(markLabel('消えざる絆（ノワール）'));

  const name = document.createElement('div');
  name.className = 'bond-box-head-name';
  name.textContent = '名称';
  head.appendChild(name);

  head.appendChild(markLabel('消えざる絆（ルージュ）'));
  head.appendChild(sideLabel('rouge', 'ルージュ'));

  return head;
}

/**
 * @param {{
 *   bonds: Array<object>,
 *   readOnly?: boolean 他人のコマを表示だけしている時。中身は同じまま入力だけを封じる
 *     （js/character-dialog.jsのcanEdit）。
 *   onSave: (bonds: Array<object>, awards: {rougeSealed: number, noirSealed: number}) => void
 *     awardsは「今回新たに5つ埋まった側の数」。潤い（ルージュ）／渇き（ノワール）への
 *     加算はこれを受け取った側が行う。
 * }} options
 */
export function showBondBox({ bonds = [], readOnly = false, onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = '絆一覧';
  form.appendChild(title);

  // 「保存すると潤い／渇きがいくつ増えるか」をその場で確認できるようにする。
  // 実際のパラメータへは保存後（dracurouge.js側のSET_PARAMETER）に反映される。
  const summary = document.createElement('div');
  summary.className = 'bond-box-summary';
  form.appendChild(summary);

  // 1行が横に長い（枠5つ×2＋チェック2つ＋名称）ので、縦だけでなく横にもスクロールさせる。
  const listEl = document.createElement('div');
  listEl.className = 'bond-box-list';
  form.appendChild(listEl);

  // 見出し。どちら側がノワールでどちらがルージュかは色だけでは分からないので、列の名前を出す。
  // 行と同じ .bond-box-row を土台にして各列の幅を揃え、リストの中に入れて
  // 横スクロールに追従させる（外に置くと行だけがずれる）。縦スクロール時は貼り付く。
  listEl.appendChild(buildHeadRow());

  const rows = [];

  // 行の入力から現在の絆一覧を組み立てる（集計表示と保存の両方で使う）。
  function collectBonds() {
    return rows.map(row => ({
      name: row.nameInput.value.trim(),
      noir: {
        eternal: row.noir.eternalCheckbox.checked,
        slots: row.noir.selects.map(select => select.value),
        sealed: row.noir.sealed
      },
      rouge: {
        eternal: row.rouge.eternalCheckbox.checked,
        slots: row.rouge.selects.map(select => select.value),
        sealed: row.rouge.sealed
      }
    }));
  }

  // 名称・枠・消えざる絆がどれも空の行は、追加したまま埋めなかったものとして保存時に捨てる。
  function hasContent(bond) {
    return bond.name !== ''
      || bond.noir.eternal || bond.rouge.eternal
      || bond.noir.slots.some(value => value !== '')
      || bond.rouge.slots.some(value => value !== '');
  }

  // 集計は「保存したらこうなる」数でなければ意味が無いので、捨てる行は数えない
  function refreshSummary() {
    const current = collectBonds().filter(hasContent);
    const { rougeSealed, noirSealed } = settleFilledBonds(current);

    const pending = [];
    if (rougeSealed > 0) pending.push(`潤い +${rougeSealed}`);
    if (noirSealed > 0) pending.push(`渇き +${noirSealed}`);

    summary.textContent = pending.length > 0
      ? `絆 ${current.length}件（保存すると ${pending.join(' / ')}）`
      : `絆 ${current.length}件`;
  }

  // 片側（ルージュ or ノワール）の枠5つを組み立てる。
  // 封印済み（5つ埋まって加算済み）の側は、枠も消えざる絆も触れなくする。名称は編集できる。
  function buildSide({ kind, data, options, label }) {
    const group = document.createElement('div');
    group.className = `bond-box-side bond-box-side-${kind}`;

    const selects = data.slots.map((value, index) => {
      const select = buildSlotSelect(options, value, `${label}${index + 1}`);
      select.addEventListener('change', refreshSummary);
      group.appendChild(select);
      return select;
    });

    const eternalLabel = document.createElement('label');
    eternalLabel.className = 'bond-box-eternal';
    eternalLabel.title = `消えざる絆（${label}）`;
    const eternalCheckbox = document.createElement('input');
    eternalCheckbox.type = 'checkbox';
    eternalCheckbox.checked = data.eternal;
    eternalCheckbox.addEventListener('change', refreshSummary);
    eternalLabel.appendChild(eternalCheckbox);

    if (data.sealed) {
      group.classList.add('is-sealed');
      eternalLabel.classList.add('is-sealed');
      group.title = `${label}は5つ揃っているため編集できません`;
      selects.forEach(select => { select.disabled = true; });
      eternalCheckbox.disabled = true;
    }

    return { element: group, eternalElement: eternalLabel, selects, eternalCheckbox, sealed: data.sealed };
  }

  function addRow(rawBond) {
    const data = normalizeBond(rawBond);

    const row = document.createElement('div');
    row.className = 'bond-box-row';

    // 並びは左から ノワール5枠 → 消えざる絆 → 名称 → 消えざる絆 → ルージュ5枠。
    // 名称の左隣のチェックがノワール側、右隣がルージュ側。
    const noir = buildSide({ kind: 'noir', data: data.noir, options: BOND_NOIR_OPTIONS, label: 'ノワール' });
    const rouge = buildSide({ kind: 'rouge', data: data.rouge, options: BOND_ROUGE_OPTIONS, label: 'ルージュ' });

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'bond-box-name';
    nameInput.placeholder = '絆の相手';
    nameInput.value = data.name;
    nameInput.addEventListener('input', refreshSummary);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'dialog-remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
      const index = rows.findIndex(r => r.row === row);
      if (index !== -1) rows.splice(index, 1);
      refreshSummary();
    });

    row.appendChild(noir.element);
    row.appendChild(noir.eternalElement);
    row.appendChild(nameInput);
    row.appendChild(rouge.eternalElement);
    row.appendChild(rouge.element);
    row.appendChild(removeBtn);

    listEl.appendChild(row);
    rows.push({ row, nameInput, noir, rouge });
  }

  normalizeBondList(bonds).forEach(addRow);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '+ 絆を追加';
  addBtn.addEventListener('click', () => {
    addRow(null);
    refreshSummary();
  });
  form.appendChild(addBtn);

  refreshSummary();

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

  if (readOnly) {
    addBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    cancelBtn.textContent = '閉じる';
    lockFormControls(form, { keep: [cancelBtn] });
  } else {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const { bonds: nextBonds, rougeSealed, noirSealed } =
        settleFilledBonds(collectBonds().filter(hasContent));

      dialog.close();
      onSave(nextBonds, { rougeSealed, noirSealed });
    });
  }

  dialog.appendChild(form);
  dialog.showModal();
}
