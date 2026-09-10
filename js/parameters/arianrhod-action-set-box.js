// js/parameters/arianrhod-action-set-box.js
// アリアンロッドの「行動セット」＝ムーブ／マイナー／メジャーで何を行うかという宣言の組。
// DX3のコンボ（js/parameters/dx3-combo-box.js）と同じ構えで、
//   - 登録・編集はこのボックス
//   - 発動/判定/ダメージはチャットコマンド（set.awk/set.hk/set.dmg）
//   - 発動そのものは汎用のrunSkillUse（js/parameters/skill/skill-use.js）へ委ねる
// という形にしてある。コンボと違うのは枠の作りだけで、コンボが「エフェクトを何個でも
// 選ぶ」のに対し、行動セットは「3つの枠にそれぞれスキルを1つ（＋自由記述）」を持つ。
//
// スキルのspec（ARIANRHOD_SKILL_SPEC）はjs/parameters/arianrhod.jsが持っているが、
// そこからimportすると arianrhod.js → このファイル → arianrhod.js の循環importになるため、
// store操作（dispatch等）と同じく実行系の関数の引数として受け取る。
// 同じ理由でjs/game-store.jsもimportできない（game-store.js → registry.js → arianrhod.js
// → このファイル、という連鎖があるため）。

import { runSkillUse } from './skill/skill-use.js';
import { lockFormControls } from '../read-only-form.js';
import { createDialogHost, appendConfirmRow } from '../dialog-host.js';

// 行動セットの3つの枠。timingMatchはスキルのタイミング欄との**部分一致**に使う
// （「メジャー」「メジャー／マイナー」「メジャーアクション」のどれも拾えるようにするため）。
export const ARIANRHOD_ACTION_SLOTS = Object.freeze([
  Object.freeze({ key: 'move', label: 'ムーブ', timingMatch: 'ムーブ' }),
  Object.freeze({ key: 'minor', label: 'マイナー', timingMatch: 'マイナー' }),
  Object.freeze({ key: 'major', label: 'メジャー', timingMatch: 'メジャー' })
]);

const ensureDialog = createDialogHost('effect-box-dialog');

function newActionSetId() {
  return `arianrhod-set-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toText(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * 保存済みの行動セット1件を正規形にする。古い形式・欠けたキー・他人が編集したJSONが
 * 混ざりうるので、読むときは必ずここを通す（docs/plugin-guide.mdの5章）。
 */
export function normalizeActionSet(raw) {
  const slots = {};
  ARIANRHOD_ACTION_SLOTS.forEach(({ key }) => {
    const rawSlot = raw?.slots?.[key];
    const skillName = toText(rawSlot?.skillName).trim();
    slots[key] = { skillName: skillName || null, free: toText(rawSlot?.free) };
  });

  return {
    id: toText(raw?.id) || newActionSetId(),
    name: toText(raw?.name).trim(),
    abilityParamId: toText(raw?.abilityParamId) || null,
    slots
  };
}

/** 名前が空のものは一覧から落とす（コマンドから引けないため） */
export function normalizeActionSetList(rawList) {
  return (Array.isArray(rawList) ? rawList : [])
    .map(normalizeActionSet)
    .filter(set => set.name !== '');
}

/** 行動セットを名前（完全一致）で探す。チャットコマンドが名前から保存済みデータを引く */
export function findActionSetByName(actionSets, name) {
  return actionSets.find(set => set.name === name) ?? null;
}

// チャットパレット貼り付け用の3コマンド（発動/判定/ダメージ）。
// js/parameters/arianrhod.jsのhandleArianrhodChatCommandが同じ書式で解釈する。
export function buildActionSetChatLines(setName) {
  return [
    `set.awk(${setName})`,
    `set.hk(${setName})`,
    `set.dmg(${setName})`
  ];
}

/** そのスキルが枠のタイミングに当てはまるか（部分一致） */
export function skillFitsSlot(skill, slot) {
  return toText(skill?.fields?.timing).includes(slot.timingMatch);
}

/** 行動セットに組み込まれているスキル（枠の並び順）を、登録済み一覧から引く */
export function collectActionSetSkills(actionSet, skills) {
  return ARIANRHOD_ACTION_SLOTS
    .map(slot => {
      const name = actionSet.slots[slot.key]?.skillName;
      return name ? skills.find(skill => skill.name === name) ?? null : null;
    })
    .filter(Boolean);
}

// 数値を式へ足す形にする（負数は "+-1" にせず "-1" と書く）
function signed(value) {
  const n = Math.trunc(Number(value) || 0);
  return n < 0 ? `${n}` : `+${n}`;
}

// BCDiceの結果テキストは "(コマンド) ＞ 内訳 ＞ 合計" の形。内訳の解釈（クリティカルの
// 判定等）はBCDice(Arianrhod)側に任せ、こちらは結果テキストをそのまま流す。
function logToMain(dispatch, resultText, token, chatCommand) {
  dispatch('ADD_CHAT_MESSAGE', {
    tabId: 'main',
    entry: {
      system: '行動セット', character: token?.name || '', characterId: token?.id || null,
      color: token?.textColor || null, command: chatCommand, resultText
    }
  });
}

// 消えるバフの知らせ。js/game-store.jsのlistExpiringBuffNames／formatExpiredBuffsNoteと
// 同じ整形をここに置いている（循環importになるためimportできない。冒頭のコメント参照）。
// 独立したシステム発言にせず判定/ダメージのログ本文へ足すのは、1回の操作でログが2行進むと
// 直前の結果が流れてしまうため。
const PHASE_HIERARCHY = ['scenario', 'scene', 'round', 'process', 'check'];
const PHASE_LABELS = { scenario: 'シナリオ', scene: 'シーン', round: 'ラウンド', process: 'プロセス', check: '判定' };

function formatExpiringNote(token, phase) {
  const chain = PHASE_HIERARCHY.slice(PHASE_HIERARCHY.indexOf(phase));
  const names = (token?.buffs || []).filter(b => chain.includes(b.expirePhase)).map(b => b.name);
  if (names.length === 0) return '';
  return `\n${PHASE_LABELS[phase] || phase}終了で消滅: ${names.join('、')}`;
}

// 発動ログの本文。枠ごとに「スキル名 / 自由記述」を1行ずつ並べる。
function buildSlotLines(actionSet) {
  return ARIANRHOD_ACTION_SLOTS.map(slot => {
    const { skillName, free } = actionSet.slots[slot.key];
    const parts = [skillName, free.trim()].filter(Boolean);
    return `${slot.label}: ${parts.length > 0 ? parts.join(' / ') : '―'}`;
  }).join('\n');
}

/**
 * 行動セットの発動。3つの枠に入っているスキルをまとめて「使用」する。
 * 使用制限の判定・修正値バフの付与・コストの支払い・使用回数の加算は汎用のrunSkillUseへ委ね、
 * ここでは行動セット固有の事情だけを引数で伝える：
 *   - 効果時間を指定していないスキルのバフは、プロセス終了まで（＝ダメージロール後に消える）
 *   - 枠に入っていない自由記述（移動・アイテム使用）はログにだけ出す
 */
export function runActionSetActivate({
  spec, actionSet, skills, tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId,
  onSaveSkills, chatCommand
}) {
  const selectedSkills = collectActionSetSkills(actionSet, skills);
  const slotLines = buildSlotLines(actionSet);

  // スキルを1つも組み込んでいない行動セット（移動だけ・アイテム使用だけ）は、
  // 使用回数もバフも動かないので宣言をログへ流すだけにする。
  if (selectedSkills.length === 0) {
    logToMain(dispatch, `行動セット発動: ${actionSet.name}\n${slotLines}`, getToken(), chatCommand);
    return;
  }

  runSkillUse({
    spec,
    targetSkills: selectedSkills,
    allSkills: skills,
    tokenId, dispatch, getToken, getEffectiveParameterValue, generateBuffId,
    onSaveSkills,
    chatCommand,
    logTitle: `行動セット発動: ${actionSet.name}`,
    logDetail: slotLines,
    logSystem: '行動セット',
    // ダメージロール後（set.dmg）にプロセス終了で剥がすため、効果時間の指定が無いものは
    // プロセス終了までにする。「シーン中持続」と明示したスキルのバフはそのまま残る。
    expirePhaseFallback: 'process',
    buffNameFallback: actionSet.name
  });
}

/**
 * 行動セットの判定。式は (2+{AdB})D6 + {選択した能力ボーナス} + {AnB}。
 * 読むのは実効値（バフ込み）なので、発動で付いた修正がそのまま乗る。
 */
export async function runActionSetCheck({
  actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice,
  bcdiceSystem, diceModParamId, valueModParamId, chatCommand
}) {
  const token = getToken();
  if (!token) return;

  const ability = actionSet.abilityParamId
    ? (getEffectiveParameterValue(token, actionSet.abilityParamId) ?? 0)
    : 0;
  const diceMod = getEffectiveParameterValue(token, diceModParamId) ?? 0;
  const valueMod = getEffectiveParameterValue(token, valueModParamId) ?? 0;

  const diceCount = Math.max(1, Math.round(2 + diceMod));
  const command = `${diceCount}D6${signed(ability)}${signed(valueMod)}`;

  try {
    const { success, resultText } = await rollBCDice(bcdiceSystem, command);
    if (!success) {
      alert(`行動セットの判定に失敗しました: ${resultText}`);
      return;
    }

    // 判定が済んだので、このコマの「判定終了で消滅」バフを剥がす（チャット欄で直接
    // ダイスを振った場合と同じ扱い。js/main.jsのDICE_ROLL_REQUESTED参照）。
    // 発動で付いたバフはexpirePhase:'process'なのでここでは消えず、set.dmgまで残る。
    const expiredNote = formatExpiringNote(token, 'check');
    dispatch('EXPIRE_BUFFS', { phase: 'check', tokenId });

    logToMain(dispatch, `行動セット判定: ${actionSet.name}\n${resultText}${expiredNote}`, token, chatCommand);
  } catch (error) {
    alert(`行動セットの判定でエラーが発生しました: ${error.message}`);
  }
}

/**
 * 行動セットのダメージ。式は (2+{DdB})D6 + {攻撃力} + {DaB}。
 * ロールの後、使用したバフ（＝発動で付いた効果時間の指定が無いもの）をまとめて剥がす。
 * 剥がし方をプロセス終了に揃えているのは、「シーン中持続」等と明示したバフまで
 * 巻き添えにしないため（タグでまとめて消すと効果時間の宣言が無意味になる）。
 */
export async function runActionSetDamage({
  actionSet, tokenId, dispatch, getToken, getEffectiveParameterValue, rollBCDice,
  bcdiceSystem, damageDiceParamId, attackParamId, attackModParamId, chatCommand
}) {
  const token = getToken();
  if (!token) return;

  const damageDiceMod = getEffectiveParameterValue(token, damageDiceParamId) ?? 0;
  const attack = getEffectiveParameterValue(token, attackParamId) ?? 0;
  const attackMod = getEffectiveParameterValue(token, attackModParamId) ?? 0;

  const diceCount = Math.max(1, Math.round(2 + damageDiceMod));
  const command = `${diceCount}D6${signed(attack)}${signed(attackMod)}`;

  try {
    const { success, resultText } = await rollBCDice(bcdiceSystem, command);
    const body = success ? resultText : `エラー: ${resultText}`;
    const expiredNote = formatExpiringNote(token, 'process');

    logToMain(dispatch, `行動セットダメージ: ${actionSet.name}\n${body}${expiredNote}`, token, chatCommand);
  } catch (error) {
    alert(`行動セットのダメージでエラーが発生しました: ${error.message}`);
  } finally {
    // 使用したバフの掃除。ロールが失敗しても残しておく理由が無いのでfinallyで撃つ。
    dispatch('EXPIRE_BUFFS', { phase: 'process', tokenId });
  }
}

/**
 * 行動セットの一覧・編集ボックス。
 * @param {{
 *   actionSets: Array<object>,   正規形（normalizeActionSetList済み）
 *   skills: Array<object>,       登録済みスキル（正規形）
 *   abilityChoices: Array<{paramId:string, label:string}>,  能力ボーナスの選択肢
 *   readOnly?: boolean 他人のコマを表示だけしている時。入力だけを封じ、コマンドのコピーは残す
 *     （貼り付けて実行しても対象は自分が選んでいる参照キャラクターなので、他人のコマは動かない）
 *   onSave: (actionSets: Array<object>) => void
 * }} options
 */
export function showActionSetBox({
  actionSets = [], skills = [], abilityChoices = [], readOnly = false, onSave
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = '行動セット一覧';
  form.appendChild(title);

  const note = document.createElement('p');
  note.style.color = 'var(--text-muted)';
  note.style.fontSize = '0.8rem';
  note.textContent = '発動/判定/ダメージはチャットコマンド（set.awk(名前)/set.hk(名前)/set.dmg(名前)）から実行します。「コマンドをコピー」で3つのコマンドをコピーし、チャットパレットの編集欄（複数行貼り付け可）に貼り付けてください。保存済みの内容に対して実行されるため、枠や能力を変えたら先に保存してください。';
  form.appendChild(note);

  const listEl = document.createElement('div');
  listEl.className = 'effect-box-list';
  form.appendChild(listEl);

  const rows = [];

  function addRow(rawSet) {
    const savedSet = normalizeActionSet(rawSet);

    const item = document.createElement('div');
    item.className = 'effect-box-item';

    const headerRow = document.createElement('div');
    headerRow.className = 'effect-box-header-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'effect-box-name';
    nameInput.placeholder = '行動セット名';
    nameInput.value = savedSet.name;

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
    headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    // 能力ボーナス（判定式の {選択した能力ボーナス}）
    const abilityField = document.createElement('div');
    abilityField.className = 'effect-box-combo-field';
    const abilityLabel = document.createElement('span');
    abilityLabel.className = 'effect-box-combo-label';
    abilityLabel.textContent = '能力';
    const abilitySelect = document.createElement('select');
    const abilityNoneOpt = document.createElement('option');
    abilityNoneOpt.value = '';
    abilityNoneOpt.textContent = '（選択なし）';
    abilitySelect.appendChild(abilityNoneOpt);
    abilityChoices.forEach(({ paramId, label }) => {
      const opt = document.createElement('option');
      opt.value = paramId;
      opt.textContent = label;
      abilitySelect.appendChild(opt);
    });
    abilitySelect.value = savedSet.abilityParamId || '';
    abilityField.appendChild(abilityLabel);
    abilityField.appendChild(abilitySelect);
    item.appendChild(abilityField);

    // ムーブ／マイナー／メジャーの3枠。スキルはタイミングの部分一致で絞り、
    // 選ばずに自由記述だけ（移動・アイテム使用）にもできる。
    const slotControls = {};
    ARIANRHOD_ACTION_SLOTS.forEach(slot => {
      const saved = savedSet.slots[slot.key];

      const slotRow = document.createElement('div');
      slotRow.className = 'effect-box-combo-field';

      const slotLabel = document.createElement('span');
      slotLabel.className = 'effect-box-combo-label';
      slotLabel.textContent = slot.label;
      slotRow.appendChild(slotLabel);

      const skillSelect = document.createElement('select');
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '（スキルなし）';
      skillSelect.appendChild(noneOpt);

      const fitting = skills.filter(skill => skillFitsSlot(skill, slot));
      // 保存済みの選択がタイミングの絞り込みから外れていても消さない
      // （タイミングの表記を直している最中に選択が飛ぶのを避ける）。
      if (saved.skillName && !fitting.some(skill => skill.name === saved.skillName)) {
        const keptOpt = document.createElement('option');
        keptOpt.value = saved.skillName;
        keptOpt.textContent = `${saved.skillName}（タイミング不一致）`;
        skillSelect.appendChild(keptOpt);
      }
      fitting.forEach(skill => {
        const opt = document.createElement('option');
        opt.value = skill.name;
        opt.textContent = skill.name;
        skillSelect.appendChild(opt);
      });
      skillSelect.value = saved.skillName || '';

      const freeInput = document.createElement('input');
      freeInput.type = 'text';
      freeInput.placeholder = '自由記述（移動・アイテム使用など）';
      freeInput.value = saved.free;

      slotRow.appendChild(skillSelect);
      slotRow.appendChild(freeInput);
      item.appendChild(slotRow);

      slotControls[slot.key] = { skillSelect, freeInput };
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'dialog-button-row';
    actionRow.style.marginTop = '8px';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'dialog-add-row-btn';
    copyBtn.textContent = 'コマンドをコピー';
    copyBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim() || savedSet.name;
      if (!name) {
        alert('行動セット名を入力してください。');
        return;
      }
      const text = buildActionSetChatLines(name).join('\n');
      const originalLabel = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'コピーしました';
      } catch (error) {
        alert(`クリップボードへのコピーに失敗しました: ${error.message}`);
        return;
      }
      setTimeout(() => { copyBtn.textContent = originalLabel; }, 1500);
    });

    actionRow.appendChild(copyBtn);
    item.appendChild(actionRow);

    listEl.appendChild(item);
    rows.push({ item, savedSet, nameInput, abilitySelect, slotControls, copyBtn });
  }

  actionSets.forEach(addRow);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'dialog-add-row-btn';
  addBtn.textContent = '+ 行動セットを追加';
  addBtn.addEventListener('click', () => addRow(null));
  form.appendChild(addBtn);

  const { cancelBtn, confirmBtn: saveBtn } = appendConfirmRow(form, {
    confirmLabel: '保存',
    cancelLabel: '閉じる',
    onCancel: () => dialog.close()
  });

  if (readOnly) {
    addBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    lockFormControls(form, { keep: [cancelBtn, ...rows.map(row => row.copyBtn)] });
  }

  if (!readOnly) form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextSets = rows
      .map(row => ({
        id: row.savedSet.id,
        name: row.nameInput.value.trim(),
        abilityParamId: row.abilitySelect.value || null,
        slots: Object.fromEntries(ARIANRHOD_ACTION_SLOTS.map(slot => {
          const { skillSelect, freeInput } = row.slotControls[slot.key];
          return [slot.key, { skillName: skillSelect.value || null, free: freeInput.value }];
        }))
      }))
      .filter(set => set.name !== '');

    // ダイアログは閉じない（保存後もそのまま編集・コマンドのコピーを続けられるようにするため）
    nextSets.forEach(next => {
      const row = rows.find(r => r.savedSet.id === next.id);
      if (row) Object.assign(row.savedSet, next);
    });

    onSave(nextSets);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
