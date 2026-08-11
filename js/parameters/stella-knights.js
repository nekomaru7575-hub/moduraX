import { MAX_ANIMATED_DICE } from '../dice-notation.js';
import { buildParameters } from './paramFactory.js';

const STELLA_KNIGHTS_BCDICE_SYSTEM = 'StellarKnights';
const CHARGE_COMMAND_PATTERN = /^charge\((\d+)\)$/i;
const MAIN_TAB_ID = 'main';

const FACE_PARAMETERS = [
  { key: 'face1', label: '１の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face2', label: '２の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face3', label: '３の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face4', label: '４の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face5', label: '５の目', value: 0, locked: true, editable: true, visible: false },
  { key: 'face6', label: '６の目', value: 0, locked: true, editable: true, visible: false }
];

function buildStellaKnightsCharacterParameters() {
  return buildParameters('STELLA_KNIGHTS', FACE_PARAMETERS);
}

function looksLikeStellaKnightsChatCommand(rawInput) {
  return CHARGE_COMMAND_PATTERN.test(String(rawInput).trim());
}

function countFaces(diceValues) {
  const counts = [0, 0, 0, 0, 0, 0];
  (diceValues ?? []).forEach(rand => {
    if (rand?.sides !== 6 || !Number.isInteger(rand.value)) return;
    if (rand.value < 1 || rand.value > 6) return;
    counts[rand.value - 1] += 1;
  });
  return counts;
}

function readFaceValue(parameters, face) {
  const value = parameters?.[`STELLA_KNIGHTS:face${face}`]?.value;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function renderStellaKnightsCharacterPanel({ container, canEdit = true, parameters = {} }) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = '銀剣のステラナイツ';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  const rows = FACE_PARAMETERS.map((definition, index) => {
    const face = index + 1;
    const paramId = `STELLA_KNIGHTS:${definition.key}`;

    const row = document.createElement('div');
    row.className = 'dialog-custom-row';

    const label = document.createElement('label');
    label.textContent = definition.label;
    label.className = 'dialog-param-label';
    label.style.alignSelf = 'center';
    label.style.color = '#ccc';
    label.style.fontSize = '0.85rem';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = readFaceValue(parameters, face);
    input.disabled = !canEdit;

    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);

    return { paramId, input };
  });

  return {
    getValues: () => Object.fromEntries(
      rows.map(({ paramId, input }) => [paramId, Math.max(0, Math.trunc(Number(input.value) || 0))])
    )
  };
}

function buildChargeLines(token, counts, dispatch) {
  return counts.flatMap((count, index) => {
    if (count === 0) return [];

    const face = index + 1;
    const paramId = `STELLA_KNIGHTS:face${face}`;
    const param = token.parameters?.[paramId];
    const before = Number(param?.value ?? 0);
    const after = before + count;

    dispatch('SET_PARAMETER', { characterId: token.id, paramId, value: after });

    const label = param?.label ?? FACE_PARAMETERS[index].label;
    return `${label}: ${before} -> ${after} (+${count})`;
  });
}

function handleStellaKnightsChatCommand(rawInput, { token, dispatch, rollBCDice }) {
  const input = String(rawInput).trim();
  const match = input.match(CHARGE_COMMAND_PATTERN);
  if (!match) return false;

  if (!token) {
    alert('チャージを行うキャラクターを選択してください。');
    return true;
  }
  if (!rollBCDice) {
    alert('この画面ではダイスを振れません。部屋の中で実行してください。');
    return true;
  }

  const diceCount = Number(match[1]);
  if (!Number.isInteger(diceCount) || diceCount < 1) {
    alert('charge() のダイス数には 1 以上の整数を指定してください。');
    return true;
  }

  const command = `${diceCount}B6`;
  rollBCDice(STELLA_KNIGHTS_BCDICE_SYSTEM, command).then(({ success, resultText, diceValues }) => {
    if (!success) {
      alert(`チャージロールに失敗しました: ${resultText}`);
      return;
    }

    const counts = countFaces(diceValues);
    const changeLines = buildChargeLines(token, counts, dispatch);
    const diceDetail = diceValues?.length ? diceValues.map(d => d.value).join(', ') : '';

    if (diceValues?.length) {
      dispatch('ROLL_DICE_ANIMATION', {
        tabId: MAIN_TAB_ID,
        dice: diceValues.slice(0, MAX_ANIMATED_DICE)
      });
    }

    dispatch('ADD_CHAT_MESSAGE', {
      tabId: MAIN_TAB_ID,
      entry: {
        system: '銀剣のステラナイツ',
        character: token.name || '',
        characterId: token.id || null,
        color: token.textColor || null,
        command: input,
        diceDetail,
        resultText: [
          `チャージ: ${command}`,
          resultText,
          changeLines.length ? changeLines.join('\n') : '加算される出目はありませんでした。'
        ].join('\n')
      }
    });
  }).catch(error => {
    alert(`チャージロールでエラーが発生しました: ${error.message}`);
  });

  return true;
}

export const STELLA_KNIGHTS_PLUGIN = {
  id: 'STELLA_KNIGHTS',
  label: '銀剣のステラナイツ',
  buildCharacterParameters: buildStellaKnightsCharacterParameters,
  renderCharacterPanel: renderStellaKnightsCharacterPanel,
  handleChatCommand: handleStellaKnightsChatCommand,
  looksLikeOwnChatCommand: looksLikeStellaKnightsChatCommand
};
