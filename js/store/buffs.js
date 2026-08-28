// js/store/buffs.js
// バフ/デバフの終了条件（フェーズ）と、フェーズ終了時の後始末。
//
// 終了フェーズは入れ子になっていて（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）、
// 外側が終われば内側もすべて終わったものとして扱う。その連鎖を1段ずつ回して、
// バフの削除・プラグイン側の後始末・ログ本文の組み立てまでを applyPhaseEnd が受け持つ。

import { resetPluginComponentsOnPhaseEnd } from '../parameters/registry.js';

// バフ/デバフの終了条件（フェーズ）のラベル。ログ表示・チャットコマンド解釈の両方で使う。
export const BUFF_PHASE_LABELS = { scene: 'シーン', round: 'ラウンド', scenario: 'シナリオ', check: '判定', process: 'プロセス' };

// 終了フェーズの入れ子構造（外側→内側）。上位フェーズが終了したら、その内側は
// すべて終了したものとして扱う（シナリオ ⊃ シーン ⊃ ラウンド ⊃ プロセス ⊃ 判定）。
export const PHASE_HIERARCHY = ['scenario', 'scene', 'round', 'process', 'check'];

// 指定フェーズ自身と、その内側の全フェーズを外側から順に返す。
// 階層に無いフェーズ（将来の追加分）は自分自身だけを返し、従来どおりの単独処理になる。
export function getPhaseChain(phase) {
  const index = PHASE_HIERARCHY.indexOf(phase);
  return index < 0 ? [phase] : PHASE_HIERARCHY.slice(index);
}

// このコマがそのフェーズ終了で失うバフ/デバフの名前一覧（入れ子の内側も含む）。
// EXPIRE_BUFFSを1コマ分で撃つときは、そのロール自身のログへ結果を併記するため、
// 「これから何が消えるか」を撃つ前に取っておく必要がある。
export function listExpiringBuffNames(token, phase) {
  const chain = getPhaseChain(phase);
  return (token?.buffs || [])
    .filter(b => chain.includes(b.expirePhase))
    .map(b => b.name);
}

// 上の一覧を、判定結果などのログ本文へ足す1行にする。消えるものが無ければ空文字。
// 独立したシステム発言にせず本文へ足すのは、ロールのたびにログが2行進むと
// 直前の結果が流れてしまうため。
export function formatExpiredBuffsNote(names, phase) {
  if (names.length === 0) return '';
  return `\n${BUFF_PHASE_LABELS[phase] || phase}終了で消滅: ${names.join('、')}`;
}

// 指定フェーズ(phase: 'scene'|'round'|'scenario'|'check'|'process')の終了条件を持つバフ/デバフを
// トークンから取り除く。フェーズは完全一致で見る（入れ子の連鎖は呼び出し元のapplyPhaseEndが
// フェーズを1段ずつ渡すことで表現する）。
// onlyTokenIdを指定すると、そのコマだけを対象にする（「このコマが判定を1回行った」のように、
// 部屋全体ではなく1人分だけフェーズが終わる場合に使う）。
export function removeExpiredBuffs(tokensState, phase, onlyTokenId = null) {
  const nextTokens = { ...tokensState };
  const removedNames = [];
  const targetIds = onlyTokenId
    ? (nextTokens[onlyTokenId] ? [onlyTokenId] : [])
    : Object.keys(nextTokens);
  targetIds.forEach(tokenId => {
    const character = nextTokens[tokenId];
    const buffs = character.buffs || [];
    const remaining = buffs.filter(b => {
      if (b.expirePhase === phase) {
        removedNames.push(`${character.name}:${b.name}`);
        return false;
      }
      return true;
    });
    if (remaining.length !== buffs.length) {
      nextTokens[tokenId] = Object.freeze({ ...character, buffs: Object.freeze(remaining) });
    }
  });
  return { nextTokens, removedNames };
}

// removeExpiredBuffsと同じ「フェーズが終了した」タイミングで、プラグイン固有のcomponents
// （DX3ならエフェクトの使用回数）もリセットする。バフの期限切れとは別関心事のため、
// Core側はactivePluginへの委譲だけを担い、中身の意味はプラグイン側に委ねる
// （resetPluginComponentsOnPhaseEnd、js/parameters/registry.js参照）。
// onlyTokenIdの意味はremoveExpiredBuffsと同じ（対象を1コマに絞る）。
export function resetPluginComponentsForPhase(tokensState, activePlugin, phase, onlyTokenId = null) {
  const nextTokens = { ...tokensState };
  const targets = onlyTokenId
    ? (nextTokens[onlyTokenId] ? [[onlyTokenId, nextTokens[onlyTokenId]]] : [])
    : Object.entries(nextTokens);
  targets.forEach(([id, character]) => {
    const nextComponents = resetPluginComponentsOnPhaseEnd(activePlugin, character.components, phase);
    if (nextComponents !== character.components) {
      nextTokens[id] = Object.freeze({ ...character, components: nextComponents });
    }
  });
  return nextTokens;
}

// フェーズ（シーン/ラウンド/シナリオ/判定/プロセス）が終了したときの共通処理。
// 期限切れバフの除去とプラグインcomponentsのリセットは必ずセットで行い、通知文もここで組み立てる。
// EXPIRE_BUFFSと、ラウンド進行のROUND_ADVANCE_PHASE（フェーズ完了時の自動清掃）、
// APPLY_SCENE（シーン遷移）が使う。
//
// 上位フェーズの終了は内側のフェーズの終了も兼ねる（PHASE_HIERARCHY参照）ため、
// 指定フェーズから最下層まで1段ずつ同じ処理を流す。プラグインのリセットもフェーズ単位で
// 呼ばれるので、プラグイン側は入れ子を意識しなくてよい。
// onlyTokenIdを指定すると1コマだけが対象になる（「このコマが判定を1回行った」等）。
export function applyPhaseEnd(tokensState, activePlugin, phase, onlyTokenId = null) {
  const chain = getPhaseChain(phase);

  let tokens = tokensState;
  const removedNames = [];
  chain.forEach(chainPhase => {
    const result = removeExpiredBuffs(tokens, chainPhase, onlyTokenId);
    removedNames.push(...result.removedNames);
    tokens = resetPluginComponentsForPhase(result.nextTokens, activePlugin, chainPhase, onlyTokenId);
  });

  const phaseLabel = BUFF_PHASE_LABELS[phase] || phase;
  // 内側のフェーズも一緒に終了したことは、ログを見ただけで分かるようにしておく
  const innerLabels = chain.slice(1).map(p => BUFF_PHASE_LABELS[p] || p);
  const headline = innerLabels.length > 0
    ? `${phaseLabel}終了（${innerLabels.join('・')}も終了）。`
    : `${phaseLabel}終了。`;

  return {
    tokens,
    removedNames,
    logText: removedNames.length > 0
      ? `${headline}消滅したバフ/デバフ: ${removedNames.join('、')}`
      : headline
  };
}
