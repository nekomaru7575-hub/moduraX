// js/round-panel.js
// ラウンド進行の状態バー。進行中（state.round.active）のときだけ表示し、平常時は
// 邪魔にならないよう非表示にする。開始のきっかけ（ラウンド進行を開始）はルームメニュー
// （js/main.jsのroomMenuBtn）側から呼ばれるstartRoundProgression()が担う。
// net-sync.jsと同様にinitRoundPanel()をexportし、main.jsの初期化処理から1回だけ呼ぶ。
// STATE_CHANGEDを自前で購読し、state.round/state.tokens/state.participantsの参照が
// 変わったときだけ再描画する（lastRenderedChatTabsRefと同じ差分チェックパターン）。
// participantsも見るのは、GMの付け外しで進行ボタンの可否が変わるため。
// 点呼(confirmation)はソフトな可視化のみで、進行操作自体はブロックしない。
// 手番は「行動済み(round.acted)の集合」で表され、詳細リストの各行から行動済みの回復・
// 次の手番への割り込みを操作する（buildTurnRow・js/game-store.jsのpickNextActor参照）。
// kind:'plot'のフェーズでは提出欄（renderPlotSection）が出る。提出は各自が自分のコマに対して
// 行うのでGM限定にせず、一斉公開だけをGM限定の主ボタン（ROUND_ADVANCE_PHASE）が担う。
// 公開前は他人の値を出さないが、状態そのものは全員へ配られている（js/visibility.js冒頭参照）。

import { store } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { showContextMenu } from './context-menu.js';
import { showRoundSetupDialog } from './round-setup-dialog.js';
import { getLocalUserId, getNickname } from './local-identity.js';
import { canOperateAsGm, canOperateToken, GM_ONLY_REASON } from './room-authority.js';
import { listUnactedParticipants, listTiedPlotTokenIds, getEffectiveParameterValue } from './game-store.js';

let lastRenderedRoundRef = null;
let lastRenderedTokensRef = null;
let lastRenderedParticipantsRef = null;
// 行動済みの回復・割り込みの操作はこの詳細リストから行うため、既定で開いておく。
let detailExpanded = true;

function getTokenName(state, tokenId) {
  return state.tokens[tokenId]?.name || '？';
}

function currentPhase(round) {
  return round.template ? round.template[round.phaseIndex] : null;
}

// イニシアチブプロセス中か（perCharacterフェーズのサブステップ。js/game-store.js参照）
function isPreTurnStep(round) {
  return currentPhase(round)?.kind === 'perCharacter' && round.step === 'preTurn';
}

// プロットの段にいるか（kind:'plot'。js/parameters/registry.jsのテンプレート仕様参照）
function isPlotPhase(round) {
  return currentPhase(round)?.kind === 'plot';
}

// このラウンドの手番順がプロット値で決まるか。詳細リストの括弧に何を出すかがこれで変わる。
function usesPlotTurnOrder(round) {
  return (round.template || []).some(phase => phase.kind === 'perCharacter' && phase.turnOrder === 'plot');
}

// 詳細リストの並び：手番中 → 未行動（イニシアチブ降順） → 行動済み。
// 「次に誰が動くか」が上から読めるようにするため、参加者の登録順ではなくこの順で出す。
function listTurnOrderRows(state, round) {
  const unacted = listUnactedParticipants(state.tokens, round);
  const current = round.currentActorId;
  const rows = [];

  if (current && round.participants.includes(current)) rows.push(current);
  unacted.forEach(id => { if (id !== current) rows.push(id); });
  round.participants.forEach(id => { if (!rows.includes(id)) rows.push(id); });

  return rows;
}

// 詳細リストの1行。状態（手番中／行動済み／割り込み予約）の見せ方と、GM向けの
// 操作メニュー（行動済みの回復・次の手番への割り込み）を持つ。
function buildTurnRow(state, round, tokenId, canOperate, tiedIds = []) {
  const row = document.createElement('div');
  row.className = 'round-panel-turn-row';

  const isCurrent = tokenId === round.currentActorId;
  const isActed = (round.acted || []).includes(tokenId);
  const isInterrupt = tokenId === round.interruptId;
  if (isCurrent) row.classList.add('active-turn');
  if (isActed) row.classList.add('acted');
  if (isInterrupt) row.classList.add('interrupt-reserved');

  const token = state.tokens[tokenId];
  const name = getTokenName(state, tokenId);

  // 手番順がプロットで決まるラウンドでは、括弧の中もその根拠＝プロット値にする。
  // 公開前は伏せる（提出済みかどうかだけを●/○で示すのは下の提出状況の行の仕事）。
  let score;
  if (usesPlotTurnOrder(round)) {
    score = round.plotsRevealed ? round.plots?.[tokenId] : undefined;
    if (round.plotsRevealed && tiedIds.includes(tokenId)) row.classList.add('plot-tied');
  } else {
    score = token ? getEffectiveParameterValue(token, 'core:initiative') : undefined;
  }
  row.textContent = `${isInterrupt ? '⏭ ' : ''}${name}${score === undefined ? '' : ` (${score})`}`;

  // 同値であることは並び順からは読み取れないので、理由をツールチップにも書いておく
  const tieNote = row.classList.contains('plot-tied')
    ? '同値です（ルール上は同時処理。並び順は便宜上のもの）。'
    : '';

  // 手番中のコマの「行動済みにする」は「手番を終了」と意味が重なるので操作を出さない
  if (isCurrent) {
    row.title = `${tieNote}手番中です`;
    return row;
  }

  row.classList.add('clickable');
  row.title = tieNote + (canOperate ? 'クリックで行動済み・割り込みを操作' : GM_ONLY_REASON);
  row.addEventListener('click', (event) => {
    showContextMenu(event.clientX, event.clientY, [
      {
        label: isActed ? '行動済みを解除' : '行動済みにする',
        disabled: !canOperate,
        title: canOperate ? undefined : GM_ONLY_REASON,
        onSelect: () => store.dispatch('ROUND_SET_ACTED', { tokenId, acted: !isActed })
      },
      {
        // 行動済みのコマを指定した場合は、リデューサー側で行動済みも解除される
        label: isInterrupt ? '割り込み予約を解除' : '次の手番に割り込ませる',
        disabled: !canOperate,
        title: canOperate ? undefined : GM_ONLY_REASON,
        onSelect: () => store.dispatch('ROUND_SET_INTERRUPT', { tokenId: isInterrupt ? null : tokenId })
      }
    ]);
  });

  return row;
}

function listBoardTokens(state) {
  return Object.values(state.tokens)
    .filter(t => !t.inBackyard)
    .map(t => ({ id: t.id, name: t.name }));
}

// プロットを自分が出せるコマ（持ち主が自分か、持ち主のいないコマ。GMは全部出せる）。
// 判定は盤面のコマ操作と同じ規則（js/room-authority.jsのcanOperateToken）。
function listMyPlotTokenIds(state, round) {
  return round.participants.filter(id => canOperateToken(state.tokens[id]));
}

// 自分のコマ1つ分の提出欄（コマ名 + min〜maxのボタン）。もう一度同じ数字を押すと取り消す。
//
// 光らせる（selectedを付ける）のは自分が出した分だけ。GMは他人のコマも操作できるので、
// 出ている値をそのまま映すとGMの画面に全員のプロットが見えてしまう。他人が出した分は
// 「提出済み」とだけ伝え、GMが代理で出したくなったら数字を押して上書きする
// （押した時点で出したのは自分になり、値が見えるようになる）。
function buildPlotInputRow(state, round, tokenId) {
  const { min = 1, max = 6 } = currentPhase(round).plot || {};
  const row = document.createElement('div');
  row.className = 'round-panel-plot-row';

  const nameEl = document.createElement('span');
  nameEl.className = 'round-panel-plot-name';
  nameEl.textContent = `${getTokenName(state, tokenId)}:`;
  row.appendChild(nameEl);

  const myId = getLocalUserId();
  const submitted = round.plots?.[tokenId];
  const submittedByMe = round.plotSubmitters?.[tokenId] === myId;
  const hasOthersPlot = Number.isFinite(submitted) && !submittedByMe;
  // 公開後は全員に見えてよい。それまでは自分が出した分だけ
  const visibleValue = (round.plotsRevealed || submittedByMe) ? submitted : undefined;

  for (let value = min; value <= max; value += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'round-panel-plot-btn';
    btn.textContent = String(value);
    if (visibleValue === value) btn.classList.add('selected');
    // 公開後は出し直せない（リデューサー側でも弾いている）
    btn.disabled = round.plotsRevealed;
    btn.title = round.plotsRevealed ? '公開済みです'
      : visibleValue === value ? 'もう一度押すと取り消します'
      : hasOthersPlot ? `代理で${value}を出す（提出済みの値を上書きします）`
      : `${value}を出す`;
    btn.addEventListener('click', () => {
      store.dispatch('ROUND_SET_PLOT', {
        tokenId,
        value: visibleValue === value ? null : value,
        userId: myId
      });
    });
    row.appendChild(btn);
  }

  // 他人が出した分は値を出さずに、提出済みであることだけ添える
  if (hasOthersPlot && !round.plotsRevealed) {
    const note = document.createElement('span');
    note.className = 'round-panel-plot-note';
    note.textContent = '提出済み';
    note.title = '他の人が出しています（値は公開まで見えません）';
    row.appendChild(note);
  }

  return row;
}

// 提出状況の1行。公開前は誰が出し終えたかだけ（●/○）、公開後は値を出す。
function describePlotStatus(state, round) {
  const entries = round.participants.map(id => {
    const name = getTokenName(state, id);
    const value = round.plots?.[id];
    if (round.plotsRevealed) return `${name}: ${Number.isFinite(value) ? value : '未提出'}`;
    return `${Number.isFinite(value) ? '●' : '○'}${name}`;
  });

  if (entries.length === 0) return '参加者がいません。';
  return round.plotsRevealed
    ? `公開: ${entries.join('、')}`
    : `提出状況: ${entries.join('、')}`;
}

// プロットの段の欄をまるごと組み直す。plotフェーズ以外では隠す。
function renderPlotSection(plotEl, state, round) {
  if (!plotEl) return;

  if (!isPlotPhase(round)) {
    plotEl.style.display = 'none';
    plotEl.innerHTML = '';
    return;
  }

  plotEl.style.display = '';
  plotEl.innerHTML = '';

  listMyPlotTokenIds(state, round).forEach(tokenId => {
    plotEl.appendChild(buildPlotInputRow(state, round, tokenId));
  });

  const statusEl = document.createElement('div');
  statusEl.className = 'round-panel-plot-status';
  statusEl.textContent = describePlotStatus(state, round);
  plotEl.appendChild(statusEl);
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
  const plotEl = document.getElementById('roundPanelPlot');

  if (!bar || !statusEl || !actionBtn) return;

  function render(state) {
    const round = state.round;

    // 平常時（未進行）はバー・詳細ともに非表示にして邪魔にならないようにする
    bar.style.display = round.active ? '' : 'none';
    if (detailEl && !round.active) detailEl.style.display = 'none';
    if (plotEl && !round.active) plotEl.style.display = 'none';
    if (!round.active) return;

    // --- ステータス行 ---
    const phase = currentPhase(round);
    const turnText = isPreTurnStep(round)
      ? `／${phase.preTurnStep?.label || 'イニシアチブプロセス'}`
      : (phase?.kind === 'perCharacter' && round.currentActorId)
        ? `（手番: ${getTokenName(state, round.currentActorId)}）`
        : '';
    // 割り込み予約は「次に誰が動くか」が変わる重要な状態なので、手番と並べて常に出す
    const interruptText = round.interruptId
      ? ` ⏭ 次: ${getTokenName(state, round.interruptId)}`
      : '';
    statusEl.textContent = `ラウンド${round.roundNumber} - ${phase?.label || ''}${turnText}${interruptText}`;

    // --- 「割り込みなし」まわり（一覧・自分のニックネーム・トグル）---
    // 割り込みは「フェーズが割り込み確認中かどうか」に関係なく宣言したくなるものなので、
    // 進行中（round.active）なら常に出す。フェーズのconfirmModeでは出し分けない。
    if (readyListEl) {
      readyListEl.style.display = '';
      const names = round.confirmation.readyEntries.map(entry => entry.nickname || '匿名');
      readyListEl.textContent = names.length > 0
        ? `割り込みなし：（${names.join('、')}）`
        : '割り込みなし：（まだ誰もいません）';
    }

    // --- 自分のニックネーム表示 ---
    if (nicknameLabelEl) {
      nicknameLabelEl.style.display = '';
      const myId = getLocalUserId();
      nicknameLabelEl.textContent = `あなた: ${getNickname() || `匿名-${myId.slice(0, 4)}`}`;
    }

    // --- 「割り込みなし」トグル。押すと「割り込みありません」の宣言が表示され、
    // もう一度押すと消える（ROUND_SET_READYのreadyEntriesに自分が載っているかで判定） ---
    if (readyToggleBtn) {
      const myId = getLocalUserId();
      const isReady = round.confirmation.readyEntries.some(e => e.userId === myId);
      readyToggleBtn.textContent = isReady ? '割り込みありません' : '割り込みなし';
      readyToggleBtn.classList.toggle('active', isReady);
      readyToggleBtn.style.display = '';
    }

    // --- 主操作ボタン（点呼に対してはソフトゲート：割り込み確認の状態では止めない。
    // ただし進行そのものはGM限定にする。誰がGMかはjs/room-authority.js参照） ---
    // このフェーズにまだ手番が残っているか＝「自分以外の未行動者」か割り込み予約があるか
    const remainingAfterCurrent = listUnactedParticipants(state.tokens, round)
      .filter(id => id !== round.currentActorId);
    // 未公開のプロットの段は、押しても次のフェーズへは進まず「公開する」で1回止まる
    const isUnrevealedPlot = isPlotPhase(round) && !round.plotsRevealed;
    const isLastStepOfPhase = !isUnrevealedPlot
      && (phase?.kind !== 'perCharacter'
        || (remainingAfterCurrent.length === 0 && !round.interruptId));
    const isLastPhaseOfTemplate = round.phaseIndex >= (round.template?.length || 1) - 1;

    actionBtn.textContent = isUnrevealedPlot ? 'プロットを公開'
      : (isLastStepOfPhase && isLastPhaseOfTemplate) ? 'ラウンド終了へ'
      : isPreTurnStep(round) ? '手番を開始'
      : phase?.kind === 'perCharacter' ? '手番を終了'
      : '次へ進む';

    // 「割り込みなし」の宣言はPL各自の意思表示なので、ここでは止めない（全員が押せる）。
    const canOperate = canOperateAsGm();
    [actionBtn, menuBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = !canOperate;
      btn.title = canOperate ? (btn === menuBtn ? '参加者編集・終了' : '') : GM_ONLY_REASON;
    });

    // --- プロットの提出欄（kind:'plot'のフェーズのときだけ出る） ---
    renderPlotSection(plotEl, state, round);

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
          const tiedIds = listTiedPlotTokenIds(round);
          listTurnOrderRows(state, round).forEach(tokenId => {
            detailEl.appendChild(buildTurnRow(state, round, tokenId, canOperate, tiedIds));
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
