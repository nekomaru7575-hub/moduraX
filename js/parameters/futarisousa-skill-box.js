// js/parameters/futarisousa-skill-box.js
// フタリソウサの「技能」を表示・編集するボックス。
//
// カテゴリー4つが固定ラベルで縦に並び、その横に自由記述のテキスト欄が付くだけの表。
// 行が増減しないので、複数データを扱うボックス（js/parameters/dx3-lois-box.js）の
// 「追加／削除／件数の上限／空行を捨てる／集計行」は全部持たない。近いのは
// アリアンロッドの能力ボーナス（js/parameters/arianrhod-ability-box.js）の方で、
// あちらの dialog-custom-list のループをそのまま写してある。
//
// 保存先は components だけで、パラメータは持たない（キャラクター一覧には出さない）。
// 判定にも使用回数にも絡まないので、Coreへ知らせる必要が何も無い。
//
// 【この2つを守ること】
//   game-store.jsをimportしないこと。game-store.js → registry.js → futarisousa.js →
//   このファイル → game-store.js の循環importになる（dx3-lois-box.js冒頭と同じ理由）。
//   トップレベルでDOMに触れないこと（server/index.jsがgame-store.js経由でプラグインを
//   importするため、Node環境でも読み込める必要がある。docs/plugin-guide.mdの8.1）。

import { lockFormControls } from '../read-only-form.js';
import { createDialogHost, appendConfirmRow } from '../dialog-host.js';

export const SKILL_COMPONENT_KEY = 'charSkills';

// カテゴリーはルールブックの4分野で、固定。利用者が増減させるものではないのでラベルとして扱う。
// BCDiceにこれに当たる表は無いので、書き起こしではなく用語をそのまま使っている
// （docs/change-checklist.mdの「BCDiceに無いなら、その旨をコメントに書く」）。
export const SKILL_CATEGORIES = [
  { key: 'insight', label: '洞察' },
  { key: 'forensics', label: '鑑識' },
  { key: 'human', label: '人間' },
  { key: 'physical', label: '肉体' }
];

/**
 * 保存済み・取り込んだJSONを { [key]: string } の正規形へ揃える。
 * 4キーは必ず揃い、知らないキーは落ちる。読み出しは必ずここを通すこと
 * （docs/plugin-guide.mdの「保存済みデータは必ず正規化してから使う」）。
 */
export function normalizeFutariSousaSkills(raw) {
  const source = (raw && typeof raw === 'object') ? raw : {};
  const normalized = {};
  SKILL_CATEGORIES.forEach(({ key }) => {
    const value = source[key];
    normalized[key] = typeof value === 'string' ? value : '';
  });
  return normalized;
}

/** 何分野が埋まっているか。パネルのボタン見出し（「技能（2/4）」）に使う。 */
export function countFilledSkills(raw) {
  const skills = normalizeFutariSousaSkills(raw);
  return SKILL_CATEGORIES.filter(({ key }) => skills[key].trim() !== '').length;
}

const ensureDialog = createDialogHost('effect-box-dialog');

/**
 * @param {{
 *   skills?: object,
 *   readOnly?: boolean 他人のコマを表示だけしている時。中身は同じまま入力だけを封じる
 *     （js/character-dialog.jsのcanEdit）。
 *   onSave: (skills: object) => void
 * }} options
 */
export function showFutariSousaSkillBox({ skills = {}, readOnly = false, onSave }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const data = normalizeFutariSousaSkills(skills);

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = '技能';
  form.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'dialog-form-note';
  note.textContent = '分野ごとに、持っている技能を自由に書いてください。読点区切りでも文章でもかまいません。';
  form.appendChild(note);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  form.appendChild(list);

  const inputs = new Map();

  SKILL_CATEGORIES.forEach(({ key, label: categoryLabel }) => {
    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.className = 'dialog-param-label';
    label.textContent = categoryLabel;
    label.style.alignSelf = 'center';
    label.style.color = 'var(--text-body)';
    label.style.fontSize = '0.85rem';
    row.appendChild(label);

    const input = document.createElement('input');
    // 【要】type="text" のままにすること。numberにすると
    // .dialog-custom-row input[type="number"] の flex:0 0 38px に落ちて、
    // 自由記述には狭すぎる欄になる（css/character-dialog.css）。
    input.type = 'text';
    input.value = data[key];
    input.placeholder = `${categoryLabel}の技能`;
    inputs.set(key, input);
    row.appendChild(input);

    list.appendChild(row);
  });

  const { cancelBtn, confirmBtn: saveBtn } = appendConfirmRow(form, {
    confirmLabel: '保存',
    onCancel: () => dialog.close()
  });

  if (readOnly) {
    saveBtn.style.display = 'none';
    cancelBtn.textContent = '閉じる';
    lockFormControls(form, { keep: [cancelBtn] });
  } else {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      // 枠が4つに固定なので、空でもそのまま保存する（空行を捨てる仕組みは要らない）
      const next = {};
      inputs.forEach((input, key) => { next[key] = input.value.trim(); });
      dialog.close();
      onSave(next);
    });
  }

  dialog.appendChild(form);
  dialog.showModal();
  inputs.values().next().value?.focus();
}
