// js/round-panel.js
// ラウンド進行の状態バー。進行中（state.round.active）のときだけ表示し、平常時は
// 邪魔にならないよう非表示にする。開始のきっかけ（ラウンド進行を開始）はルームメニュー
// （js/main.jsのroomMenuBtn）側から呼ばれるstartRoundProgression()が担う。
// net-sync.jsと同様にinitRoundPanel()をexportし、main.jsの初期化処理から1回だけ呼ぶ。
// STATE_CHANGEDを自前で購読し、state.round/state.tokens/state.participantsの参照が
// 変わったときだけ再描画する（lastRenderedChatTabsRefと同じ差分チェックパターン）。
// participantsも見るのは、GMの付け外しで進行ボタンの可否が変わるため。
// 点呼(confirmation)はソフトな可視化のみで、進行操作自体はブロックしない。

import { store } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { showRoundSetupDialog } from './round-setup-dialog.js';
import { getLocalUserId, getNickname } from './local-identity.js';
import { canOperateAsGm, GM_ONLY_REASON } from './room-authority.js';

let lastRenderedRoundRef = null;
let lastRenderedTokensRef = null;
let lastRenderedParticipantsRef = null;
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

// ルームメニュー（⋮）の「ラウンド進行を開始」から呼ばれる。参加者を選ぶステップは省き、
// 現在盤面にいる（バックヤードに入っていない）visible!==falseのコマをそのまま参加者にする。
// 手動で参加者を絞りたい場合は開始後、パネルの「⋮」→「参加者を編集」で調整できる。
export function startRoundProgression() {
  // 呼び出し側（ルームメニュー）でも押せないようにしているが、表示が古い場合の保険
  if (!canOperateAsGm()) return;

  const participantIds = Object.values(store.state.tokens)
    .filter(t => !t.inBackyard && t.visible !== false)
    .map(t => t.id);
  store.dispatch('ROUND_PROGRESSION_START', { participantIds });
}

export function initRoundPanel() {
  const bar = document.getElementById('roundPanelBar');
  const statusEl = document.getElementById('roundPanelStatus');
  const readyListEl = document.getElementById('roundPanelReadyList');
  const nicknameLabelEl = document.getElementById('roundPanelNicknameLabel');
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

    // --- 「割り込みなし：（宣言済みのニックネーム,...）」の一覧表示 ---
    const showConfirmation = shouldShowConfirmation(round);
    if (readyListEl) {
      readyListEl.style.display = showConfirmation ? '' : 'none';
      if (showConfirmation) {
        const names = round.confirmation.readyEntries.map(entry => entry.nickname || '匿名');
        readyListEl.textContent = names.length > 0
          ? `割り込みなし：（${names.join('、')}）`
          : '割り込みなし：（まだ誰もいません）';
      }
    }

    // --- 自分のニックネーム表示 ---
    if (nicknameLabelEl) {
      nicknameLabelEl.style.display = showConfirmation ? '' : 'none';
      if (showConfirmation) {
        const myId = getLocalUserId();
        nicknameLabelEl.textContent = `あなた: ${getNickname() || `匿名-${myId.slice(0, 4)}`}`;
      }
    }

    // --- 「割り込みなし」トグル。押すと「割り込みありません」の宣言が表示され、
    // もう一度押すと消える（ROUND_SET_READYのreadyEntriesに自分が載っているかで判定） ---
    if (readyToggleBtn) {
      const myId = getLocalUserId();
      const isReady = round.confirmation.readyEntries.some(e => e.userId === myId);
      readyToggleBtn.textContent = isReady ? '割り込みありません' : '割り込みなし';
      readyToggleBtn.classList.toggle('active', isReady);
      readyToggleBtn.style.display = showConfirmation ? '' : 'none';
    }

    // --- 主操作ボタン（点呼に対してはソフトゲート：割り込み確認の状態では止めない。
    // ただし進行そのものはGM限定にする。誰がGMかはjs/room-authority.js参照） ---
    const isLastParticipant = round.turnIndex >= round.participants.length - 1;
    const isLastStepOfPhase = phase?.kind !== 'perCharacter' || isLastParticipant;
    const isLastPhaseOfTemplate = round.phaseIndex >= (round.template?.length || 1) - 1;
    actionBtn.textContent = (isLastStepOfPhase && isLastPhaseOfTemplate) ? 'ラウンド終了へ' : '次へ進む';

    // 「割り込みなし」の宣言はPL各自の意思表示なので、ここでは止めない（全員が押せる）。
    const canOperate = canOperateAsGm();
    [actionBtn, menuBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = !canOperate;
      btn.title = canOperate ? (btn === menuBtn ? '参加者編集・終了' : '') : GM_ONLY_REASON;
    });

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
    if (!canOperateAsGm()) return;
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
      if (!canOperateAsGm()) return;
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
                if (!canOperateAsGm()) return;
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
    if (state.round === lastRenderedRoundRef
      && state.tokens === lastRenderedTokensRef
      && state.participants === lastRenderedParticipantsRef) return;
    lastRenderedRoundRef = state.round;
    lastRenderedTokensRef = state.tokens;
    lastRenderedParticipantsRef = state.participants;
    render(state);
  });

  // 名乗る人が変わると「進行を操作できるか」が変わる。状態自体は変わらず、上の差分
  // チェックにも引っかからないため、参照キャッシュを捨てて描き直す。
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    lastRenderedRoundRef = null;
    lastRenderedTokensRef = null;
    lastRenderedParticipantsRef = null;
    render(store.state);
  });
}
