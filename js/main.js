// js/main.js

import { rollBCDice } from './BCdice.js';
import { store, generateTokenId, listPlugins, DEFAULT_TOKEN_COLOR } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { renderChatPalette } from './chat-palette.js';
import { makeResizableStack } from './resizable-stack.js';

// DOM要素の取得（ダイス関連）
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const characterParamSelect = document.getElementById('characterParamSelect');
const commandInput = document.getElementById('commandInput');
const logContainer = document.getElementById('logContainer');
const currentChatLog = document.getElementById('currentChatLog');
const currentChatPortrait = document.getElementById('currentChatPortrait');
const chatPalettePanel = document.getElementById('chatPalettePanel');
const controlArea = document.getElementById('controlArea');

// ログ／チャット欄／チャットパレットの高さをユーザーがドラッグで調整できるようにする
if (controlArea) {
  makeResizableStack({ container: controlArea, storageKey: 'controlAreaSectionSizesV2' });
}

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
EventBus.subscribe('DICE_ROLL_REQUESTED', async ({ system, rawInput, characterName }) => {
  if (!sendBtn) return;
  sendBtn.disabled = true;
  sendBtn.textContent = "送信中...";

  try {
    const spaceIndex = splitForSpace(rawInput);
    const command = spaceIndex[0];
    const comment = spaceIndex.slice(1).join(" ");
    const isDiceCommand = /^[A-Za-z0-9+\-*/()<>=\[\]:]+$/.test(command);

    if (!isDiceCommand) {
      applyLog({ system, character: characterName, resultText: rawInput });
      return;
    }

    const { success, resultText, diceValues } = await rollBCDice(system, command);
    if (!success) throw new Error(resultText);

    const diceDetail = diceValues && diceValues.length > 0 ?
      diceValues.map(d => d.value).join(', ') : "";

    applyLog({ system, character: characterName, comment, resultText, diceDetail });
    commandInput.value = "";

  } catch (error) {
    console.error(error);
    alert(`エラーが発生しました: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "送信";
  }
});

// {パラメータ名}を、参照キャラクターの該当パラメータの値に置換する。
// 該当パラメータが見つからない場合は{パラメータ名}のまま残す。
function substituteCharacterParameters(text, character) {
  if (!character) return text;
  return text.replace(/\{([^{}]+)\}/g, (match, rawName) => {
    const name = rawName.trim();
    const param = Object.values(character.parameters || {}).find(p => p.label === name || p.key === name);
    return param ? String(param.value) : match;
  });
}

// [演算子(+/-/=)][パラメータ名]([数値]) でパラメータを直接変更するコマンド。例: +侵蝕率(10)
// editable:falseのパラメータは変更不可。
const PARAMETER_COMMAND_PATTERN = /^([+\-=])(.+?)\(([+-]?\d+(?:\.\d+)?)\)$/;

function tryHandleParameterCommand(rawInput, character) {
  const match = rawInput.match(PARAMETER_COMMAND_PATTERN);
  if (!match) return false;

  const [, operator, rawName, rawNumber] = match;
  const name = rawName.trim();
  const amount = Number(rawNumber);

  if (!character) {
    alert('パラメータを変更するキャラクターを選択してください。');
    return true;
  }

  const entry = Object.entries(character.parameters || {}).find(
    ([, p]) => p.label === name || p.key === name
  );

  if (!entry) {
    alert(`パラメータ「${name}」が見つかりません。`);
    return true;
  }

  const [paramId, param] = entry;
  if (param.editable === false) {
    alert(`パラメータ「${name}」は変更できません。`);
    return true;
  }

  const before = param.value;
  const after = operator === '=' ? amount : operator === '+' ? before + amount : before - amount;

  store.dispatch('SET_PARAMETER', { characterId: character.id, paramId, value: after });
  applyLog({
    system: character.name,
    resultText: `${param.label}: ${before} → ${after}`
  });

  return true;
}

// チャットパレットのフレーズをクリックした際、コマンド欄を経由せず即座に送信する。
// パラメータ変更コマンド/{}置換の判定は手入力の送信と同じ処理を通す。
function sendPaletteText(text) {
  const selectedSystem = gameSystemSelect.value;
  const rawInput = text.trim();
  if (rawInput === "") return;

  const selectedCharacter = characterParamSelect?.value
    ? store.state.tokens[characterParamSelect.value]
    : null;

  if (tryHandleParameterCommand(rawInput, selectedCharacter)) {
    return;
  }

  const substitutedInput = substituteCharacterParameters(rawInput, selectedCharacter);

  EventBus.emit('DICE_ROLL_REQUESTED', {
    system: selectedSystem,
    rawInput: substitutedInput,
    characterName: selectedCharacter?.name
  });
}

if (chatPalettePanel) {
  renderChatPalette({ container: chatPalettePanel, onSend: sendPaletteText });
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const selectedSystem = gameSystemSelect.value;
    let rawInput = commandInput.value.trim();

    if (rawInput === "") {
      alert("コマンドを入力してください！");
      return;
    }

    const selectedCharacter = characterParamSelect?.value
      ? store.state.tokens[characterParamSelect.value]
      : null;

    if (tryHandleParameterCommand(rawInput, selectedCharacter)) {
      commandInput.value = "";
      return;
    }

    rawInput = substituteCharacterParameters(rawInput, selectedCharacter);

    EventBus.emit('DICE_ROLL_REQUESTED', {
      system: selectedSystem,
      rawInput: rawInput,
      characterName: selectedCharacter?.name
    });
  });
}

// 参照キャラクターの選択肢をキャラ一覧と同じ内容で維持する（登録・削除・改名に追従）
EventBus.subscribe('STATE_CHANGED', (state) => {
  if (!characterParamSelect) return;

  const previousValue = characterParamSelect.value;
  characterParamSelect.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = '（選択なし）';
  characterParamSelect.appendChild(noneOption);

  Object.values(state.tokens).forEach(tokenData => {
    const opt = document.createElement('option');
    opt.value = tokenData.id;
    opt.textContent = tokenData.name;
    characterParamSelect.appendChild(opt);
  });

  if (state.tokens[previousValue]) {
    characterParamSelect.value = previousValue;
  }

  updateCurrentChatPortrait();
});

// 盤面下のカレントチャット欄：選択中キャラクターのコマ画像（立ち絵代わり）を表示する。
// 未アップロードの場合は何も表示しない。
function updateCurrentChatPortrait() {
  if (!currentChatPortrait) return;
  const selectedCharacter = characterParamSelect?.value
    ? store.state.tokens[characterParamSelect.value]
    : null;

  currentChatPortrait.style.backgroundImage = selectedCharacter?.image
    ? `url('${selectedCharacter.image}')`
    : '';
}

characterParamSelect?.addEventListener('change', updateCurrentChatPortrait);

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

  const sortedTokens = Object.values(state.tokens).sort((a, b) => {
    const initiativeA = a.parameters?.['core:initiative']?.value ?? 0;
    const initiativeB = b.parameters?.['core:initiative']?.value ?? 0;
    return initiativeB - initiativeA;
  });

  sortedTokens.forEach(tokenData => {
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

function applyLog({ system = "", character = "", comment = "", resultText, diceDetail = "" }) {
  const detail = diceDetail ? `<small style="color: #888;">出目内訳: [${diceDetail}]</small>` : "";
  const characterTag = character ? ` <span style="color: #4caf50;">${character}</span>` : '';

  const html = `
    <strong style="color: #007acc;">[${system}]</strong>${characterTag} ${comment ? `<span style="color: #aaa;">(${comment})</span>` : ''}<br>
    <span style="font-size: 1.1rem; color: #fff;">${resultText}</span><br>
    ${detail}`;

  if (logContainer) {
    const newLog = document.createElement('div');
    newLog.className = 'log-item';
    newLog.innerHTML = html;
    logContainer.appendChild(newLog);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // 盤面下のカレントチャット欄は既存ログのミラー表示
  if (currentChatLog) {
    const mirrorLog = document.createElement('div');
    mirrorLog.className = 'current-chat-log-item';
    mirrorLog.innerHTML = html;
    currentChatLog.appendChild(mirrorLog);
    currentChatLog.scrollTop = currentChatLog.scrollHeight;
  }
}

// 初期化処理
window.addEventListener('DOMContentLoaded', () => {
  store.init();
});