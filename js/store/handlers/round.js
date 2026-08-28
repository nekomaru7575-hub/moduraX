// js/store/handlers/round.js
// ラウンド進行（Core機能）。開始・フェーズ送り・手番・プロット・終了。
//
// 進行操作（開始/進行/終了/参加者変更/行動済みの回復/割り込み）はGM限定
// （js/room-authority.js・server/index.js の GM_ONLY_ACTIONS）。
// 点呼(confirmation)はPL各自の意思表示なのでソフトな可視化のみで、進行操作は止めない。

import { getRoundPhaseTemplate } from '../../parameters/registry.js';
import { applyPhaseEnd, resetPluginComponentsForPhase } from '../buffs.js';
import { withSystemLog } from '../chat.js';
import { usesInitiativeProcess, withDerivedRoomParameters } from '../room.js';
import {
  applyRoundPhaseStart, createInitialRoundState, hasUnchosenPlot, initialStepForPhase,
  joinTokenNames, listPlotSlotRows, listTiedPlotTokenIds, normalizePlotSlotLabel, pickNextActor,
  recomputeDerivedForRound, sortByInitiative, sortForTurnOrder
} from '../round-state.js';

export const ROUND_HANDLERS = {
  // --- ラウンド進行（Core機能）。詳細はcreateInitialRoundState()のコメント参照。
  // 進行操作（開始/進行/終了/参加者変更/行動済みの回復/割り込み）はGM限定
  // （js/room-authority.js・server/index.jsのGM_ONLY_ACTIONS）。点呼(confirmation)は
  // PL各自の意思表示なのでソフトな可視化のみで、進行操作自体をブロックしない。 ---
  ROUND_PROGRESSION_START({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { participantIds = [] } = payload;
    if (prevState.round.active) return;

    const template = getRoundPhaseTemplate(activePlugin);
    const participants = sortByInitiative(nextTokensState, participantIds);

    const firstPhase = template[0];
    const step = initialStepForPhase(firstPhase, usesInitiativeProcess(prevState));
    // 先頭がいきなりキャラクター行動フェーズのテンプレートもありうるので、その場合は
    // ここで最初の手番を決めておく（'preTurn'から始まるなら手番はまだ決めない）。
    const currentActorId = (firstPhase.kind === 'perCharacter' && step === 'act')
      ? (sortByInitiative(nextTokensState, participants)[0] || null)
      : null;

    const participantNames = joinTokenNames(nextTokensState, participants);
    const logText = participants.length > 0
      ? `ラウンド進行を開始しました（参加者: ${participantNames}）。ラウンド1 - ${firstPhase.label}開始。`
      : `ラウンド進行を開始しました。ラウンド1 - ${firstPhase.label}開始。`;

    const startedRound = {
      ...createInitialRoundState(),
      active: true,
      template,
      roundNumber: 1,
      phaseIndex: 0,
      participants,
      step,
      currentActorId
    };

    // ラウンド1の先頭フェーズにも、以降のラウンドと同じ手当てを入れる
    // （ドラクルージュの喝采点+1はラウンド1から走る）。ROUND_ADVANCE_PHASE側と対。
    const startPhaseLog = applyRoundPhaseStart(nextTokensState, activePlugin, firstPhase, startedRound);

    // 戦闘が始まった時点でも自動計算を引き直す。プロットの公開・ラウンドの終了と同じで、
    // コマ自体は触っていないのに計算の前提（roundActive・ラウンド番号）が変わるため。
    // ここを飛ばすと、シノビガミの「ラウンド」が0のまま＝ラウンド1のプロット公開前に
    // 使った忍法のコストが数えられず、戦闘中だけ出すパラメータ（roundOnly）の表示も
    // 次に何かが動くまで切り替わらない。
    recomputeDerivedForRound(nextTokensState, activePlugin, startedRound);

    commit({
      tokens: nextTokensState,
      round: startedRound,
      // ルーム変数「現在のラウンド」を追随させる（進行中でなければ0）。
      // 以下ROUND_ADVANCE_PHASE・ROUND_PROGRESSION_ENDも対。
      room: withDerivedRoomParameters(prevState.room, prevState.stampCounts, startedRound),
      chatLogs: withSystemLog(
        prevState.chatLogs,
        [logText, startPhaseLog].filter(Boolean).join('\n'),
        payload?.time
      )
    });
  },

  ROUND_SET_PARTICIPANTS({ prevState, payload, nextTokensState, commit }) {
    const { participantIds = [] } = payload;
    const round = prevState.round;

    const participants = sortByInitiative(nextTokensState, participantIds);

    // 参加者から外れたコマの痕跡（行動済み・手番・割り込み予約）を掃除する。
    // 手番中のコマが外された場合はcurrentActorIdをnullにし、次の「次へ進む」で
    // pickNextActorに選び直させる。
    const acted = (round.acted || []).filter(id => participants.includes(id));
    const withdrawn = (round.withdrawn || []).filter(id => participants.includes(id));
    const currentActorId = participants.includes(round.currentActorId) ? round.currentActorId : null;
    const interruptId = participants.includes(round.interruptId) ? round.interruptId : null;
    const keepParticipant = ([id]) => participants.includes(id);
    const plots = Object.fromEntries(Object.entries(round.plots || {}).filter(keepParticipant));
    const plotSubmitters = Object.fromEntries(
      Object.entries(round.plotSubmitters || {}).filter(keepParticipant)
    );
    const plotExtras = Object.fromEntries(Object.entries(round.plotExtras || {}).filter(keepParticipant));
    const plotChoice = Object.fromEntries(Object.entries(round.plotChoice || {}).filter(keepParticipant));

    const participantNames = joinTokenNames(nextTokensState, participants) || '（なし）';

    commit({
      round: {
        ...round, participants, acted, withdrawn, currentActorId, interruptId,
        plots, plotSubmitters, plotExtras, plotChoice
      },
      chatLogs: withSystemLog(prevState.chatLogs, `参加者を更新しました（現在: ${participantNames}）。`, payload?.time)
    });
  },

  ROUND_ADVANCE_PHASE({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const round = prevState.round;
    if (!round.active) return;

    const useInitiativeProcess = usesInitiativeProcess(prevState);

    let tokensForRound = nextTokensState;
    let phaseIndex = round.phaseIndex;
    let roundNumber = round.roundNumber;
    let acted = round.acted || [];
    let currentActorId = round.currentActorId;
    let step = round.step || 'act';
    let interruptId = round.interruptId;
    let plots = round.plots || {};
    let plotSubmitters = round.plotSubmitters || {};
    let plotExtras = round.plotExtras || {};
    let plotChoice = round.plotChoice || {};
    let plotsRevealed = round.plotsRevealed || false;
    const logParts = [];

    const currentPhase = round.template[phaseIndex];
    const nameOf = (id) => tokensForRound[id]?.name || '？';

    // このフェーズ内でまだやることが残っているかを先に決める。残っていなければ
    // 下のフェーズ完了処理へ落ちる（once種別のフェーズは常に完了扱い）。
    let phaseCompleted = false;

    if (currentPhase.kind === 'plot' && !plotsRevealed) {
      // 一斉公開。ここが「主ボタンを1回押すと公開して止まる」の実体で、次の一押しで
      // 下のphaseCompletedへ落ちて手番のフェーズへ進む。
      plotsRevealed = true;

      // 公開されて初めて値をログに残す（提出のたびに出すと伏せている意味が無くなる）。
      // 並べ替えにはplotsRevealed:trueを渡す。sortForTurnOrderは公開前だと従来の並びへ
      // 落とすので、ここでroundをそのまま渡すと手番順にならない。
      const revealedRound = { ...round, plots, plotExtras, plotChoice, plotsRevealed: true };
      const tokenOrder = sortForTurnOrder(tokensForRound, revealedRound, round.participants);
      // 増やした枠は別の行として、それぞれの値の位置に並べる（画面の詳細リストと同じ展開）。
      const revealed = listPlotSlotRows(tokensForRound, revealedRound, tokenOrder)
        .map(row => `${row.name}: ${Number.isFinite(row.value) ? row.value : '未提出'}`);
      logParts.push(`${currentPhase.label}公開。${revealed.join('、')}`);

      // 複数のプロットに出ているコマは、どれで動くかがまだ決まっていない。手番順もコストの
      // 上限もそれ待ちなので、卓に知らせておく（選んだこと自体は通知しない）。
      const unchosen = tokenOrder.filter(id => hasUnchosenPlot(revealedRound, id));
      if (unchosen.length > 0) {
        logParts.push(
          `複数のプロットに出ているコマ: ${joinTokenNames(tokensForRound, unchosen)}`
          + `（どれで動くかは所有者が選びます）`
        );
      }

      // 同値も手番順（＝便宜上の順番）で並べる。提出順のままだと画面の並びと食い違う。
      const tied = sortForTurnOrder(tokensForRound, revealedRound, listTiedPlotTokenIds(revealedRound));
      if (tied.length > 0) {
        // ルール上は同時処理。手番自体は便宜上の順番（sortForTurnOrder参照）で回すので、
        // 「同時である」ことは卓が知っている必要がある。
        logParts.push(`同値: ${joinTokenNames(tokensForRound, tied)}（ルール上は同時処理です）`);
      }
    } else if (currentPhase.kind === 'perCharacter' && step === 'preTurn') {
      // イニシアチブプロセスを終える。ここで初めて次の行動者を確定させるので、
      // この段の最中に行動値が変わっていれば新しい順序で選ばれる。
      const actor = pickNextActor(tokensForRound, { ...round, acted });
      if (actor) {
        currentActorId = actor;
        interruptId = null; // 割り込み指定は手番が決まった時点で消費する
        step = 'act';
        logParts.push(`${currentPhase.preTurnStep?.label || 'イニシアチブプロセス'}終了。${nameOf(actor)}の手番です。`);
      } else {
        phaseCompleted = true; // 未行動者がいない（参加者が外された等）
      }
    } else if (currentPhase.kind === 'perCharacter') {
      // 手番を終える。行動済みに加えたうえで、まだ手番が残っていれば次へ送る。
      if (currentActorId && !acted.includes(currentActorId)) acted = [...acted, currentActorId];

      const nextActor = pickNextActor(tokensForRound, { ...round, acted, interruptId });
      if (!nextActor) {
        phaseCompleted = true;
      } else if (useInitiativeProcess && currentPhase.preTurnStep) {
        // 次の行動者はイニシアチブプロセスを抜ける時に決め直すので、ここでは確定させない
        step = 'preTurn';
        currentActorId = null;
        logParts.push(`${currentPhase.preTurnStep.label}を行います。`);
      } else {
        currentActorId = nextActor;
        interruptId = null;
        logParts.push(`${currentPhase.label}: ${nameOf(nextActor)}の手番です。`);
      }
    } else {
      phaseCompleted = true;
    }

    if (phaseCompleted) {
      // 現在のフェーズを完了させ、次のフェーズへ（テンプレート末尾ならラウンドを繰り上げる）
      if (currentPhase.expirePhaseOnComplete) {
        const { tokens, logText } = applyPhaseEnd(tokensForRound, activePlugin, currentPhase.expirePhaseOnComplete);
        tokensForRound = tokens;
        logParts.push(logText);
      }

      let nextPhaseIndex = phaseIndex + 1;
      if (nextPhaseIndex >= round.template.length) {
        nextPhaseIndex = 0;
        roundNumber += 1;
      }
      phaseIndex = nextPhaseIndex;

      // 行動済み・手番・割り込み予約はフェーズを抜けるときに畳む
      acted = [];
      currentActorId = null;
      interruptId = null;

      // 参加者0人でperCharacterフェーズに入ってしまう場合は手番の主がいないので、
      // もう一段先（同じ規則で完了扱い）へ進める防御処理
      if (round.template[phaseIndex].kind === 'perCharacter' && round.participants.length === 0) {
        nextPhaseIndex = phaseIndex + 1;
        if (nextPhaseIndex >= round.template.length) {
          nextPhaseIndex = 0;
          roundNumber += 1;
        }
        phaseIndex = nextPhaseIndex;
      }

      const newPhase = round.template[phaseIndex];

      // 段に入るときのプラグイン固有の手当て（ドラクルージュの喝采点+1・抗う力=2）。
      // 【手番を決める前に済ませる】ここで動かした値が手番順に効くシステムもありうるので、
      // pickNextActorより先に反映させる。知らせは下の「ラウンドN - ○○開始。」の後に足す。
      const startPhaseLog = applyRoundPhaseStart(
        tokensForRound, activePlugin, newPhase, { ...round, roundNumber }
      );

      step = initialStepForPhase(newPhase, useInitiativeProcess);
      if (newPhase.kind === 'perCharacter' && step === 'act') {
        currentActorId = pickNextActor(
          tokensForRound,
          { ...round, plots, plotExtras, plotChoice, acted: [], interruptId: null }
        );
      }

      // プロットはラウンドごとに引き直すので、その段に入るところで捨てる。
      // 手番のフェーズの間は公開済みの値を残しておく（手番順の根拠であり、
      // 画面にも出しているため）。
      if (newPhase.kind === 'plot') {
        plots = {};
        plotSubmitters = {};
        // 増やした枠も一緒に捨てる。プロットが増えるのはその効果を使ったラウンドだけなので、
        // 残しておくと次のラウンドで使っていない分身が並ぶ。
        plotExtras = {};
        plotChoice = {};
        plotsRevealed = false;
      }

      const turnLabel = currentActorId ? `（手番: ${nameOf(currentActorId)}）`
        : step === 'preTurn' ? `（${newPhase.preTurnStep.label}）`
        : '';
      logParts.push(`ラウンド${roundNumber} - ${newPhase.label}開始${turnLabel}。`);
      if (startPhaseLog) logParts.push(startPhaseLog);
    }

    const nextRound = {
      ...round,
      phaseIndex,
      roundNumber,
      acted,
      currentActorId,
      step,
      interruptId,
      plots,
      plotSubmitters,
      plotExtras,
      plotChoice,
      plotsRevealed
    };

    // プロットの公開・ラウンドの繰り上がりで自動計算の前提が変わる（シノビガミの
    // ファンブル値）。コマ自体は触っていないので、ここから明示的に引き直す。
    // tokensForRoundはapplyPhaseEndが返した新しいオブジェクトか、作業用コピーのまま。
    tokensForRound = { ...tokensForRound };
    recomputeDerivedForRound(tokensForRound, activePlugin, nextRound);

    commit({
      tokens: tokensForRound,
      round: {
        ...nextRound
        // confirmationは手番/フェーズが進んでも維持する（「割り込みなし」の宣言は
        // 各自が明示的にトグルするまで持続する。手番ごとの自動リセットはしない）
      },
      room: withDerivedRoomParameters(prevState.room, prevState.stampCounts, nextRound),
      chatLogs: withSystemLog(prevState.chatLogs, logParts.join('\n'), payload?.time)
    });
  },

  // 行動済みの付け外し。actedをfalseにするのが「行動済みを回復する」操作で、
  // そのコマは以降の手番決定（pickNextActor）にまた現れるようになる。
  // 現在手番のコマは対象にしない（「次へ進む」と意味が重なるため、UI側でも出さない）。
  ROUND_SET_ACTED({ prevState, payload, nextTokensState, commit }) {
    const { tokenId, acted } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;

    const current = round.acted || [];
    const isActed = current.includes(tokenId);
    if (isActed === !!acted) return; // 変化なし

    const nextActed = acted ? [...current, tokenId] : current.filter(id => id !== tokenId);
    const name = nextTokensState[tokenId]?.name || '？';

    commit({
      round: { ...round, acted: nextActed },
      chatLogs: withSystemLog(
        prevState.chatLogs,
        acted ? `${name}を行動済みにしました。` : `${name}の行動済みを解除しました。`,
        payload?.time
      )
    });
  },

  // 戦闘離脱の付け外し。離脱させると以降の手番決定（pickNextActor）・プロット提出対象から
  // 外れる（listUnactedParticipants・js/round-panel.jsのlistMyPlotTokenIdsが見る）。
  // 復帰時は必ず未行動へ戻す（actedからも外す。「もう一度離脱すると行動済みのまま」という
  // 分かりにくい状態を避けるため）。割り込み予約中のコマを離脱させた場合は予約も一緒に外す
  // （離脱者が次の手番へ割り込むのは筋が悪い）。
  ROUND_SET_WITHDRAWN({ prevState, payload, nextTokensState, commit }) {
    const { tokenId, withdrawn } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;

    const current = round.withdrawn || [];
    const isWithdrawn = current.includes(tokenId);
    if (isWithdrawn === !!withdrawn) return; // 変化なし

    const nextWithdrawn = withdrawn ? [...current, tokenId] : current.filter(id => id !== tokenId);
    // 復帰時は「未行動で復帰」を保証するため、行動済みからも外す
    const acted = withdrawn ? (round.acted || []) : (round.acted || []).filter(id => id !== tokenId);
    const interruptId = withdrawn && round.interruptId === tokenId ? null : round.interruptId;
    const name = nextTokensState[tokenId]?.name || '？';

    commit({
      round: { ...round, withdrawn: nextWithdrawn, acted, interruptId },
      chatLogs: withSystemLog(
        prevState.chatLogs,
        withdrawn ? `${name}が戦闘から離脱しました。` : `${name}が戦闘に復帰しました。`,
        payload?.time
      )
    });
  },

  // 次の手番への割り込み指定。行動済みのコマにも割り込ませられるよう、ここで
  // actedからも外しておく（回復と割り込みが1操作で済み、pickNextActor側は
  // 「参加者に残っているか」だけを見ればよくなる）。tokenId=nullで予約解除。
  // 進行中の手番は中断しない（あくまで「次の手番」に割り込む）。離脱済みのコマは
  // 割り込ませられない（ROUND_SET_WITHDRAWN側で予約解除も行うが、ここでも二重に防ぐ）。
  ROUND_SET_INTERRUPT({ prevState, payload, nextTokensState, commit }) {
    const { tokenId = null } = payload;
    const round = prevState.round;
    if (!round.active) return;
    if (tokenId && !round.participants.includes(tokenId)) return;
    if (tokenId && (round.withdrawn || []).includes(tokenId)) return;

    const acted = tokenId ? (round.acted || []).filter(id => id !== tokenId) : (round.acted || []);
    const logText = tokenId
      ? `${nextTokensState[tokenId]?.name || '？'}が次の手番に割り込みます。`
      : '割り込み予約を解除しました。';

    commit({
      round: { ...round, interruptId: tokenId, acted },
      chatLogs: withSystemLog(prevState.chatLogs, logText, payload?.time)
    });
  },

  // プロットの提出・変更・取り消し（value:null）。kind:'plot'のフェーズでだけ受け付ける。
  // 【これはGM限定にしない】出すのはコマの持ち主なので、server/index.jsのGM_ONLY_ACTIONSにも
  // 入れていない（ROUND_SET_READYと同じ扱い）。持ち主かどうかの判定は画面側だけの制限で、
  // サーバーは強制しない（コマの所有者チェックと同じ姿勢。js/room-authority.jsのcanOperateToken）。
  // 【ログに残さない】提出のたびに出すと、伏せている値がログから読めてしまう。
  // 値はROUND_ADVANCE_PHASEでの一斉公開のときにまとめて出す。
  // slotIdを省略（または'main'）すると元からある枠、それ以外なら「選択を増やす」で足した枠。
  ROUND_SET_PLOT({ prevState, payload, commit }) {
    const { tokenId, slotId = 'main', value = null, userId = null } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;
    if (round.template?.[round.phaseIndex]?.kind !== 'plot') return;
    if (round.plotsRevealed) return; // 公開後の書き換えは受け付けない

    const phase = round.template[round.phaseIndex];
    const { min = 1, max = 6 } = phase.plot || {};

    // 出す値の検算は枠によらず同じ。取り消し（null）は「もともと出ていなければ変化なし」。
    const numeric = value === null ? null : Math.trunc(Number(value));
    if (numeric !== null && (!Number.isFinite(numeric) || numeric < min || numeric > max)) return;

    if (slotId !== 'main') {
      const extras = round.plotExtras?.[tokenId] || [];
      const index = extras.findIndex(extra => extra.id === slotId);
      if (index < 0) return; // 消された枠への提出（他の人の操作と行き違った）
      const current = extras[index];
      if (numeric === null && current.value === undefined) return; // 変化なし
      if (current.value === numeric && current.submitter === userId) return; // 変化なし

      const nextExtras = [...extras];
      nextExtras[index] = numeric === null
        ? { ...current, value: undefined, submitter: null }
        : { ...current, value: numeric, submitter: userId };
      commit({
        round: { ...round, plotExtras: { ...(round.plotExtras || {}), [tokenId]: nextExtras } }
      });
      return;
    }

    const plots = { ...(round.plots || {}) };
    const plotSubmitters = { ...(round.plotSubmitters || {}) };

    if (numeric === null) {
      if (!(tokenId in plots)) return; // 変化なし
      delete plots[tokenId];
      delete plotSubmitters[tokenId];
    } else {
      if (plots[tokenId] === numeric && plotSubmitters[tokenId] === userId) return; // 変化なし
      plots[tokenId] = numeric;
      // 出し直されたら見てよい人も入れ替わる（GMが代理で出し直した場合など）
      plotSubmitters[tokenId] = userId;
    }

    commit({ round: { ...round, plots, plotSubmitters } });
  },

  // 1つのコマにプロットの枠を足す（分身の術のように、同じコマが2つ以上のプロットに出るとき）。
  // 【idはpayloadで受け取る】ここで採番するとクライアントとサーバーで食い違う。
  // 呼び出し側がgeneratePlotSlotId()で作って渡すこと。
  // 【ログに残さない】プロットが増える原因は卓に公開される情報なので伏せる必要はないが、
  // 増やすたびに発言が流れるのは邪魔なので通知はしない（ROUND_SET_PLOTと同じ扱い）。
  // 増えたことは提出欄と提出状況の行から全員に見える。
  ROUND_ADD_PLOT_SLOT({ prevState, payload, commit }) {
    const { tokenId, slotId, label = '' } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;
    if (round.template?.[round.phaseIndex]?.kind !== 'plot') return;
    if (round.plotsRevealed) return; // 公開後に枠を増やすのは後出しになる
    if (!slotId || typeof slotId !== 'string') return;

    const extras = round.plotExtras?.[tokenId] || [];
    if (extras.some(extra => extra.id === slotId)) return; // 同じ操作が二重に届いた

    const nextExtras = [...extras, { id: slotId, label: normalizePlotSlotLabel(label), value: undefined, submitter: null }];
    commit({
      round: { ...round, plotExtras: { ...(round.plotExtras || {}), [tokenId]: nextExtras } }
    });
  },

  // 増やした枠を取り消す。公開前だけ（公開後はどれで動くかをROUND_SET_PLOT_CHOICEで選ぶ）。
  ROUND_REMOVE_PLOT_SLOT({ prevState, payload, commit }) {
    const { tokenId, slotId } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;
    if (round.template?.[round.phaseIndex]?.kind !== 'plot') return;
    if (round.plotsRevealed) return;

    const extras = round.plotExtras?.[tokenId] || [];
    const nextExtras = extras.filter(extra => extra.id !== slotId);
    if (nextExtras.length === extras.length) return; // 変化なし

    const plotExtras = { ...(round.plotExtras || {}) };
    if (nextExtras.length > 0) plotExtras[tokenId] = nextExtras;
    else delete plotExtras[tokenId]; // 枠が元の1つだけに戻ったら痕跡を残さない

    // 消した枠が選ばれていた場合に備えて選択も落とす（公開前なので普通は空）
    const plotChoice = { ...(round.plotChoice || {}) };
    if (plotChoice[tokenId] === slotId) delete plotChoice[tokenId];

    commit({ round: { ...round, plotExtras, plotChoice } });
  },

  // 増やした枠の名前（「コマA（影法師）」の括弧の中身）。名前は公開情報なので、
  // 値と違って伏せず、公開後でも直せる。ログには残さない。
  ROUND_SET_PLOT_SLOT_LABEL({ prevState, payload, commit }) {
    const { tokenId, slotId, label = '' } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;

    const extras = round.plotExtras?.[tokenId] || [];
    const index = extras.findIndex(extra => extra.id === slotId);
    if (index < 0) return;

    const nextLabel = normalizePlotSlotLabel(label);
    if (extras[index].label === nextLabel) return; // 変化なし

    const nextExtras = [...extras];
    nextExtras[index] = { ...extras[index], label: nextLabel };
    commit({
      round: { ...round, plotExtras: { ...(round.plotExtras || {}), [tokenId]: nextExtras } }
    });
  },

  // 公開後、複数のプロットに出ているコマが「結局どれで動くか」を持ち主が決める。
  // slotIdにnullを渡すと未選択へ戻す。
  // 【自動計算を引き直す】選んだ値がシノビガミの忍法コストの上限とファンブル値になる。
  // コマ自体は触っていないので、ROUND_ADVANCE_PHASEの公開と同じくここから明示的に走らせる。
  // 【ログに残さない】選んだ結果は手番順の詳細リストに即時反映されて全員に見えるので、
  // 発言を足す必要がない（増やしたときと同じ扱い）。
  ROUND_SET_PLOT_CHOICE({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { tokenId, slotId = null } = payload;
    const round = prevState.round;
    if (!round.active || !round.participants.includes(tokenId)) return;
    if (!round.plotsRevealed) return; // 公開前に選ばせると、選んだ相手に値が読まれる
    if ((round.plotExtras?.[tokenId] || []).length === 0) return; // 選ぶ枠がない

    const valid = slotId === null
      || slotId === 'main'
      || (round.plotExtras?.[tokenId] || []).some(extra => extra.id === slotId);
    if (!valid) return;

    const plotChoice = { ...(round.plotChoice || {}) };
    if ((plotChoice[tokenId] ?? null) === slotId) return; // 変化なし
    if (slotId === null) delete plotChoice[tokenId];
    else plotChoice[tokenId] = slotId;

    const nextRound = { ...round, plotChoice };
    const tokensAfterChoice = { ...nextTokensState };
    recomputeDerivedForRound(tokensAfterChoice, activePlugin, nextRound);

    commit({ tokens: tokensAfterChoice, round: nextRound });
  },

  // ラウンド進行の設定（今はイニシアチブプロセスを挟むかどうかだけ）。ルーム単位・
  // 全員共通なのでroomに置く。進行中に切り替えた場合は、次に手番が決まるタイミングから
  // 効く（round.templateには焼き込まず、遷移のたびにusesInitiativeProcessを見るため）。
  SET_ROUND_SETTINGS({ prevState, payload, commit }) {
    const { useInitiativeProcess } = payload;
    const room = prevState.room;
    const next = !!useInitiativeProcess;
    if (usesInitiativeProcess(prevState) === next) return;

    commit({
      room: { ...room, roundSettings: { ...room.roundSettings, useInitiativeProcess: next } },
      chatLogs: withSystemLog(
        prevState.chatLogs,
        next
          ? 'キャラクターの手番の前にイニシアチブプロセスを挟むようにしました。'
          : 'イニシアチブプロセスを挟まないようにしました。',
        payload?.time
      )
    });
  },

  ROUND_PROGRESSION_END({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const round = prevState.round;
    if (!round.active) return;

    // 戦闘が終わるということは、進行中だったラウンドもそこで終わる。ラウンド単位の
    // プラグインデータ（忍法の「ラウンドにつき1回」の使用回数、そのラウンドに使った
    // 忍法コストの合計）を戻しておかないと、次の戦闘のラウンド1へ持ち越されてしまう。
    // バフの期限切れ（applyPhaseEnd）まで通さないのは、ここで消すと決めていない
    // 「ラウンド終了まで」のバフの扱いを、この変更で一緒に変えてしまわないため。
    let tokensAfterEnd = resetPluginComponentsForPhase(nextTokensState, activePlugin, 'round');

    // プロットから決まっていた値は平常時のものへ戻す。
    // 引き直しには「参加者が誰だったか」が要るので、終了後の空の状態ではなく
    // 直前のparticipantsを渡す（roundActive:falseで平常時として計算される）。
    // components を戻した後に引き直す（使用コストの表示がその結果を見るため）。
    const endedRound = { ...createInitialRoundState(), participants: round.participants };
    tokensAfterEnd = { ...tokensAfterEnd };
    recomputeDerivedForRound(tokensAfterEnd, activePlugin, endedRound);

    const clearedRound = createInitialRoundState();
    commit({
      tokens: tokensAfterEnd,
      round: clearedRound,
      // 進行が終われば「現在のラウンド」は0へ戻る
      room: withDerivedRoomParameters(prevState.room, prevState.stampCounts, clearedRound),
      chatLogs: withSystemLog(prevState.chatLogs, `ラウンド進行を終了しました（合計${round.roundNumber}ラウンド）。`, payload?.time)
    });
  },

  // 点呼/割り込み確認の「準備OK」一覧を更新する。ソフトな可視化のみで、これ自体は
  // 進行操作をブロックしない。頻繁に発火しうるためチャットログには残さない。
  ROUND_SET_READY({ prevState, payload, commit }) {
    const { userId, nickname, ready } = payload;
    if (!userId) return;
    const round = prevState.round;

    const withoutUser = round.confirmation.readyEntries.filter(e => e.userId !== userId);
    const nextEntries = ready ? [...withoutUser, { userId, nickname: nickname || '' }] : withoutUser;

    commit({
      round: { ...round, confirmation: { readyEntries: nextEntries } }
    });
  },
};