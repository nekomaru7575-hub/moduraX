// js/check-view/dice-draft-view.js
// 拡張判定UIの「ダイスドラフト」ビュー：振ってプールに溜めた目を1個ずつドラッグし、
// スキルの上に乗せて発動する（ドラクルージュ、銀剣のステラナイツ）。
//
// パネルの枠・対象コマの選択・注意書きは器（js/check-panel.js）が持ち、ここは
// 器から渡された container の中身だけを組む。
//
// 規則（何が置けるか・いつ発動できるか）はプラグインの宣言に閉じてあり、この画面は解釈しない。
// 判定は js/parameters/dice-draft/dice-draft-model.js の acceptsDie / evaluatePlacement だけを呼ぶ。
//
// 【ドラッグにHTML5のdrag&dropを使わない理由】
// このリポジトリの移動系（盤面のコマ・浮動パネル・盤面のパン）は全てPointer Eventsの
// 自前実装で統一されている。HTML5のdrag&dropがタッチで動かないため（js/drag-gesture.js冒頭）。
// ここも同じくbindDragGestureに乗せ、落とし先はdocument.elementFromPointで拾う。
//
// 【ドラッグ中にdispatchしない】
// 盤面のコマは移動中も毎フレームdispatchしているが、あれは座標1個だけ。こちらはcomponentsを
// 丸ごと置き換えるので、落とした瞬間に1回だけ送る。

import { bindDragGesture } from '../drag-gesture.js';
import { normalizeSkillList } from '../parameters/skill/skill-model.js';
import {
  acceptsDie, countDice, createDie, evaluatePlacement, filterSkillsByTab, moveDie, placedDice,
  readTargetModifier
} from '../parameters/dice-draft/dice-draft-model.js';
import { DICE_DRAFT_COMPONENT_KEY, readDraft } from '../parameters/dice-draft/dice-draft-roll.js';
import { runDiceDraftUse } from '../parameters/dice-draft/dice-draft-use.js';

const NO_SKILL_NOTICE = 'このシステムにはまだスキル一覧がありません。プールに溜めるところまで使えます。';

// ------------------------------------------------------------------
// ダイスの絵
// ------------------------------------------------------------------

// 1〜6の目のピップ（点）の位置。3×3の定位置から選ぶだけの表引き。
// 画像は使わない（image/ にダイス素材が無く、3D側の数字は実行時にcanvasへ描かれているため
// 流用もできない）。SVGならcurrentColorで塗れて拡縮も効く。
const PIP_LAYOUTS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]]
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * ダイス1個の見た目。値が1〜6ならピップ、それ以外は数字をそのまま出す。
 * 面数が6でないときだけ隅に「d10」のようなラベルを添える。これが無いと、
 * d10の「3」がd6の「3」と見分けられない。
 */
function renderDieFace(die) {
  const face = document.createElement('div');
  face.className = 'dice-draft-die';
  face.title = `1D${die.sides} の ${die.value}`;

  const layout = PIP_LAYOUTS[die.value];
  if (layout) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('dice-draft-pips');
    layout.forEach(([cx, cy]) => {
      const pip = document.createElementNS(SVG_NS, 'circle');
      pip.setAttribute('cx', cx);
      pip.setAttribute('cy', cy);
      pip.setAttribute('r', '11');
      svg.appendChild(pip);
    });
    face.appendChild(svg);
  } else {
    const number = document.createElement('span');
    number.className = 'dice-draft-number';
    number.textContent = die.value;
    face.appendChild(number);
  }

  if (die.sides !== 6) {
    const badge = document.createElement('span');
    badge.className = 'dice-draft-sides';
    badge.textContent = `d${die.sides}`;
    face.appendChild(badge);
  }

  return face;
}

// ------------------------------------------------------------------
// ビュー
// ------------------------------------------------------------------

/**
 * 1つのパネルに1つだけ作る。ダイアログと違って開きっぱなしなので、
 * 「保存しない見た目の状態」（狙う目標値・幕の絞り込み）をここに持つ。
 */
export function createDiceDraftView() {
  // 目標値に幅があるスキルで、利用者が選び直した目標値。`コマID\nスキル名` -> 目標値。
  // 状態（コマ）には保存しない：どの目標値を狙うかは発動するその瞬間の判断で、他の人と
  // 共有する必要も、部屋を出た後まで覚えておく必要も無いため。描き直しで戻らないよう
  // ここに持つだけ。
  const chosenTargets = new Map();

  // 選んでいる絞り込み（ドラクルージュの幕：戦／常／終）。宣言の1つ目が既定。
  // コマにも部屋にも保存しない：今どの幕を見ているかは各自の見方の問題で、
  // 他の人と揃える必要も、部屋を出た後まで覚えておく必要も無いため。
  let activeTabId = null;

  function readSkills(spec, token) {
    if (!spec?.skillSpec) return [];
    return normalizeSkillList(spec.skillSpec, token?.components?.[spec.skillSpec.componentKey] ?? []);
  }

  function currentTab(spec) {
    const tabs = spec?.skillTabs ?? [];
    if (tabs.length === 0) return null;
    return tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  }

  return {
    id: 'diceDraft',

    // 見出しは仕組みの名前で固定する。spec.label（ステラナイツなら「出目」）は
    // チャットログの発言種別に使う呼び名で、パネルの名前ではない。
    title: () => 'ダイスドラフト',

    // 描き直しの要否を決める材料。参照が変わったときだけ組み直す。ダイス1個ごとに
    // ドラッグを貼り直すので、毎回のSTATE_CHANGEDで作り直すと重い。
    renderKey: ({ spec, token }) => ({
      draft: token?.components?.[DICE_DRAFT_COMPONENT_KEY] ?? null,
      skills: (spec?.skillSpec && token?.components?.[spec.skillSpec.componentKey]) ?? null,
      // 移行ボタンの出し入れに効くので、移行元パラメータの参照も見る
      parameters: token?.parameters ?? null,
      // 目標値の修正はバフ/デバフで動く。ADD_BUFFはparametersを書き換えないので、
      // ここでbuffsを見ないと修正を足しても目標値の表示が古いまま残る
      buffs: token?.buffs ?? null
    }),

    render(ctx) {
      const { container, spec, canEdit, dispatch, getToken, requestRender } = ctx;
      const token = getToken();
      if (!token) return;

      const saveDraft = (draft) => {
        const latest = getToken();
        if (!latest) return;
        dispatch('SET_COMPONENT', {
          id: latest.id, componentKey: DICE_DRAFT_COMPONENT_KEY, value: draft
        });
      };

      const targetChoiceKey = (skillName) => `${token.id}\n${skillName}`;
      const readChosenTarget = (skillName) => chosenTargets.get(targetChoiceKey(skillName)) ?? null;

      // --- ドラッグ -------------------------------------------------

      // 掴んだダイスに追従する影。落とし先の判定はdocument.elementFromPointで行うので、
      // pointer-events:noneにして自分自身が拾われないようにする（CSS側で指定）。
      function createGhost(sourceEl) {
        const rect = sourceEl.getBoundingClientRect();
        const ghost = sourceEl.cloneNode(true);
        ghost.classList.add('dice-draft-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        document.body.appendChild(ghost);
        return { ghost, offsetX: rect.width / 2, offsetY: rect.height / 2 };
      }

      function dropTargetAt(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY);
        return el?.closest('[data-drop-target]') ?? null;
      }

      function clearHighlights() {
        container.querySelectorAll('.is-drop-hover').forEach(el => el.classList.remove('is-drop-hover'));
      }

      // 落とし先の名前（プールならnull）。受け付けられないならundefinedを返す。
      function resolveDrop(targetEl, skills, die) {
        if (!targetEl) return undefined;
        if (targetEl.dataset.dropTarget === 'pool') return null;

        const skillName = targetEl.dataset.skillName;
        const skill = skills.find(item => item.name === skillName);
        if (!skill) return undefined;
        return acceptsDie(spec, skill, die).ok ? skillName : undefined;
      }

      function bindDieDrag(dieEl, die, skills) {
        bindDragGesture(dieEl, {
          // 掴んだ瞬間に影を作る。falseを返すとドラッグ自体が始まらない
          // 掴んでいる間は器に描き直させない（掴んでいる要素が消えてしまう）
          onStart: () => {
            ctx.setBusy(true);
            dieEl.classList.add('is-dragging');
            return createGhost(dieEl);
          },
          onMove: (event, { ghost, offsetX, offsetY }) => {
            ghost.style.left = `${event.clientX - offsetX}px`;
            ghost.style.top = `${event.clientY - offsetY}px`;

            clearHighlights();
            const targetEl = dropTargetAt(event.clientX, event.clientY);
            if (resolveDrop(targetEl, skills, die) !== undefined) {
              targetEl.classList.add('is-drop-hover');
            }
          },
          onEnd: (event, { ghost }) => {
            ghost.remove();
            dieEl.classList.remove('is-dragging');
            clearHighlights();
            ctx.setBusy(false);

            const targetEl = dropTargetAt(event.clientX, event.clientY);
            const toSkillName = resolveDrop(targetEl, skills, die);
            if (toSkillName === undefined) {
              requestRender(); // 受け付けられない場所。掴む前の見た目へ戻す
              return;
            }

            const latest = getToken();
            const draft = readDraft(latest?.components, skills.map(skill => skill.name));
            const skill = skills.find(item => item.name === toSkillName) ?? null;
            const next = moveDie(draft, die.id, toSkillName, { spec, skill });

            // 動かなかった（元と同じ場所・置けない）なら送らない
            if (next === draft) requestRender();
            else saveDraft(next);
          }
        });
      }

      // --- 描画 -----------------------------------------------------

      function buildDie(die, skills) {
        const dieEl = renderDieFace(die);
        if (canEdit) {
          dieEl.classList.add('is-draggable');
          bindDieDrag(dieEl, die, skills);
        }
        return dieEl;
      }

      function buildPool(draft, skills) {
        const section = document.createElement('div');
        section.className = 'dice-draft-section';

        const heading = document.createElement('div');
        heading.className = 'dice-draft-heading';
        heading.textContent = `プール（${draft.pool.length}個）`;
        section.appendChild(heading);

        const pool = document.createElement('div');
        pool.className = 'dice-draft-pool';
        // スキルに乗せたダイスをここへ戻せる
        pool.dataset.dropTarget = 'pool';
        if (draft.pool.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'dice-draft-empty';
          empty.textContent = 'ダイスがありません';
          pool.appendChild(empty);
        } else {
          draft.pool.forEach(die => pool.appendChild(buildDie(die, skills)));
        }
        section.appendChild(pool);

        return section;
      }

      // 一覧の絞り込みを選ぶ帯（ドラクルージュの 戦／常／終）。押しても状態は動かさず、
      // 描き直すだけ（絞り込みは見た目の話で、ダイスの置き場も発動の規則も変わらない）。
      function buildTabRow(active) {
        const row = document.createElement('div');
        row.className = 'dice-draft-tabs';

        spec.skillTabs.forEach(tab => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dice-draft-tab';
          btn.classList.toggle('is-active', tab.id === active?.id);
          btn.textContent = tab.label;
          btn.title = tab.field
            ? `${tab.label}の${spec.skillSpec.noun}だけを出す`
            : `すべての${spec.skillSpec.noun}を出す`;
          btn.addEventListener('click', () => {
            activeTabId = tab.id;
            requestRender();
          });
          row.appendChild(btn);
        });

        return row;
      }

      // 発動。規則の判定・使用回数の記録・ダイスの消費は runDiceDraftUse が持っている
      // （チャットコマンドからも同じ関数を通すので、ここには手順を書かない）。
      function activate(skill, mode, targetValue) {
        const latest = getToken();
        if (!latest || !canEdit) return;

        const { used } = runDiceDraftUse({
          spec,
          skillName: skill.name,
          mode,
          targetValue,
          token: latest,
          dispatch,
          getToken,
          getEffectiveParameterValue: ctx.getEffectiveParameterValue,
          generateBuffId: ctx.generateBuffId
        });

        // 使い終わったら選び直しは無かったことにする（次に積むときは既定＝届く最大へ戻す）
        if (used > 0) chosenTargets.delete(targetChoiceKey(skill.name));
      }

      // スキル1枠。正方形のカードで、上から 名前 / ダイスの置き場 / 状態 / 発動ボタン。
      // 名前も状態も長くなりうるので、はみ出す分は省略記号に逃がす（枠の形を崩さないため。
      // 全文はtitle属性で読める）。
      function buildSkillCard(skill, draft, skills, targetModifier) {
        const dice = placedDice(draft, skill.name);
        const result = evaluatePlacement(spec, skill, dice, {
          targetValue: readChosenTarget(skill.name), targetModifier
        });

        const card = document.createElement('div');
        card.className = 'dice-draft-skill';

        const name = document.createElement('div');
        name.className = 'dice-draft-skill-name';
        name.textContent = skill.name;
        name.title = skill.name;
        card.appendChild(name);

        const slot = document.createElement('div');
        slot.className = 'dice-draft-slot';
        slot.dataset.dropTarget = 'skill';
        slot.dataset.skillName = skill.name;
        if (dice.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'dice-draft-empty';
          empty.textContent = 'ドラッグ';
          slot.appendChild(empty);
        } else {
          dice.forEach(die => slot.appendChild(buildDie(die, skills)));
        }
        card.appendChild(slot);

        const status = document.createElement('div');
        status.className = 'dice-draft-status';
        status.classList.toggle('is-ready', result.ready);
        status.textContent = result.description;
        status.title = result.description;
        card.appendChild(status);

        // 目標値が数字1つでないスキル（ドラクルージュの「3～12」「効果参照」）は、判定値を入れさせる。
        // 「3～12」の既定は「今の合計で届く一番大きい判定値」（evaluatePlacement）なので、たいていは
        // 触らなくてよく、低い判定値でわざと使いたいときだけ変える。「効果参照」は入れるまで使えない。
        if (result.targetInput) {
          const { min, max } = result.targetInput;
          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'dice-draft-target';
          input.min = String(min);
          if (max !== null) input.max = String(max);
          input.step = '1';
          input.placeholder = '判定値';
          input.title = max === null
            ? `判定値（${min}以上）。目標値修正はこの値に足されます`
            : `判定値（${min}～${max}）。目標値修正はこの値に足されます`;
          input.disabled = !canEdit;
          // 届かない判定値も入れられる（あと何点かを見ながら積むため）。入れた時点では使えないだけ
          input.value = result.targetValue === null ? '' : String(result.targetValue);

          // inputのたびに描き直すと、打っている途中でカードが組み直されて入力欄のフォーカスが飛ぶ。
          // 確定（Enter・フォーカスを外す）で拾う。
          input.addEventListener('change', () => {
            const value = Number(input.value);
            const valid = input.value !== '' && Number.isInteger(value)
              && value >= min && (max === null || value <= max);
            // 範囲外・空欄は選び直しを無かったことにする＝既定（「効果参照」なら未入力）へ戻す
            if (valid) chosenTargets.set(targetChoiceKey(skill.name), value);
            else chosenTargets.delete(targetChoiceKey(skill.name));
            requestRender(); // 使用ボタンの可否と状態の1行を入れ直した判定値で出し直す
          });
          card.appendChild(input);
        }

        // 「1回だけ」に意味があるかは規則側が決める（evaluatePlacementのsupportsPartialUse）。
        // 一致型は1個ずつ使えるので2つ、合計型は目標に届けば1回きりなので1つ。
        const buttons = document.createElement('div');
        buttons.className = 'dice-draft-use-row';

        const addUseBtn = (label, buttonTitle, mode) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dice-draft-use-btn';
          btn.textContent = label;
          btn.title = buttonTitle;
          btn.disabled = !canEdit || !result.ready;
          btn.addEventListener('click', () => activate(skill, mode, result.targetValue));
          buttons.appendChild(btn);
        };

        if (result.supportsPartialUse) {
          addUseBtn('1回', 'ダイス1個だけ使って1回発動する', 'one');
          addUseBtn('全て', `乗っているダイスを全部使って${result.uses || 0}回発動する`, 'all');
        } else {
          addUseBtn('使用', '乗っているダイスを使って発動する', 'all');
        }
        card.appendChild(buttons);

        return card;
      }

      // ドラフト導入前に「目ごとの個数」をパラメータで持っていたシステムのための移行
      // （ステラナイツのface1..face6）。自動でやらないのは、これらが手入力もできる値で、
      // 黙って書き換えると利用者の意図を壊しうるため。
      function buildMigration() {
        const entries = (spec.legacyCountParameters ?? [])
          .map(entry => ({ ...entry, count: Number(token.parameters?.[entry.paramId]?.value) || 0 }))
          .filter(entry => entry.count > 0);
        if (entries.length === 0) return null;

        const total = entries.reduce((sum, entry) => sum + entry.count, 0);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dice-draft-migrate-btn';
        button.textContent = `出目パラメータをプールへ移す（${total}個）`;
        button.addEventListener('click', () => {
          const latest = getToken();
          if (!latest) return;

          const skills = readSkills(spec, latest);
          const draft = readDraft(latest.components, skills.map(skill => skill.name));
          const dice = entries.flatMap(entry =>
            Array.from({ length: entry.count }, () => createDie(spec.diceSides, entry.value))
          );

          // 先にプールへ入れてから元の値を0にする。逆にすると、途中で失敗したときに
          // 数え札だけが消えて戻せない。
          saveDraft({ pool: [...draft.pool, ...dice], placements: { ...draft.placements } });
          entries.forEach(entry => {
            dispatch('SET_PARAMETER', { characterId: latest.id, paramId: entry.paramId, value: 0 });
          });
        });

        return button;
      }

      // --- 組み立て -------------------------------------------------

      const skills = readSkills(spec, token);
      const draft = readDraft(token.components, skills.map(skill => skill.name));

      container.innerHTML = '';

      const total = document.createElement('div');
      total.className = 'dice-draft-owner';
      total.textContent = `全${countDice(draft)}個`;
      container.appendChild(total);

      container.appendChild(buildPool(draft, skills));

      const skillSection = document.createElement('div');
      skillSection.className = 'dice-draft-section';
      // 中身を詰める前に足しておく。この先で1枚でも組み立てに失敗すると、最後にまとめて
      // 足す作りでは**スキルの列がまるごと出ない**（内容が空なのか描画が落ちたのか
      // 見分けられない壊れ方をする）。先に足しておけば被害はその1枚で止まる。
      container.appendChild(skillSection);

      const heading = document.createElement('div');
      heading.className = 'dice-draft-heading';
      heading.textContent = 'スキル';
      skillSection.appendChild(heading);

      // 絞り込みの帯（ドラクルージュの幕）。宣言が無いシステムでは出ない
      const tab = currentTab(spec);
      if (spec.skillSpec && spec.skillTabs.length > 1) {
        skillSection.appendChild(buildTabRow(tab));
      }
      const shownSkills = filterSkillsByTab(skills, tab);

      if (!spec.skillSpec) {
        const empty = document.createElement('div');
        empty.className = 'dice-draft-empty';
        empty.textContent = NO_SKILL_NOTICE;
        skillSection.appendChild(empty);
      } else if (shownSkills.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dice-draft-empty';
        // 「1件も登録が無い」のか「この絞り込みに無いだけ」なのかで案内を変える。
        // 同じ文言にすると、他の枠に登録済みのときに「消えた」と読めてしまう。
        empty.textContent = skills.length === 0
          ? `キャラクター更新の${spec.skillSpec.noun}一覧から登録すると、ここに並びます。`
          : `「${tab.label}」に出す${spec.skillSpec.noun}はありません。`;
        skillSection.appendChild(empty);
      } else {
        // 目標値の修正（ドラクルージュの目標値修正(TB)）は全スキル共通なので一度だけ読む
        const targetModifier = readTargetModifier(spec, token, ctx.getEffectiveParameterValue);

        // 正方形のカードを横に並べ、幅で折り返す（CSS側の .dice-draft-skill-list）
        const list = document.createElement('div');
        list.className = 'dice-draft-skill-list';
        shownSkills.forEach(skill => {
          // ドラッグの落とし先の解決には**絞り込む前の**一覧を渡す（隠れているスキルの
          // 下のダイスも、その場所のまま扱えるようにするため）
          list.appendChild(buildSkillCard(skill, draft, skills, targetModifier));
        });
        skillSection.appendChild(list);

        // 今の絞り込みから外れたスキルにダイスが乗っていたら、その旨だけ知らせる。
        // 黙っていると「振ったダイスが減っているのに見当たらない」ことになる。
        const hiddenDice = skills
          .filter(skill => !shownSkills.includes(skill))
          .reduce((sum, skill) => sum + placedDice(draft, skill.name).length, 0);
        if (hiddenDice > 0) {
          const hiddenNote = document.createElement('div');
          hiddenNote.className = 'dice-draft-empty';
          hiddenNote.textContent = `ここに出ていない${spec.skillSpec.noun}に ${hiddenDice}個 乗っています。`;
          skillSection.appendChild(hiddenNote);
        }
      }

      if (canEdit) {
        const migrate = buildMigration();
        if (migrate) container.appendChild(migrate);
      }
    }
  };
}
