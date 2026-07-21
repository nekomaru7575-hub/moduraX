// js/main.js

import { rollBCDice } from './BCdice.js';
import { store, generateTokenId } from './board-data-driven.js';
import { EventBus } from './EventBus.js';

// DOM要素の取得（ダイス関連）
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const commandInput = document.getElementById('commandInput');
const logContainer = document.getElementById('logContainer');

// DOM要素の取得（キャラクター登録関連）

const characterList = document.getElementById('characterList');

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

// キャラクター一覧の描画（登録・削除の両方に反応）
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!characterList) return;

  characterList.innerHTML = "";

  Object.values(state.tokens).forEach(tokenData => {
    const item = document.createElement('div');
    item.className = 'character-list-item';

    const swatch = document.createElement('span');
    swatch.className = 'character-color-swatch';
    swatch.style.backgroundColor = tokenData.color || '#ff4757';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'character-name';
    nameSpan.textContent = tokenData.name;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-char';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => {
      store.dispatch('REMOVE_CHARACTER', { id: tokenData.id });
    });

    item.appendChild(swatch);
    item.appendChild(nameSpan);
    characterList.appendChild(item);
  });
});

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
