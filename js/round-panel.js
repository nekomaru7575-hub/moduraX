// js/round-panel.js
// ラウンド進行の状態バー。進行中（state.round.active）のときだけ表示し、平常時は
// 邪魔にならないよう非表示にする。開始のきっかけ（ラウンド進行を開始）はルームメニュー
// （js/main.jsのroomMenuBtn）側から呼ばれるopenRoundStartDialog()が担う。
// net-sync.jsと同様にinitRoundPanel()をexportし、main.jsの初期化処理から1回だけ呼ぶ。
// STATE_CHANGEDを自前で購読し、state.round/state.tokensの参照が変わったときだけ再描画する
// （lastRenderedChatTabsRefと同じ差分チェックパターン）。
// 点呼(confirmation)はソフトな可視化のみで、進行操作自体はブロックしない。

import { store } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { showRoundSetupDialog } from './round-setup-dialog.js';
import { getLocalUserId, getNickname } from './local-identity.js';

let lastRenderedRoundRef = null;
let lastRenderedTokensRef = null;
let detailExpanded = false;

function getTokenName(state, tokenId) {
  return state.tokens[tokenId]?.name || '？';
}

function currentPhase(round) {
  return round.template ? round.template[round.phaseIndex] : null;
}

// 直前の遷移に対して点呼/割り込み確認を表示すべきか（進行中のみ意味を持つ。フェーズの
// confirmModeに従う）。
function shouldShowConfirmation(round) {
  const phase = currentPhase(round);
  return phase ? phase.confirmMode === 'confirm' : true;
}

function listBoardTokens(state) {
  return Object.values(state.tokens)
    .filter(t => !t.inBackyard)
    .map(t => ({ id: t.id, name: t.name }));
}

// ルームメニュー（⋮）の「ラウンド進行を開始」から呼ばれる。参加者選択ダイアログを開き、
// 確定するとROUND_PROGRESSION_STARTをdispatchする（これでround.activeがtrueになり、
// このパネル自体が表示される）。
export function openRoundStartDialog() {
  showRoundSetupDialog({
    title: 'ラウンド進行の参加者を選択',
    tokens: listBoardTokens(store.state),
    currentParticipantIds: [],
    onConfirm: ({ participantIds }) => {
      store.dispatch('ROUND_PROGRESSION_START', { participantIds });
    }
  });
}

export function initRoundPanel() {
  const bar = document.getElementById('roundPanelBar');
  const statusEl = document.getElementById('roundPanelStatus');
  const readyListEl = document.getElementById('roundPanelReadyList');
  const readyToggleBtn = document.getElementById('roundPanelReadyToggleBtn');
  const actionBtn = document.getElementById('roundPanelActionBtn');
  const menuBtn = document.getElementById('roundPanelMenuBtn');
  const detailEl = document.getElementById('roundPanelDetail');

  if (!bar || !statusEl || !actionBtn) return;

  function render(state) {
    const round = state.round;

    // 平常時（未進行）はバー・詳細ともに非表示にして邪魔にならないようにする
    bar.style.display = round.active ? '' : 'none';
    if (detailEl && !round.active) detailEl.style.display = 'none';
    if (!round.active) return;

    // --- ステータス行 ---
    const phase = currentPhase(round);
    const turnText = phase?.kind === 'perCharacter' && round.participants.length > 0
      ? `（手番: ${getTokenName(state, round.participants[round.turnIndex])}）`
      : '';
    statusEl.textContent = `ラウンド${round.roundNumber} - ${phase?.label || ''}${turnText}`;

    // --- 点呼チップ ---
    if (readyListEl) {
      readyListEl.innerHTML = '';
      const showConfirmation = shouldShowConfirmation(round);
      readyListEl.style.display = showConfirmation ? '' : 'none';
      if (showConfirmation) {
        if (round.confirmation.readyEntries.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'round-panel-ready-chip round-panel-ready-chip-empty';
          empty.textContent = 'まだ準備OKした人はいません';
          readyListEl.appendChild(empty);
        } else {
          round.confirmation.readyEntries.forEach(entry => {
            const chip = document.createElement('span');
            chip.className = 'round-panel-ready-chip';
            chip.textContent = entry.nickname || '匿名';
            readyListEl.appendChild(chip);
          });
        }
      }
    }

    // --- 準備OKトグル ---
    if (readyToggleBtn) {
      const myId = getLocalUserId();
      const isReady = round.confirmation.readyEntries.some(e => e.userId === myId);
      readyToggleBtn.textContent = isReady ? '準備解除' : '準備OK';
      readyToggleBtn.style.display = shouldShowConfirmation(round) ? '' : 'none';
    }

    // --- 主操作ボタン（ソフトゲート：点呼の状態に関わらず常に押せる） ---
    const isLastParticipant = round.turnIndex >= round.participants.length - 1;
    const isLastStepOfPhase = phase?.kind !== 'perCharacter' || isLastParticipant;
    const isLastPhaseOfTemplate = round.phaseIndex >= (round.template?.length || 1) - 1;
    actionBtn.textContent = (isLastStepOfPhase && isLastPhaseOfTemplate) ? 'ラウンド終了へ' : '次へ進む';

    // --- 詳細（手番順）リスト ---
    if (detailEl) {
      detailEl.style.display = detailExpanded ? '' : 'none';
      detailEl.innerHTML = '';
      if (detailExpanded) {
        if (round.participants.length === 0) {
          const empty = document.createElement('p');
          empty.style.color = '#888';
          empty.style.fontSize = '0.85rem';
          empty.style.margin = '0';
          empty.textContent = '参加者がいません。';
          detailEl.appendChild(empty);
        } else {
          round.participants.forEach((tokenId, idx) => {
            const row = document.createElement('div');
            row.className = 'round-panel-turn-row';
            if (idx === round.turnIndex && phase?.kind === 'perCharacter') {
              row.classList.add('active-turn');
            }
            row.textContent = getTokenName(state, tokenId);
            detailEl.appendChild(row);
          });
        }
      }
    }
  }

  statusEl.style.cursor = 'pointer';
  statusEl.title = 'クリックで手番順の詳細を表示/非表示';
  statusEl.addEventListener('click', () => {
    detailExpanded = !detailExpanded;
    render(store.state);
  });

  actionBtn.addEventListener('click', () => {
    store.dispatch('ROUND_ADVANCE_PHASE', {});
  });

  if (readyToggleBtn) {
    readyToggleBtn.addEventListener('click', () => {
      const round = store.state.round;
      const myId = getLocalUserId();
      const isReady = round.confirmation.readyEntries.some(e => e.userId === myId);
      const nickname = getNickname() || `匿名-${myId.slice(0, 4)}`;
      store.dispatch('ROUND_SET_READY', { userId: myId, nickname, ready: !isReady });
    });
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const rect = menuBtn.getBoundingClientRect();

      showContextMenu(rect.left, rect.bottom + 4, [
        {
          label: '参加者を編集',
          onSelect: () => {
            showRoundSetupDialog({
              title: '参加者を編集',
              tokens: listBoardTokens(store.state),
              currentParticipantIds: store.state.round.participants,
              onConfirm: ({ participantIds }) => {
                store.dispatch('ROUND_SET_PARTICIPANTS', { participantIds });
              }
            });
          }
        },
        {
          label: 'ラウンド進行を終了',
          danger: true,
          onSelect: () => store.dispatch('ROUND_PROGRESSION_END', {})
        }
      ]);
    });
  }

  render(store.state);
  EventBus.subscribe('STATE_CHANGED', (state) => {
    if (state.round === lastRenderedRoundRef && state.tokens === lastRenderedTokensRef) return;
    lastRenderedRoundRef = state.round;
    lastRenderedTokensRef = state.tokens;
    render(state);
  });
}
