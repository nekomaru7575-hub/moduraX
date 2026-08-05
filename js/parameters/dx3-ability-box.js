// js/parameters/dx3-ability-box.js
// DX3の能力値・技能値をまとめて表示する「ボックス」。
// 能力値は大きく、技能値はそれが属する能力値のまとまりの下に小さく表示する。
// 既定は閲覧専用で、editable:trueのときだけ能力値・固定技能を入力欄にして編集できる
// （部屋の外のコマ作成ツール専用。js/character-builder.jsのallowParameterEditを参照）。
// 判定セクションはチャットへ送信できる画面（＝部屋の中）でのみ表示する。

// 能力値ごとに、その能力値が持つ固定技能（2種）と、対応する可変スロット技能の
// カテゴリ（技芸/知識/騎乗/情報）をまとめる。DX3の能力値-技能の対応関係そのもの。
const DX3_ABILITY_SKILL_GROUPS = [
  { paramKey: 'sttTotalBody', label: '肉体', fixedSkills: ['skillMelee', 'skillDodge'], variablePrefix: 'skillRide', variableLabel: '運転' },
  { paramKey: 'sttTotalSense', label: '感覚', fixedSkills: ['skillRanged', 'skillPercept'], variablePrefix: 'skillArt', variableLabel: '芸術' },
  { paramKey: 'sttTotalMind', label: '精神', fixedSkills: ['skillRC', 'skillWill'], variablePrefix: 'skillKnow', variableLabel: '知識' },
  { paramKey: 'sttTotalSocial', label: '社会', fixedSkills: ['skillNegotiate', 'skillProcure'], variablePrefix: 'skillInfo', variableLabel: '情報' }
];

// クリティカル値の下限。判定式は「10+AcB」（js/parameters/dx3-combo-box.jsのrunComboCheckと
// 同じ式）だが、AcBのバフでこれが1以下まで下がると全ダイスがクリティカルして無限ロールに
// なってしまうため、ここでは2を下回らないようにクランプする。dx3-combo-box.js側の
// 「バフが持つクリティカル値の下限」（lowestBuffCriticalFloor）とは別物の、常時適用する下限。
const DX3_ABILITY_BOX_CRITICAL_FLOOR = 2;

// 技能ドロップダウンの選択肢集め。技能一覧の表示（下のforEach内）と同じ絞り込み
// （固定技能2種＋使われている可変スロット技能）を、ability・skillの各グループを横断して集める。
function collectSkillParamEntries(parameters) {
  const entries = [];
  DX3_ABILITY_SKILL_GROUPS.forEach(group => {
    group.fixedSkills.forEach(skillKey => {
      const paramId = `DX3:${skillKey}`;
      const skillParam = parameters[paramId];
      if (skillParam) entries.push([paramId, skillParam]);
    });
    Object.entries(parameters)
      .filter(([, p]) => p.source === 'DX3' && p.key?.startsWith(group.variablePrefix))
      .forEach(entry => entries.push(entry));
  });
  return entries;
}

// 能力値ドロップダウンの選択肢集め。対象キャラクターが持つ能力値だけを出す。
function collectAbilityParamEntries(parameters) {
  return DX3_ABILITY_SKILL_GROUPS
    .map(group => [`DX3:${group.paramKey}`, parameters[`DX3:${group.paramKey}`]])
    .filter(([, param]) => !!param);
}

// AdB/AnB/AcBはエフェクト/コンボのバフでのみ変化する実効値で、parameters[...].valueは
// 常に基礎値0のまま（js/parameters/dx3.jsのDX3_PARAMETERS定義・コメント参照）。
// token/getEffectiveParameterValueが渡されていれば実効値（js/parameters/dx3-combo-box.jsの
// runComboCheckと同じ取得方法）を使い、渡されていない（未対応の呼び出し元）場合のみ
// 基礎値へフォールバックする。例外は投げない。
function readEffectiveOrBaseValue(paramId, { parameters, token, getEffectiveParameterValue }) {
  if (token && typeof getEffectiveParameterValue === 'function') {
    const effective = getEffectiveParameterValue(token, paramId);
    if (effective !== undefined && effective !== null) return Number(effective) || 0;
  }
  return Number(parameters[paramId]?.value) || 0;
}

// このボックスはjs/parameters/dx3.js側から{ parameters, token, getEffectiveParameterValue }を
// 渡されて呼ばれており、新しい送信手段を実装しないという制約から、判定式のチャット送信は
// 実際のメイン入力欄＋送信ボタン（js/main.jsのcommandInput/sendBtn、js/chat-palette.js等と
// 同じ送信経路の入口）へ値を入れてクリックすることで行う。
// チャットへ送信できる画面か（＝部屋の中か）。部屋の外のコマ作成ツールには入力欄も送信ボタンも
// 無いため、判定セクションごと出さない（js/parameters/saikoro-fiction/skill-check.jsが
// rollBCDiceの有無で判定実行を出し分けているのと同じ考え方）。
function canSendToChat() {
  return !!document.getElementById('commandInput') && !!document.getElementById('sendBtn');
}

function sendDX3CheckCommand(command) {
  const commandInput = document.getElementById('commandInput');
  const sendBtn = document.getElementById('sendBtn');
  if (!commandInput || !sendBtn) {
    // 描画後に画面が変わった場合の保険（通常はcanSendToChatで手前で出さないようにしている）
    alert('この画面ではチャットへ送信できません。');
    return;
  }
  commandInput.value = command;
  sendBtn.click();
}

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog ability-box-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{ parameters: Record<string, {key:string,label:string,value:number,source?:string}>,
 *   token?: object, getEffectiveParameterValue?: (token:object, paramId:string) => number|undefined,
 *   editable?: boolean 能力値・固定技能を入力欄にして編集させるか（既定false＝閲覧専用）,
 *   onSave?: (valueOverrides: Record<string, number>) => void 保存時に{paramId: 値}を渡す
 * }} options
 */
export function showAbilitySkillBox({
  parameters, token = null, getEffectiveParameterValue, editable = false, onSave
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 編集できるのはonSaveの渡し先がある場合だけ（保存できないのに入力欄を出さない）
  const canEditValues = editable && typeof onSave === 'function';
  // 保存対象の入力欄を paramId => input で集める
  const valueInputs = new Map();

  function buildValueInput(paramId, value) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'ability-box-value-input';
    input.value = Number(value) || 0;
    valueInputs.set(paramId, input);
    return input;
  }

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = canEditValues ? '能力・技能値を編集' : '能力・技能値';
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
    const abilityLabelEl = document.createElement('span');
    abilityLabelEl.className = 'ability-box-ability-label';
    abilityLabelEl.textContent = group.label;
    abilityRow.appendChild(abilityLabelEl);

    if (canEditValues && abilityParam) {
      abilityRow.appendChild(buildValueInput(`DX3:${group.paramKey}`, abilityParam.value));
    } else {
      const abilityValueEl = document.createElement('span');
      abilityValueEl.className = 'ability-box-ability-value';
      abilityValueEl.textContent = abilityParam?.value ?? 0;
      abilityRow.appendChild(abilityValueEl);
    }
    groupEl.appendChild(abilityRow);

    const skillListEl = document.createElement('div');
    skillListEl.className = 'ability-box-skill-list';

    group.fixedSkills.forEach(skillKey => {
      const skillParam = parameters[`DX3:${skillKey}`];
      if (!skillParam) return;
      const skillEl = document.createElement('span');
      skillEl.className = 'ability-box-skill';
      if (canEditValues) {
        const skillLabelEl = document.createElement('span');
        skillLabelEl.textContent = `${skillParam.label}: `;
        skillEl.appendChild(skillLabelEl);
        skillEl.appendChild(buildValueInput(`DX3:${skillKey}`, skillParam.value));
      } else {
        skillEl.textContent = `${skillParam.label}: ${skillParam.value}`;
      }
      skillListEl.appendChild(skillEl);
    });

    // 可変スロット技能（技芸/知識/騎乗/情報）。使われている分だけ表示する。
    // 値の編集対象は能力値と固定技能だけなので、editableでも常に表示のまま。
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

  // --- 判定用ツール：能力値・技能値を選んで実行すると、判定式をチャットへ送信する ---
  // チャットへ送れない画面（部屋の外のコマ作成ツール）では、このセクションごと出さない。
  const checkSection = document.createElement('div');

  const checkTitle = document.createElement('div');
  checkTitle.className = 'effect-box-combo-title';
  checkTitle.textContent = '判定';
  checkSection.appendChild(checkTitle);

  const checkRow = document.createElement('div');
  checkRow.className = 'effect-box-combo-row';

  function buildParamSelect(entries) {
    const select = document.createElement('select');
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '（選択なし）';
    select.appendChild(noneOpt);
    entries.forEach(([paramId, param]) => {
      const opt = document.createElement('option');
      opt.value = paramId;
      opt.textContent = param.label;
      select.appendChild(opt);
    });
    return select;
  }

  const abilityField = document.createElement('div');
  abilityField.className = 'effect-box-combo-field';
  const abilityLabel = document.createElement('span');
  abilityLabel.className = 'effect-box-combo-label';
  abilityLabel.textContent = '能力値';
  const abilitySelect = buildParamSelect(collectAbilityParamEntries(parameters));
  abilityField.appendChild(abilityLabel);
  abilityField.appendChild(abilitySelect);
  checkRow.appendChild(abilityField);

  const skillField = document.createElement('div');
  skillField.className = 'effect-box-combo-field';
  const skillLabel = document.createElement('span');
  skillLabel.className = 'effect-box-combo-label';
  skillLabel.textContent = '技能値';
  const skillSelect = buildParamSelect(collectSkillParamEntries(parameters));
  skillField.appendChild(skillLabel);
  skillField.appendChild(skillSelect);
  checkRow.appendChild(skillField);

  checkSection.appendChild(checkRow);

  const checkActionRow = document.createElement('div');
  checkActionRow.className = 'dialog-button-row';
  checkActionRow.style.marginTop = '8px';

  const executeBtn = document.createElement('button');
  executeBtn.type = 'button';
  executeBtn.className = 'dialog-confirm-btn';
  executeBtn.textContent = '実行';
  executeBtn.addEventListener('click', () => {
    const abilityParamId = abilitySelect.value;
    const skillParamId = skillSelect.value;
    if (!abilityParamId || !skillParamId) {
      alert('能力値と技能値を選択してください。');
      return;
    }

    const abilityParam = parameters[abilityParamId];
    const skillParam = parameters[skillParamId];
    if (!abilityParam || !skillParam) {
      // 選択後にパラメータが無くなっていた（取得できていない）場合は、例外を投げずに送信しない
      alert('選択した能力値または技能値が見つかりません。');
      return;
    }

    // DBはバフ対象ではなく基礎値がそのまま実効値のためparameters経由のまま。
    // AdB/AnB/AcBはバフでのみ変化するため、実効値（token/getEffectiveParameterValueが
    // 渡っていれば）を読む。渡っていなければ基礎値0へ安全にフォールバックする。
    const dbValue = Number(parameters['DX3:corDB']?.value) || 0;
    const ctx = { parameters, token, getEffectiveParameterValue };
    const adbValue = readEffectiveOrBaseValue('DX3:AdB', ctx);
    const anbValue = readEffectiveOrBaseValue('DX3:AnB', ctx);
    const acbValue = readEffectiveOrBaseValue('DX3:AcB', ctx);
    const abilityValue = Number(abilityParam.value) || 0;
    const skillValue = Number(skillParam.value) || 0;

    // クリティカル値：js/parameters/dx3-combo-box.jsのrunComboCheckと同じ「10+AcB」で求め、
    // 下限（DX3_ABILITY_BOX_CRITICAL_FLOOR=2）でクランプする
    const rawCriticalValue = 10 + acbValue;
    const criticalValue = Math.max(rawCriticalValue, DX3_ABILITY_BOX_CRITICAL_FLOOR);

    const command = `(${abilityValue}+${dbValue}+${adbValue})DX(${criticalValue})+${skillValue}+${anbValue}`;
    sendDX3CheckCommand(command);
  });

  checkActionRow.appendChild(executeBtn);
  checkSection.appendChild(checkActionRow);

  if (canSendToChat()) form.appendChild(checkSection);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  // 保存はロイス・エフェクト・コンボの各ボックスと同じく、このボックス単独で完結させる
  // （更新ダイアログの「保存」を待たずに即時反映する）。
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
        valueOverrides[paramId] = Number(input.value) || 0;
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
