// js/main.js

import { rollBCDice } from './BCdice.js';
import { store, generateTokenId, listPlugins, DEFAULT_TOKEN_COLOR } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';

// DOM要素の取得（ダイス関連）
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const commandInput = document.getElementById('commandInput');
const logContainer = document.getElementById('logContainer');

// DOM要素の取得（キャラクター登録関連）

const characterList = document.getElementById('characterList');

// ...(既存のDOM取得の並びに追加)
const roomPluginSelect = document.getElementById('roomPluginSelect');
const roomParameterList = document.getElementById('roomParameterList');
const roomMenuBtn = document.getElementById('roomMenuBtn');
const roomSettingsDialog = document.getElementById('roomSettingsDialog');

// キャラクター一覧パネルの折りたたみ（他プレイヤーには影響しない、見た目だけのローカル状態）
const characterPanelArea = document.getElementById('characterPanelArea');
const characterPanelCollapseBtn = document.getElementById('characterPanelCollapseBtn');
const characterPanelExpandBtn = document.getElementById('characterPanelExpandBtn');

if (characterPanelArea && characterPanelCollapseBtn && characterPanelExpandBtn) {
  characterPanelCollapseBtn.addEventListener('click', () => {
    characterPanelArea.classList.add('collapsed');
  });
  characterPanelExpandBtn.addEventListener('click', () => {
    characterPanelArea.classList.remove('collapsed');
  });
}

// ルームメニューボタン：クリックでドロップダウンを出し、選択でダイアログを開く
if (roomMenuBtn && roomSettingsDialog) {
  roomMenuBtn.addEventListener('click', () => {
    const rect = roomMenuBtn.getBoundingClientRect();
    showContextMenu(rect.left, rect.bottom + 4, [
      {
        label: 'ルーム設定',
        onSelect: () => roomSettingsDialog.showModal()
      }
    ]);
  });
}

// ダイス処理イベント
EventBus.subscribe('DICE_ROLL_REQUESTED', async ({ system, rawInput }) => {
  if (!sendBtn) return;
  sendBtn.disabled = true;
  sendBtn.textContent = "ダイスを振っています...";

  try {
    const spaceIndex = splitForSpace(rawInput);
    const command = spaceIndex[0];
    const comment = spaceIndex.slice(1).join(" ");
    const isDiceCommand = /^[A-Za-z0-9+\-*/()<>=\[\]:]+$/.test(command);

    if (!isDiceCommand) {
      applyLog({ system, resultText: rawInput });
      return;
    }

    const { success, resultText, diceValues } = await rollBCDice(system, command);
    if (!success) throw new Error(resultText);

    const diceDetail = diceValues && diceValues.length > 0 ?
      diceValues.map(d => d.value).join(', ') : "";

    applyLog({ system, comment, resultText, diceDetail });
    commandInput.value = "";

  } catch (error) {
    console.error(error);
    alert(`エラーが発生しました: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "ダイスを振る";
  }
});

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const selectedSystem = gameSystemSelect.value;
    const rawInput = commandInput.value.trim();

    if (rawInput === "") {
      alert("コマンドを入力してください！");
      return;
    }

    EventBus.emit('DICE_ROLL_REQUESTED', {
      system: selectedSystem,
      rawInput: rawInput
    });
  });
}

// プラグイン選択肢を生成（起動時1回）
if (roomPluginSelect) {
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = '（プラグインなし）';
  roomPluginSelect.appendChild(noneOption);

  listPlugins().forEach(plugin => {
    const opt = document.createElement('option');
    opt.value = plugin.id;
    opt.textContent = plugin.label;
    roomPluginSelect.appendChild(opt);
  });

  roomPluginSelect.addEventListener('change', () => {
    store.dispatch('SET_ACTIVE_PLUGIN', { pluginId: roomPluginSelect.value || null });
  });
}

// ルーム変数の表示（STATE_CHANGEDで更新）
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!roomParameterList) return;
  roomParameterList.innerHTML = '';

  Object.values(state.room.parameters).forEach(param => {
    const row = document.createElement('div');
    row.className = 'character-param-row';
    row.innerHTML = `<span>${param.label}</span><span>${param.value}</span>`;
    roomParameterList.appendChild(row);
  });
});

// キャラクター一覧の描画（登録・削除の両方に反応）
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!characterList) return;

  characterList.innerHTML = "";

  Object.values(state.tokens).forEach(tokenData => {
    const item = document.createElement('div');
    item.className = 'character-list-item';

    // アバター（画像 or 色）＋ イニシアチブバッジ ＋ 名前
    const avatarColumn = document.createElement('div');
    avatarColumn.className = 'character-avatar-column';

    const avatar = document.createElement('div');
    avatar.className = 'character-avatar';
    if (tokenData.image) {
      avatar.style.backgroundImage = `url('${tokenData.image}')`;
    } else {
      avatar.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;
    }

    const initiativeParam = tokenData.parameters?.['core:initiative'];
    if (initiativeParam) {
      const initiativeBadge = document.createElement('span');
      initiativeBadge.className = 'character-avatar-initiative';
      initiativeBadge.textContent = initiativeParam.value;
      avatar.appendChild(initiativeBadge);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'character-avatar-name';
    nameSpan.textContent = tokenData.name;

    avatarColumn.appendChild(avatar);
    avatarColumn.appendChild(nameSpan);
    item.appendChild(avatarColumn);

    // パラメータ一覧
    const paramList = document.createElement('div');
    paramList.className = 'character-param-list';

    Object.values(tokenData.parameters || {})
      .filter(param => param.visible !== false)
      .forEach(param => {
        const paramRow = document.createElement('div');
        paramRow.className = 'character-list-param-row';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'character-param-label';
        labelSpan.textContent = truncateLabel(param.label);
        labelSpan.title = param.label;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'character-param-value';
        valueSpan.textContent = param.value;

        paramRow.appendChild(labelSpan);
        paramRow.appendChild(valueSpan);
        paramList.appendChild(paramRow);
      });

    item.appendChild(paramList);
    characterList.appendChild(item);
  });
});

function truncateLabel(label, maxLength = 4) {
  if (!label) return '';
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}

function splitForSpace(string) {
  return string.trim().replaceAll(" ", " ").split(" ");
}

function applyLog({ system = "", comment = "", resultText, diceDetail = "" }) {
  if (!logContainer) return;
  const newLog = document.createElement('div');
  const detail = diceDetail ? `<small style="color: #888;">出目内訳: [${diceDetail}]</small>` : "";

  newLog.className = 'log-item';
  newLog.innerHTML = `
    <strong style="color: #007acc;">[${system}]</strong> ${comment ? `<span style="color: #aaa;">(${comment})</span>` : ''}<br>
    <span style="font-size: 1.1rem; color: #fff;">${resultText}</span><br> 
    ${detail}`;

  logContainer.appendChild(newLog);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// 初期化処理
window.addEventListener('DOMContentLoaded', () => {
  store.init();
});