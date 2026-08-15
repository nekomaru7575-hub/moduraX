// js/parameters/dice-draft/dice-draft-use.js
// ダイスドラフトの「発動」。パネルのボタン（js/dice-draft-panel.js）と、プラグインが生やす
// チャットコマンド（ドラクルージュの「行い使用(名前)」）の両方がここを通る。
// 入口が2つあるので、規則をどちらかに書くと必ずもう一方とずれる。
//
// dispatch などの依存は全部引数で受け取る（game-store.js を import すると
// game-store.js → registry.js → プラグイン → ここ → game-store.js の循環になる）。

import { runSkillUse } from '../skill/skill-use.js';
import { findSkillByName, normalizeSkillList } from '../skill/skill-model.js';
import { evaluatePlacement, consumePlacement, placedDice } from './dice-draft-model.js';
import { DICE_DRAFT_COMPONENT_KEY, readDraft } from './dice-draft-roll.js';

/**
 * 乗っているダイスでスキルを発動する。
 *
 * @param {{
 *   spec: object,              createDiceDraftSpec() の戻り値
 *   skillName: string,
 *   mode?: 'one'|'all',        'one' は1回ぶんだけ。既定は 'all'
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
  spec, skillName, mode = 'all', token, dispatch,
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
  const result = evaluatePlacement(spec, skill, dice);
  if (!result.ready) {
    notify(`${skillName}はまだ使えません。（${result.description}）`);
    return none;
  }

  const plannedUses = mode === 'one' ? 1 : result.uses;

  // 使用回数は runSkillUse が1回につき1しか増やさないので、回数ぶん呼ぶ。
  // 【ここが要】次の回へ workingSkills を引き継がないと、2回目以降が「まだ0回」の
  // 古い一覧で判定され、上限をすり抜ける。runSkillUse は保存を自分ではやらず
  // onSaveSkills へ次の配列を渡してくるので、それを受け取って回す。
  let used = 0;
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
      logTitle: plannedUses > 1
        ? `${skillSpec.noun}使用: ${skillName}（${i + 1}/${plannedUses}回目）`
        : `${skillSpec.noun}使用: ${skillName}`,
      logDetail: result.description,
      logSystem: spec.label,
      chatCommand
    });

    // 上限や使用条件で弾かれた。ここまでの分だけを確定させる
    // （通らなかった回のダイスは減らさない）
    if (!ok) break;
    used += 1;
  }

  if (used === 0) return none;

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

  return { used, diceSpent };
}
