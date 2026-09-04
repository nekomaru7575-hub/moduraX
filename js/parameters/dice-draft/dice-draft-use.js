// js/parameters/dice-draft/dice-draft-use.js
// ダイスドラフトの「発動」。パネルのボタン（js/dice-draft-panel.js）と、プラグインが生やす
// チャットコマンド（ドラクルージュの「行い使用(名前)」）の両方がここを通る。
// 入口が2つあるので、規則をどちらかに書くと必ずもう一方とずれる。
//
// dispatch などの依存は全部引数で受け取る（game-store.js を import すると
// game-store.js → registry.js → プラグイン → ここ → game-store.js の循環になる）。

import { runSkillUse } from '../skill/skill-use.js';
import { findSkillByName, normalizeSkillList } from '../skill/skill-model.js';
import {
  evaluatePlacement, consumePlacement, placedDice, readTargetModifier
} from './dice-draft-model.js';
import { DICE_DRAFT_COMPONENT_KEY, readDraft } from './dice-draft-roll.js';

/**
 * 乗っているダイスでスキルを発動する。
 *
 * @param {{
 *   spec: object,              createDiceDraftSpec() の戻り値
 *   skillName: string,
 *   mode?: 'one'|'all',        'one' は1回ぶんだけ。既定は 'all'
 *   targetValue?: number|null, 幅のある目標値（"3～12"）でどれを狙うか。
 *                              省略時は合計で届く一番大きい目標値（evaluatePlacement）
 *   token: object|null,
 *   dispatch: (action: string, payload: object) => void,
 *   getToken?: () => object|null,
 *   getEffectiveParameterValue?: Function,
 *   generateBuffId?: () => string,
 *   chatCommand?: string,
 *   notify?: (message: string) => void   使えない理由の伝え方（既定はalert）
 * }} options
 * @returns {{ used: number, diceSpent: number }} 使えなかったときは used:0
 */
export function runDiceDraftUse({
  spec, skillName, mode = 'all', targetValue = null, token, dispatch,
  getToken, getEffectiveParameterValue, generateBuffId,
  chatCommand = '', notify = (message) => alert(message)
}) {
  const none = { used: 0, diceSpent: 0 };

  if (!token) {
    notify('キャラクターを選択してください。');
    return none;
  }
  if (!spec?.skillSpec) {
    notify('このシステムにはスキル一覧がありません。');
    return none;
  }

  const skillSpec = spec.skillSpec;
  const latest = getToken?.() ?? token;

  let workingSkills = normalizeSkillList(skillSpec, latest.components?.[skillSpec.componentKey] ?? []);
  const skill = findSkillByName(workingSkills, skillName);
  if (!skill) {
    notify(`「${skillName}」という${skillSpec.noun}がありません。`);
    return none;
  }

  const draft = readDraft(latest.components, workingSkills.map(s => s.name));
  const dice = placedDice(draft, skillName);
  // 目標値の修正は「今このコマに乗っている分」で判定する。剥がすのは使い終わった後
  // （下のEXPIRE_BUFFS）なので、1回きりの修正もこの発動には効く。
  const targetModifier = readTargetModifier(spec, latest, getEffectiveParameterValue);
  const result = evaluatePlacement(spec, skill, dice, { targetValue, targetModifier });
  if (!result.ready) {
    notify(`${skillName}はまだ使えません。（${result.description}）`);
    return none;
  }

  const plannedUses = mode === 'one' ? 1 : result.uses;

  // 発動で「判定終了」を迎えるシステム（ドラクルージュ）では、この発動で消えるバフの名前を
  // 先に控えておき、発動のログへ併記する。独立したシステム発言にすると、1回の発動でログが
  // 2行進んで直前の結果が流れてしまうため（js/main.jsのDICE_ROLL_REQUESTED・
  // js/parameters/dx3-combo-box.jsのrunComboCheckと同じ扱い）。
  // 文言はgame-store.jsのformatExpiredBuffsNoteと揃えてある。あちらをimportすると
  // game-store.js → registry.js → プラグイン → ここ という循環になるため、同じ整形を置いている。
  const expiringNames = spec.expiresCheckPhaseOnUse
    ? (latest.buffs || []).filter(buff => buff.expirePhase === 'check').map(buff => buff.name)
    : [];
  const expiredNote = expiringNames.length > 0 ? `\n判定終了で消滅: ${expiringNames.join('、')}` : '';

  // 使用回数は runSkillUse が1回につき1しか増やさないので、回数ぶん呼ぶ。
  // 【ここが要】次の回へ workingSkills を引き継がないと、2回目以降が「まだ0回」の
  // 古い一覧で判定され、上限をすり抜ける。runSkillUse は保存を自分ではやらず
  // onSaveSkills へ次の配列を渡してくるので、それを受け取って回す。
  //
  // 【ログは1行にまとめる】以前は回すたびに1行ずつ出していたため、3個まとめて使うと
  // 同じ効果の説明が3行流れ、直前の判定結果がログの上へ押し出されていた。
  // 各回のログはonLogで受け取るだけにして、出すのはループを抜けてから1回。
  // 内容はどの回も同じ（効果も修正も回ごとに変わらない）ので、最後の1件を採る。
  let used = 0;
  let lastLog = null;
  for (let i = 0; i < plannedUses; i += 1) {
    const target = findSkillByName(workingSkills, skillName);
    if (!target) break;

    const ok = runSkillUse({
      spec: skillSpec,
      targetSkills: [target],
      allSkills: workingSkills,
      tokenId: token.id,
      dispatch,
      getToken: getToken ?? (() => token),
      getEffectiveParameterValue,
      generateBuffId,
      onSaveSkills: (next) => { workingSkills = next; },
      // 見出しはループを抜けてから差し替える（回数が「使えた数」で決まるため）
      logTitle: `${skillSpec.noun}使用: ${skillName}`,
      logDetail: `${result.description}${expiredNote}`,
      logSystem: spec.label,
      chatCommand,
      onLog: (log) => { lastLog = log; }
    });

    // 上限や使用条件で弾かれた。ここまでの分だけを確定させる
    // （通らなかった回のダイスは減らさない）
    if (!ok) break;
    used += 1;
  }

  if (used === 0) return none;

  // 見出しは「（スキル名）×（回数）」。回数に plannedUses ではなく used を使うのは、
  // 上限で途中まで通った場合に、実際より多い回数を書かないため。
  if (lastLog) {
    const title = used > 1
      ? `${skillSpec.noun}使用: ${skillName}×${used}`
      : `${skillSpec.noun}使用: ${skillName}`;
    dispatch('ADD_CHAT_MESSAGE', {
      tabId: 'main',
      entry: { ...lastLog.entry, resultText: `${title}${lastLog.body}` }
    });
  }

  // 使えた回数ぶんだけ消費する。1回が何個を食うかは規則側（perUseDice）が知っている。
  const diceSpent = Math.min(dice.length, result.perUseDice * used);

  dispatch('SET_COMPONENT', {
    id: token.id, componentKey: skillSpec.componentKey, value: workingSkills
  });
  dispatch('SET_COMPONENT', {
    id: token.id,
    componentKey: DICE_DRAFT_COMPONENT_KEY,
    value: consumePlacement(draft, skillName, diceSpent)
  });

  // 判定が済んだので、このコマの「判定終了で消滅」バフを剥がす。
  // 【順番が要】評価と発動が終わってから撃つこと。先に撃つと、1回きりのつもりで乗せた
  // 修正がこの発動に効かないまま消える。消えた旨は上のログへ併記済み。
  if (spec.expiresCheckPhaseOnUse) {
    dispatch('EXPIRE_BUFFS', { phase: 'check', tokenId: token.id });
  }

  return { used, diceSpent };
}
