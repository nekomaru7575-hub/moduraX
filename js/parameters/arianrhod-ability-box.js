// js/parameters/arianrhod-ability-box.js
// アリアンロッドの「能力ボーナス」7種・レベル（CL）・重量上限をまとめて表示・編集する
// ボックスと、その下に並ぶ汎用判定（命中判定・回避判定など）。
//
// 上半分（パラメータ）はeditable:falseの値で、キャラクター更新ダイアログからは手入力
// できない（js/game-store.jsのSET_PARAMETERが弾く）。DX3の能力値・技能値と同じ扱いで、
// 部屋の外のコマ作成ツール（js/character-builder.jsのallowParameterEdit:true）でだけ
// 入力欄になり、書き込みはIMPORT_CHARACTER_DATAのvalueOverridesで行う
// （js/parameters/dx3-ability-box.jsと同じ経路）。
//
// 下半分（汎用判定）はコマのcomponentsに入る設定なので、部屋の中でも編集できる。
// 判定コマンドは「{}のまま」組み立てて、実際の値の解決はチャット側へ任せる
// （js/main.jsのsubstituteCharacterParameters。参照キャラクターの実効値＝バフ込みになる）。
//
// トップレベルでDOMに触れないこと（server/index.jsがgame-store.js経由でプラグインを
// importするため、Node環境でも読み込める必要がある。docs/plugin-guide.mdの8.1）。

import { createDialogHost } from '../dialog-host.js';

const ensureDialog = createDialogHost('effect-box-dialog');

// チャットへ送れる画面か（部屋の中か）。コマ作成ツールには送信欄が無いので、
// そこでは「実行」を出さずコピーだけにする（dx3-ability-box.jsと同じ判定）。
function canSendToChat() {
  return !!document.getElementById('commandInput') && !!document.getElementById('sendBtn');
}

function sendToChat(command) {
  const commandInput = document.getElementById('commandInput');
  const sendBtn = document.getElementById('sendBtn');
  if (!commandInput || !sendBtn) {
    alert('この画面ではチャットへ送信できません。');
    return;
  }
  commandInput.value = command;
  sendBtn.click();
}

// 数値を式へ足す形にする（負数は "+-1" にせず "-1" と書く）
function signed(value) {
  const n = Math.trunc(Number(value) || 0);
  return n < 0 ? `${n}` : `+${n}`;
}

/**
 * 汎用判定1件のコマンド。「実行」と「コピー」で書式がずれないよう、ここに集約する。
 * 値は{}のまま置く：チャットへ送るときに参照キャラクターの実効値へ解決されるので、
 * バフが乗った状態がそのまま判定へ効く。
 * @returns {string} 例: (2+0+{AdB})D6+{器用ボーナス}+{AnB} 命中判定
 */
export function buildGeneralCheckCommand({ label, bonus, abilityLabel, diceModName, valueModName }) {
  const ability = abilityLabel ? `+{${abilityLabel}}` : '';
  return `(2${signed(bonus)}+{${diceModName}})D6${ability}+{${valueModName}} ${label}`;
}

/**
 * 保存済みの汎用判定の設定を正規形にする（{ [判定key]: {bonus, abilityParamId} }）。
 * 未設定・壊れた値は宣言の既定（修正0・その判定に対応する能力ボーナス）へ落とす。
 */
export function normalizeGeneralChecks(checks, raw) {
  const settings = {};
  checks.forEach(check => {
    const stored = raw?.[check.key];
    const bonus = Math.trunc(Number(stored?.bonus));
    const abilityParamId = typeof stored?.abilityParamId === 'string' && stored.abilityParamId
      ? stored.abilityParamId
      : check.abilityParamId;
    settings[check.key] = {
      bonus: Number.isFinite(bonus) ? bonus : 0,
      abilityParamId
    };
  });
  return settings;
}

/**
 * @param {{
 *   parameters: Record<string, {label:string, value:number}>,
 *   rows: Array<{paramId:string, label:string}>,  表示する行（能力ボーナス7種＋CL＋重量上限）
 *   editable?: boolean,   部屋の外のコマ作成ツールでのみtrue
 *   onSave?: (valueOverrides: Record<string, number>) => void,
 *   checks?: Array<{key:string, label:string, abilityParamId:string}>,  汎用判定の宣言
 *   abilityChoices?: Array<{paramId:string, label:string}>,
 *   checkSettings?: Record<string, {bonus:number, abilityParamId:string}>,  保存済みの設定
 *   canEditChecks?: boolean,
 *   onChecksChange?: (settings: object) => void,  変更のたびに呼ばれる（即時保存）
 *   diceModName?: string,   判定式に書くダイス数修正の名前（既定 'AdB'）
 *   valueModName?: string   判定式に書く判定値修正の名前（既定 'AnB'）
 * }} options
 */
export function showArianrhodAbilityBox({
  parameters = {}, rows = [], editable = false, onSave,
  checks = [], abilityChoices = [], checkSettings = {}, canEditChecks = false, onChecksChange,
  diceModName = 'AdB', valueModName = 'AnB'
}) {
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
    note.style.color = 'var(--text-muted)';
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
    label.style.color = 'var(--text-body)';
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
      valueEl.style.color = 'var(--text-emphasis)';
      valueEl.textContent = String(Number(param?.value) || 0);
      row.appendChild(valueEl);
    }

    list.appendChild(row);
  });

  // --- 汎用判定 ---
  // 判定ごとに「修正値（既定0）」と「使う能力ボーナス」を持ち、コマンドを組み立てる。
  // 設定はcomponentsに入るので、部屋の中でも編集できる（上のパラメータとは別扱い）。
  const checkRows = [];
  const settings = { ...checkSettings };

  if (checks.length > 0) {
    const checkTitle = document.createElement('h3');
    checkTitle.textContent = '汎用判定';
    checkTitle.style.marginTop = '16px';
    form.appendChild(checkTitle);

    const checkNote = document.createElement('p');
    checkNote.style.color = 'var(--text-muted)';
    checkNote.style.fontSize = '0.8rem';
    checkNote.textContent = `(2+修正+{${diceModName}})D6+{能力ボーナス}+{${valueModName}} の形で組み立てます。{}のまま送るので、バフを含んだ今の値で振られます。`;
    form.appendChild(checkNote);

    const checkList = document.createElement('div');
    checkList.className = 'dialog-custom-list';
    form.appendChild(checkList);

    const readSetting = (check) => settings[check.key] ?? { bonus: 0, abilityParamId: check.abilityParamId };
    const abilityLabelOf = (paramId) => abilityChoices.find(choice => choice.paramId === paramId)?.label ?? '';

    const commandOf = (check) => {
      const setting = readSetting(check);
      return buildGeneralCheckCommand({
        label: check.label,
        bonus: setting.bonus,
        abilityLabel: abilityLabelOf(setting.abilityParamId),
        diceModName, valueModName
      });
    };

    checks.forEach(check => {
      const setting = readSetting(check);

      const row = document.createElement('div');
      row.className = 'dialog-custom-row';

      const label = document.createElement('label');
      label.className = 'dialog-param-label';
      label.textContent = check.label;
      label.style.alignSelf = 'center';
      label.style.color = 'var(--text-body)';
      label.style.fontSize = '0.85rem';
      row.appendChild(label);

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '4px';
      controls.style.alignItems = 'center';

      const bonusInput = document.createElement('input');
      bonusInput.type = 'number';
      bonusInput.step = '1';
      bonusInput.value = String(setting.bonus);
      bonusInput.style.width = '64px';
      bonusInput.title = `${check.label}に足すダイス数の修正`;
      bonusInput.disabled = !canEditChecks;

      const abilitySelect = document.createElement('select');
      abilityChoices.forEach(({ paramId, label: abilityLabel }) => {
        const opt = document.createElement('option');
        opt.value = paramId;
        opt.textContent = abilityLabel;
        abilitySelect.appendChild(opt);
      });
      abilitySelect.value = setting.abilityParamId;
      abilitySelect.title = `${check.label}に使う能力ボーナス`;
      abilitySelect.disabled = !canEditChecks;

      const commit = () => {
        settings[check.key] = {
          bonus: Math.trunc(Number(bonusInput.value) || 0),
          abilityParamId: abilitySelect.value
        };
        // 設定はこのボックス単独で保存する（更新ダイアログの「保存」を待たない。
        // 他のボックスと同じ振る舞い）。
        onChecksChange?.({ ...settings });
      };
      bonusInput.addEventListener('change', commit);
      abilitySelect.addEventListener('change', commit);

      controls.appendChild(bonusInput);
      controls.appendChild(abilitySelect);

      // 実行はチャットへ送れる画面（部屋の中）だけ。作成ツールではコピーだけ使う。
      if (canSendToChat()) {
        const runBtn = document.createElement('button');
        runBtn.type = 'button';
        runBtn.className = 'effect-box-use-btn';
        runBtn.textContent = '実行';
        runBtn.title = `${check.label}を振る`;
        runBtn.addEventListener('click', () => {
          dialog.close();
          sendToChat(commandOf(check));
        });
        controls.appendChild(runBtn);
      }

      row.appendChild(controls);
      checkList.appendChild(row);
      checkRows.push({ check, bonusInput, abilitySelect });
    });

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'dialog-add-row-btn';
    copyBtn.style.marginTop = '8px';
    copyBtn.textContent = '判定をコピー';
    copyBtn.title = 'すべての汎用判定のコマンドをコピーします（チャットパレットへ貼り付け）';
    copyBtn.addEventListener('click', async () => {
      const text = checks.map(commandOf).join('\n');
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
    form.appendChild(copyBtn);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

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
