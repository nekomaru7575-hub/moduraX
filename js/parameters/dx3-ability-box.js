// js/parameters/dx3-ability-box.js
// DX3の能力値・技能値をまとめて表示する「ボックス」（閲覧専用）。
// 能力値は大きく、技能値はそれが属する能力値のまとまりの下に小さく表示する。

// 能力値ごとに、その能力値が持つ固定技能（2種）と、対応する可変スロット技能の
// カテゴリ（技芸/知識/騎乗/情報）をまとめる。DX3の能力値-技能の対応関係そのもの。
const DX3_ABILITY_SKILL_GROUPS = [
  { paramKey: 'sttTotalBody', label: '肉体', fixedSkills: ['skillMelee', 'skillDodge'], variablePrefix: 'skillRide', variableLabel: '運転' },
  { paramKey: 'sttTotalSense', label: '感覚', fixedSkills: ['skillRanged', 'skillPercept'], variablePrefix: 'skillArt', variableLabel: '芸術' },
  { paramKey: 'sttTotalMind', label: '精神', fixedSkills: ['skillRC', 'skillWill'], variablePrefix: 'skillKnow', variableLabel: '知識' },
  { paramKey: 'sttTotalSocial', label: '社会', fixedSkills: ['skillNegotiate', 'skillProcure'], variablePrefix: 'skillInfo', variableLabel: '情報' }
];

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog ability-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{ parameters: Record<string, {key:string,label:string,value:number,source?:string}> }} options
 */
export function showAbilitySkillBox({ parameters }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = '能力・技能値';
  form.appendChild(title);

  const groupListEl = document.createElement('div');
  groupListEl.className = 'ability-box-group-list';
  form.appendChild(groupListEl);

  DX3_ABILITY_SKILL_GROUPS.forEach(group => {
    const abilityParam = parameters[`DX3:${group.paramKey}`];

    const groupEl = document.createElement('div');
    groupEl.className = 'ability-box-group';

    const abilityRow = document.createElement('div');
    abilityRow.className = 'ability-box-ability-row';
    abilityRow.innerHTML = `<span class="ability-box-ability-label">${group.label}</span><span class="ability-box-ability-value">${abilityParam?.value ?? 0}</span>`;
    groupEl.appendChild(abilityRow);

    const skillListEl = document.createElement('div');
    skillListEl.className = 'ability-box-skill-list';

    group.fixedSkills.forEach(skillKey => {
      const skillParam = parameters[`DX3:${skillKey}`];
      if (!skillParam) return;
      const skillEl = document.createElement('span');
      skillEl.className = 'ability-box-skill';
      skillEl.textContent = `${skillParam.label}: ${skillParam.value}`;
      skillListEl.appendChild(skillEl);
    });

    // 可変スロット技能（技芸/知識/騎乗/情報）。使われている分だけ表示する
    const variableParams = Object.values(parameters).filter(
      p => p.source === 'DX3' && p.key?.startsWith(group.variablePrefix)
    );
    if (variableParams.length > 0) {
      variableParams.forEach(p => {
        const skillEl = document.createElement('span');
        skillEl.className = 'ability-box-skill';
        skillEl.textContent = `${p.label}: ${p.value}`;
        skillListEl.appendChild(skillEl);
      });
    } else {
      const skillEl = document.createElement('span');
      skillEl.className = 'ability-box-skill ability-box-skill-empty';
      skillEl.textContent = `${group.variableLabel}: ―`;
      skillListEl.appendChild(skillEl);
    }

    groupEl.appendChild(skillListEl);
    groupListEl.appendChild(groupEl);
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.addEventListener('click', () => dialog.close());

  btnRow.appendChild(closeBtn);
  form.appendChild(btnRow);

  dialog.appendChild(form);
  dialog.showModal();
}
