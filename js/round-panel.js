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
import {
  listUnactedParticipants, listTiedPlotSlotKeys, getEffectiveParameterValue,
  listPlotSlots, resolvedPlotSlot, listPlotSlotRows,
  plotSlotKey, describePlotSlotName, generatePlotSlotId
} from './game-store.js';

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
//
// プロットを増やしているコマ（分身の術など）は、まだどれで動くか選ばれていない間だけ
// 枠の数だけ行に増える。増えた行はそれぞれの値の位置に並ぶので、盤面上で複数のプロットに
// 出ている様子がそのまま読める。
// 【まとまりは崩さない】展開して値の降順に並べ直すのは「手番中／未行動／行動済み」の
// まとまりの中だけ。全体を値順にすると行動済みのコマが上に戻ってきてしまう。
// 【公開前は展開しない】値を伏せている間に位置へ並べると、順序から大小が読めてしまう。
// 増えていること自体は提出欄と提出状況の行で全員に見えている。
//
// @returns {Array<{tokenId, slotId, key, name, value, unchosen}>}
function listTurnOrderRows(state, round) {
  const unacted = listUnactedParticipants(state.tokens, round);
  const current = round.currentActorId;
  const tokenIds = [];

  if (current && round.participants.includes(current)) tokenIds.push(current);
  unacted.forEach(id => { if (id !== current) tokenIds.push(id); });
  round.participants.forEach(id => { if (!tokenIds.includes(id)) tokenIds.push(id); });

  if (!usesPlotTurnOrder(round) || !round.plotsRevealed) {
    return tokenIds.map(tokenId => ({
      tokenId, slotId: 'main', key: plotSlotKey(tokenId, 'main'),
      name: getTokenName(state, tokenId), value: undefined, unchosen: false
    }));
  }

  const groups = [[], [], []]; // 手番中 / 未行動 / 行動済み
  tokenIds.forEach(id => {
    groups[id === current ? 0 : unacted.includes(id) ? 1 : 2].push(id);
  });
  return groups.flatMap(ids => listPlotSlotRows(state.tokens, round, ids));
}

// 詳細リストの1行。状態（手番中／行動済み／割り込み予約）の見せ方と、GM向けの
// 操作メニュー（行動済みの回復・次の手番への割り込み）を持つ。
//
// 1体のコマが複数のプロットに出ている場合はこれが複数回呼ばれるが、状態のクラスも操作
// メニューも同じコマのものを全部の行に付ける。同一のコマなのだから、どの行を押しても
// 同じ操作になるほうが迷わない（手番自体は1回しか回ってこない）。
function buildTurnRow(state, round, turnRow, canOperate, tiedKeys = []) {
  const { tokenId, key, name, unchosen } = turnRow;
  const row = document.createElement('div');
  row.className = 'round-panel-turn-row';

  const isCurrent = tokenId === round.currentActorId;
  const isActed = (round.acted || []).includes(tokenId);
  const isInterrupt = tokenId === round.interruptId;
  if (isCurrent) row.classList.add('active-turn');
  if (isActed) row.classList.add('acted');
  if (isInterrupt) row.classList.add('interrupt-reserved');

  const token = state.tokens[tokenId];

  // 手番順がプロットで決まるラウンドでは、括弧の中もその根拠＝プロット値にする。
  // 公開前は伏せる（提出済みかどうかだけを●/○で示すのは下の提出状況の行の仕事）。
  let score;
  if (usesPlotTurnOrder(round)) {
    score = round.plotsRevealed ? turnRow.value : undefined;
    if (round.plotsRevealed && tiedKeys.includes(key)) row.classList.add('plot-tied');
    // まだどのプロットで動くか選ばれていない行。手番順もコストの上限もこれ待ちなので、
    // 確定した行と同じ濃さで出さない。
    if (unchosen) row.classList.add('plot-unchosen');
  } else {
    score = token ? getEffectiveParameterValue(token, 'core:initiative') : undefined;
  }
  row.textContent = `${isInterrupt ? '⏭ ' : ''}${name}${score === undefined ? '' : ` (${score})`}`;

  // 同値であることは並び順からは読み取れないので、理由をツールチップにも書いておく
  const tieNote = row.classList.contains('plot-tied')
    ? '同値です（ルール上は同時処理。並び順は便宜上のもの）。'
    : '';
  const unchosenNote = unchosen
    ? '複数のプロットに出ています。どれで動くかを所有者が選ぶまで、手番順は仮のもので、'
      + '忍法コストの上限も掛かりません。'
    : '';

  // 手番中のコマの「行動済みにする」は「手番を終了」と意味が重なるので操作を出さない
  if (isCurrent) {
    row.title = `${tieNote}${unchosenNote}手番中です`;
    return row;
  }

  row.classList.add('clickable');
  row.title = tieNote + unchosenNote
    + (canOperate ? 'クリックで行動済み・割り込みを操作' : GM_ONLY_REASON);
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

// プロットの枠1つ分の提出欄（名前 + min〜maxのボタン）。もう一度同じ数字を押すと取り消す。
//
// 光らせる（selectedを付ける）のは自分が出した分だけ。GMは他人のコマも操作できるので、
// 出ている値をそのまま映すとGMの画面に全員のプロットが見えてしまう。他人が出した分は
// 「提出済み」とだけ伝え、GMが代理で出したくなったら数字を押して上書きする
// （押した時点で出したのは自分になり、値が見えるようになる）。
//
// 増やした枠（slotIndex >= 1）には名前の入力欄と「削除」が付く。
// 【名前は伏せない】プロットが増える原因は卓に公開される情報なので、名前も「増えている
// こと」も全員に見せてよい。伏せるのは出した数字だけ。
function buildPlotSlotRow(state, round, tokenId, slot, slotIndex) {
  const { min = 1, max = 6 } = currentPhase(round).plot || {};
  const row = document.createElement('div');
  row.className = 'round-panel-plot-row';

  const isExtra = slotIndex > 0;
  const myId = getLocalUserId();
  const submittedByMe = slot.submitter === myId;
  const hasOthersPlot = Number.isFinite(slot.value) && !submittedByMe;
  // 公開後は全員に見えてよい。それまでは自分が出した分だけ
  const visibleValue = (round.plotsRevealed || submittedByMe) ? slot.value : undefined;

  const nameEl = document.createElement('span');
  nameEl.className = 'round-panel-plot-name';
  nameEl.textContent = isExtra ? `${getTokenName(state, tokenId)}（` : `${getTokenName(state, tokenId)}:`;
  row.appendChild(nameEl);

  if (isExtra) {
    // 名前は打ち終わり（change）でだけ送る。1文字ごとに送ると、同期のたびに再描画されて
    // 入力欄からフォーカスが外れる。
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'round-panel-plot-label-input';
    labelInput.value = slot.label || '';
    labelInput.placeholder = `${slotIndex + 1}つ目`;
    labelInput.maxLength = 20;
    labelInput.title = 'この選択の名前（例: 影法師）。全員に見えます。';
    labelInput.addEventListener('change', () => {
      store.dispatch('ROUND_SET_PLOT_SLOT_LABEL', { tokenId, slotId: slot.slotId, label: labelInput.value });
    });
    row.appendChild(labelInput);

    const closeEl = document.createElement('span');
    closeEl.className = 'round-panel-plot-name';
    closeEl.textContent = '）:';
    row.appendChild(closeEl);
  }

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
        slotId: slot.slotId,
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

  // 増やした枠を取り消す。公開後は出せない（後出しになるのでリデューサー側でも弾いている）
  if (isExtra && !round.plotsRevealed) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'round-panel-plot-remove-btn';
    removeBtn.textContent = '削除';
    removeBtn.title = 'この選択を取り消す';
    removeBtn.addEventListener('click', () => {
      store.dispatch('ROUND_REMOVE_PLOT_SLOT', { tokenId, slotId: slot.slotId });
    });
    row.appendChild(removeBtn);
  }

  return row;
}

// 自分のコマ1つ分の提出欄。枠が増えていれば枠の数だけ行になり、最後の行に「選択を増やす」が付く。
function buildPlotInputRows(state, round, tokenId) {
  const slots = listPlotSlots(round, tokenId);
  const rows = slots.map((slot, index) => buildPlotSlotRow(state, round, tokenId, slot, index));

  // 公開後に増やすのは後出しなので出さない
  if (!round.plotsRevealed) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'round-panel-plot-add-btn';
    addBtn.textContent = '選択を増やす';
    addBtn.title = '同じコマのプロット選択を1つ増やす（分身の術など）。増えたことは全員に見えます。';
    addBtn.addEventListener('click', () => {
      // 【idはここで作る】リデューサーの中で採番するとサーバーと食い違う
      // （js/game-store.jsのgeneratePlotSlotId）。
      store.dispatch('ROUND_ADD_PLOT_SLOT', { tokenId, slotId: generatePlotSlotId(), label: '' });
    });
    rows[rows.length - 1].appendChild(addBtn);
  }

  return rows;
}

// 複数のプロットに出ているコマの「結局どれで動くか」を持ち主が決める行。公開後にだけ出す。
// 選ぶまでは手番順が仮のままで、忍法コストの上限も掛からない（js/game-store.jsの
// buildDerivedContext）ので、その理由も添える。
function buildPlotChoiceRow(state, round, tokenId) {
  const row = document.createElement('div');
  row.className = 'round-panel-plot-row round-panel-plot-choice';

  const slots = listPlotSlots(round, tokenId);
  const chosen = resolvedPlotSlot(round, tokenId);
  const tokenName = getTokenName(state, tokenId);

  const nameEl = document.createElement('span');
  nameEl.className = 'round-panel-plot-name';
  nameEl.textContent = `${tokenName}はどれで動く？:`;
  row.appendChild(nameEl);

  slots.forEach((slot, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'round-panel-plot-choice-btn';
    const value = Number.isFinite(slot.value) ? slot.value : '未提出';
    btn.textContent = `${describePlotSlotName(tokenName, slot, index)} (${value})`;
    const isChosen = chosen?.slotId === slot.slotId;
    if (isChosen) btn.classList.add('selected');
    btn.title = isChosen ? 'もう一度押すと選択を取り消します' : 'このプロットで動く';
    btn.addEventListener('click', () => {
      store.dispatch('ROUND_SET_PLOT_CHOICE', { tokenId, slotId: isChosen ? null : slot.slotId });
    });
    row.appendChild(btn);
  });

  if (!chosen) {
    const note = document.createElement('span');
    note.className = 'round-panel-plot-note';
    note.textContent = '未選択';
    note.title = '選ぶまで手番順は仮のもので、忍法コストの上限も掛かりません。';
    row.appendChild(note);
  }

  return row;
}

// 提出状況の1行。公開前は誰が出し終えたかだけ（●/○）、公開後は値を出す。
// プロットを増やしているコマは枠の数だけ●/○が並ぶので、増えていることが全員に伝わる。
function describePlotStatus(state, round) {
  const entries = round.participants.map(id => {
    const name = getTokenName(state, id);
    const slots = listPlotSlots(round, id);

    if (!round.plotsRevealed) {
      return `${slots.map(slot => (Number.isFinite(slot.value) ? '●' : '○')).join('')}${name}`;
    }

    const chosen = resolvedPlotSlot(round, id);
    if (chosen) {
      return `${name}: ${Number.isFinite(chosen.value) ? chosen.value : '未提出'}`;
    }
    // まだどれで動くか選ばれていないコマは、出ている全部の値を並べる
    const values = slots.map(slot => (Number.isFinite(slot.value) ? slot.value : '未提出')).join('/');
    return `${name}: ${values}（未選択）`;
  });

  if (entries.length === 0) return '参加者がいません。';
  return round.plotsRevealed
    ? `公開: ${entries.join('、')}`
    : `提出状況: ${entries.join('、')}`;
}

// プロットの段の欄をまるごと組み直す。
//
// 提出欄はplotフェーズの間だけだが、「どれで動くか」の選択欄はフェーズを抜けても残す。
// GMは選択を待たずに手番のフェーズへ進められる決まりなので、plotフェーズでしか出さないと
// 選ぶ前に進まれた人が選べなくなる。
function renderPlotSection(plotEl, state, round) {
  if (!plotEl) return;

  const inPlotPhase = isPlotPhase(round);
  const myTokenIds = listMyPlotTokenIds(state, round);
  // 選択欄を出すコマ（公開後・複数のプロットに出ている・自分が操作できる）。
  // 選び終えた後も出しておく（選び直せる。手番順の根拠がどれかもここで読める）。
  const choiceTokenIds = round.plotsRevealed
    ? myTokenIds.filter(id => listPlotSlots(round, id).length > 1)
    : [];

  if (!inPlotPhase && choiceTokenIds.length === 0) {
    plotEl.style.display = 'none';
    plotEl.innerHTML = '';
    return;
  }

  plotEl.style.display = '';
  plotEl.innerHTML = '';

  if (inPlotPhase) {
    myTokenIds.forEach(tokenId => {
      buildPlotInputRows(state, round, tokenId).forEach(row => plotEl.appendChild(row));
    });
  }

  choiceTokenIds.forEach(tokenId => {
    plotEl.appendChild(buildPlotChoiceRow(state, round, tokenId));
  });

  if (inPlotPhase) {
    const statusEl = document.createElement('div');
    statusEl.className = 'round-panel-plot-status';
    statusEl.textContent = describePlotStatus(state, round);
    plotEl.appendChild(statusEl);
  }
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
          const tiedKeys = listTiedPlotSlotKeys(round);
          listTurnOrderRows(state, round).forEach(turnRow => {
            detailEl.appendChild(buildTurnRow(state, round, turnRow, canOperate, tiedKeys));
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
