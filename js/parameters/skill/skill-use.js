// js/parameters/skill/skill-use.js
// スキルの「使用」。使用制限を判定し、修正値を自身へのバフとして与え、コスト（DX3の
// 上昇侵蝕率のような、使用時にパラメータへ加算される値）を反映し、使用回数を進めて
// ログを出す、という一連の流れをシステムに依存しない形で持つ。
//
// 1件だけ使う場合（DX3の「エフェクト使用」）も、複数をまとめて使う場合（DX3のコンボ発動）も
// 同じrunSkillUseを通す。両者の違いは引数で吸収する：
//   - バフの効果時間: スキル自身のexpirePhaseが優先。未設定ならexpirePhaseFallback
//     （単体使用はnull＝手動で外すまで、コンボはprocess）。
//   - コストを今払うか: applyCosts。コンボは発動時ではなくダメージロール後に払うためfalse。
//   - tag: まとめて剥がすための目印（コンボはcombo.id）。
//
// store操作（dispatch）は引数で受け取る。このファイルからgame-store.jsをimportすると
// game-store.js → registry.js → プラグイン → このファイル という循環importになるため
// （js/parameters/dx3-combo-box.js冒頭と同じ理由）。

import {
  checkSkillUsable, collectModProblems, analyzeMod, buildLowestModMeta, resolveExpirePhase,
  bumpSkillUsage, isFieldAvailable
} from './skill-model.js';

/**
 * 使用できないスキルがあったときにユーザーへ出す文面。
 * 「なぜ使えないか」（回数上限・条件未達）まで書く。黙って何も起きないと、
 * 押したのに反応が無いようにしか見えないため。
 */
export function buildUseFailureMessage(spec, blocked) {
  const lines = blocked.map(({ skill, blockedReasons }) =>
    `${spec.noun}「${skill.name}」\n・${blockedReasons.join('\n・')}`
  );
  return `使用できません。\n\n${lines.join('\n\n')}`;
}

/**
 * 支払い先が別の欄で決まるコスト（onUse.paramIdFromField）の、ログに出す呼び名。
 * 種別の欄が選択肢を持つなら、選ばれた選択肢のラベル（「フェイト」等）をそのまま使う。
 * 「コスト値: -2」より「フェイト: -2」のほうが、何を払ったのかが読んで分かるため。
 */
function costLabelFromField(spec, field, skill) {
  const sourceKey = field.onUse.paramIdFromField;
  const sourceField = spec.fields.find(f => f.key === sourceKey);
  const chosen = sourceField?.options?.find(option => option.value === skill.fields?.[sourceKey]);
  return chosen?.label || field.label;
}

/**
 * 使用時に払うコスト（specのfields[].onUseで宣言された欄）を、パラメータごとに合計する。
 * 欄の値は「効果参照」のような非数値も入りうるので、数値化できないものは0として扱う。
 *
 * 支払い先の決まり方は2通り。DX3の上昇侵蝕率のように欄と支払い先が1対1なら
 * `addToParamId`、アリアンロッドのコスト2のように行ごとに種別を選ばせるなら
 * `paramIdFromField`（同じスキルの別の欄に入っているparamIdを支払い先にする）。
 * `sign: -1` を付けると、入力された正の数を減算として扱う（MPの消費）。
 *
 * @returns {Array<{paramId:string, label:string, gain:number}>} 合計が0の項目は含まない
 */
export function sumSkillCosts(spec, skills) {
  const byParamId = new Map();

  spec.fields.forEach(field => {
    const onUse = field.onUse;
    if (!onUse?.addToParamId && !onUse?.paramIdFromField) return;
    const sign = onUse.sign === -1 ? -1 : 1;

    skills.forEach(skill => {
      // そのスキルで意味を持たない欄は払わせない（保存値は残っているため、
      // ここで見ないと「その種類には無いはずのコスト」を取ってしまう）
      if (!isFieldAvailable(field, skill.fields)) return;
      const value = Number(skill.fields?.[field.key]);
      if (!Number.isFinite(value) || value === 0) return;

      // 支払い先が欄で決まる場合、そのスキルで種別が選ばれていなければ払うものが無い
      const paramId = onUse.addToParamId ?? String(skill.fields?.[onUse.paramIdFromField] ?? '');
      if (!paramId) return;

      const label = onUse.paramIdFromField ? costLabelFromField(spec, field, skill) : field.label;
      const entry = byParamId.get(paramId) ?? { paramId, label, gain: 0 };
      entry.gain += value * sign;
      byParamId.set(paramId, entry);
    });
  });

  return [...byParamId.values()].filter(entry => entry.gain !== 0);
}

/**
 * コストをパラメータの基礎値へ加算する。実効値ではなく基礎値を対象にするのは、
 * 実効値を書き戻すとバフ分が基礎値へ混入して二重に効いてしまうため
 * （js/game-store.jsのgetEffectiveParameterValueのコメント参照）。
 * @returns {string} ログへ添える説明（コストが無ければ空文字）
 */
export function applySkillCosts({ costs, token, tokenId, dispatch }) {
  if (costs.length === 0) return '';

  costs.forEach(({ paramId, gain }) => {
    const base = token.parameters[paramId]?.value ?? 0;
    dispatch('SET_PARAMETER', { characterId: tokenId, paramId, value: base + gain });
  });

  return costs.map(({ label, gain }) => `\n${label}: ${gain > 0 ? '+' : ''}${gain}`).join('');
}

// 付与するバフを、対象パラメータ×効果時間ごとにまとめる。効果時間もキーに含めるのは、
// 同じパラメータへ修正を与えるスキルどうしで効果時間が違う場合に、片方の期限で
// もう片方まで消えてしまわないようにするため。
//
// 2つを繋ぐ区切りは、paramIdにも効果時間にも現れない文字であればよい（U+001F）。
// **ソースにはエスケープ表記で書くこと**：生の制御文字を置くと見えないまま紛れるし、
// NULに至ってはgitがこのファイルを丸ごとbinary扱いにして差分が読めなくなる
// （実際そうなっていたのを直した経緯がある）。
function groupBuffs(spec, skills, context, expirePhaseFallback) {
  const groups = new Map();

  skills.forEach(skill => {
    const expirePhase = resolveExpirePhase(skill.expirePhase, expirePhaseFallback);
    skill.mods.forEach(mod => {
      const key = `${mod.paramId}\u001f${expirePhase ?? ''}`;
      const group = groups.get(key)
        ?? { paramId: mod.paramId, expirePhase, delta: 0, mods: [], skillNames: [] };

      const { value } = analyzeMod(spec, skill, mod, context);
      group.delta += value;
      group.mods.push(mod);

      // バフ名は、そのパラメータへ実際に修正を与えたスキル名にする（複数なら" + "区切り）。
      // 修正値0でも追加欄（DX3のクリティカル値下限）を持つものは寄与とみなす。
      // 「クリティカル値は7として扱う」のように値を持たず下限だけを持つスキルがあるため。
      const modTarget = spec.findModTarget(mod.paramId);
      const hasExtra = modTarget?.extra && Number.isFinite(mod.extra?.[modTarget.extra.key]);
      if ((value !== 0 || hasExtra) && !group.skillNames.includes(skill.name)) {
        group.skillNames.push(skill.name);
      }

      groups.set(key, group);
    });
  });

  return [...groups.values()];
}

/**
 * スキルを使用する。
 * @param {{
 *   spec: object,
 *   targetSkills: Array<object>,  使用するスキル（正規形）。単体使用なら1件、コンボならN件。
 *   allSkills: Array<object>,     使用回数を書き戻すための一覧全体（正規形）。
 *   tokenId: string,
 *   dispatch: Function,
 *   getToken: () => object|null,
 *   getEffectiveParameterValue: Function,
 *   generateBuffId: () => string,
 *   onSaveSkills: (skills:Array<object>) => void,
 *   logTitle: string,             ログ1行目（例「エフェクト使用: 火炎放射」）
 *   logDetail?: string,           ログ2行目（例 コンボに組み込まれたエフェクト名の並び）
 *   logSystem?: string,           チャットログの発言種別
 *   chatCommand?: string,         これを起こしたチャットコマンド（ログに添える）
 *   expirePhaseFallback?: string|null,
 *   tag?: string|null,
 *   applyCosts?: boolean,
 *   buffNameFallback?: string     修正の出どころが特定できない場合のバフ名（コンボ名等）
 * }} options
 * @returns {boolean} 使用できたか（制限で弾かれた場合はfalse。副作用は何も起きない）
 */
export function runSkillUse({
  spec, targetSkills, allSkills, tokenId, dispatch, getToken,
  getEffectiveParameterValue, generateBuffId, onSaveSkills,
  logTitle, logDetail = '', logSystem, chatCommand,
  expirePhaseFallback = null, tag = null, applyCosts = true, buffNameFallback = ''
}) {
  const token = getToken();
  if (!token) return false;

  const context = { token, getEffectiveParameterValue };

  // 0. 使用制限：1つでも使えないものがあれば、何も適用しない
  //    （バフ・使用回数・コスト・ログのいずれも発生させない）。
  const checks = targetSkills.map(skill => ({ skill, ...checkSkillUsable(spec, skill, context) }));
  const blocked = checks.filter(check => !check.usable);
  if (blocked.length > 0) {
    alert(buildUseFailureMessage(spec, blocked));
    return false;
  }

  // 1. 修正値をバフとして付与
  let appliedBuffCount = 0;
  groupBuffs(spec, targetSkills, context, expirePhaseFallback).forEach(group => {
    const meta = buildLowestModMeta(spec, group.paramId, group.mods);
    // 修正値が0でも、追加欄（下限）を持つならバフは要る（判定へ下限を届けるため）
    if (!group.delta && meta === null) return;

    dispatch('ADD_BUFF', {
      tokenId,
      id: generateBuffId(),
      name: group.skillNames.join(' + ') || buffNameFallback || logTitle,
      paramId: group.paramId,
      delta: group.delta,
      expirePhase: group.expirePhase,
      tag,
      meta
    });
    appliedBuffCount += 1;
  });

  // 2. コスト（DX3の上昇侵蝕率）。コンボのように後で払う経路ではapplyCosts:falseで飛ばす。
  const costText = applyCosts
    ? applySkillCosts({ costs: sumSkillCosts(spec, targetSkills), token, tokenId, dispatch })
    : '';

  // 3. 使用回数を+1して書き戻す
  onSaveSkills(bumpSkillUsage(spec, allSkills, targetSkills.map(skill => skill.name)));

  // 4. 効果（note）。修正値をほとんど使わないシステム（ステラナイツのスキル、ドラクルージュの
  //    行い・逸話）では、付かなかった修正の断り書きより「その能力が何をするか」のほうが
  //    卓の役に立つ。宣言したシステムだけに出す（spec.logNote）。
  const noteText = spec.logNote
    ? targetSkills
      .map(skill => String(skill.note ?? '').trim())
      .filter(Boolean)
      .map(note => `\n${note}`)
      .join('')
    : '';

  // 5. ログ。式を評価できなかった・修正が1件も付かなかった場合は理由を添える
  //    （黙って何も起きないと「入力したのにバフが付かない」と見えてしまうため）。
  const problems = [
    ...collectModProblems(spec, targetSkills, context),
    ...checks.flatMap(check => check.problems)
  ];
  const noticeLines = problems.map(problem => `⚠ ${problem}`);
  // 修正を扱わないシステム（allowMods:false）と、効果を代わりに出すシステム（logNote）では、
  // バフが付かないのが当たり前なので黙っておく。断り書きを出すのは「入力したのにバフが付かない」を
  // 気付かせるためで、そうでないシステムでは毎回ログを汚すだけになる。
  // ⚠付きの問題（式が読めない等）は logNote でも出す：あちらは入力の誤りの知らせなので消さない。
  if (appliedBuffCount === 0 && spec.allowMods && !spec.logNote) {
    noticeLines.push(problems.length > 0
      ? '（このため修正値バフは付与されていません）'
      : '（修正値バフはありません）');
  }
  const notice = noticeLines.length > 0 ? `\n${noticeLines.join('\n')}` : '';

  dispatch('ADD_CHAT_MESSAGE', {
    tabId: 'main',
    entry: {
      system: logSystem || spec.noun,
      character: token.name || '',
      characterId: token.id || null,
      color: token.textColor || null,
      command: chatCommand,
      resultText: `${logTitle}${logDetail ? `\n${logDetail}` : ''}${noteText}${costText}${notice}`
    }
  });

  return true;
}
