// js/dice-draft-panel.js
// 「ダイスドラフト」：振ってプールに溜めた目を1個ずつドラッグし、スキルの上に乗せて発動する
// 浮動パネル。既定は非表示で、盤外の右クリックメニューから出す（スタンプ送信と同じ構え）。
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

import { store, setDiceDraftPanelController } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { createFloatingPanel } from './floating-panel.js';
import { bindDragGesture } from './drag-gesture.js';
import { canOperateToken } from './room-authority.js';
import { getPluginDiceDraftSpec } from './parameters/registry.js';
import { normalizeSkillList } from './parameters/skill/skill-model.js';
import {
  acceptsDie, consumePlacement, countDice, createDie,
  evaluatePlacement, moveDie, placedDice
} from './parameters/dice-draft/dice-draft-model.js';
import { DICE_DRAFT_COMPONENT_KEY, readDraft } from './parameters/dice-draft/dice-draft-roll.js';

const MAIN_TAB_ID = 'main';
const NO_PLUGIN_NOTICE = 'この部屋のシステムにはダイスドラフトがありません。';
const NO_TOKEN_NOTICE = 'チャット欄で参照キャラクターを選ぶと、そのコマのダイスを扱えます。';
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
// パネル本体
// ------------------------------------------------------------------

export function initDiceDraftPanel() {
  const panel = createFloatingPanel({
    title: 'ダイスドラフト',
    storageKey: 'diceDraftPanelRect',
    defaultRect: { x: 360, y: 200, w: 340, h: 420 },
    // 使わないシステムの部屋では邪魔なので、出すかどうかは各自に決めてもらう
    defaultVisible: false
  });
  panel.body.classList.add('dice-draft-body');

  const notice = document.createElement('div');
  notice.className = 'dice-draft-notice';
  notice.hidden = true;
  panel.body.appendChild(notice);

  const content = document.createElement('div');
  content.className = 'dice-draft-content';
  panel.body.appendChild(content);

  let currentTokenId = null;
  // ドラッグ中は描き直さない（掴んでいる要素が消えてしまう）
  let dragging = false;
  // 直前に描いた材料。参照が変わったときだけ組み直す（js/character-panel.jsと同じ）
  let lastKey = null;

  const getToken = () => (currentTokenId ? store.state.tokens[currentTokenId] : null) ?? null;
  const getSpec = () => getPluginDiceDraftSpec(store.state.room?.activePlugin ?? null);

  function readSkills(spec, token) {
    if (!spec?.skillSpec) return [];
    return normalizeSkillList(spec.skillSpec, token?.components?.[spec.skillSpec.componentKey] ?? []);
  }

  function saveDraft(draft) {
    const token = getToken();
    if (!token) return;
    store.dispatch('SET_COMPONENT', {
      id: token.id, componentKey: DICE_DRAFT_COMPONENT_KEY, value: draft
    });
  }

  function logToMain(spec, token, text) {
    store.dispatch('ADD_CHAT_MESSAGE', {
      tabId: MAIN_TAB_ID,
      entry: {
        system: spec.label,
        character: token.name || '',
        characterId: token.id || null,
        color: token.textColor || null,
        command: '',
        diceDetail: '',
        resultText: text
      }
    });
  }

  // --- ドラッグ ---------------------------------------------------

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
    content.querySelectorAll('.is-drop-hover').forEach(el => el.classList.remove('is-drop-hover'));
  }

  // 落とし先の名前（プールならnull）。受け付けられないならundefinedを返す。
  function resolveDrop(targetEl, spec, skills, die) {
    if (!targetEl) return undefined;
    if (targetEl.dataset.dropTarget === 'pool') return null;

    const skillName = targetEl.dataset.skillName;
    const skill = skills.find(item => item.name === skillName);
    if (!skill) return undefined;
    return acceptsDie(spec, skill, die).ok ? skillName : undefined;
  }

  function bindDieDrag(dieEl, die, spec, skills) {
    bindDragGesture(dieEl, {
      // 掴んだ瞬間に影を作る。falseを返すとドラッグ自体が始まらない
      onStart: () => {
        dragging = true;
        dieEl.classList.add('is-dragging');
        return createGhost(dieEl);
      },
      onMove: (event, { ghost, offsetX, offsetY }) => {
        ghost.style.left = `${event.clientX - offsetX}px`;
        ghost.style.top = `${event.clientY - offsetY}px`;

        clearHighlights();
        const targetEl = dropTargetAt(event.clientX, event.clientY);
        if (resolveDrop(targetEl, spec, skills, die) !== undefined) {
          targetEl.classList.add('is-drop-hover');
        }
      },
      onEnd: (event, { ghost }) => {
        ghost.remove();
        dieEl.classList.remove('is-dragging');
        clearHighlights();
        dragging = false;

        const targetEl = dropTargetAt(event.clientX, event.clientY);
        const toSkillName = resolveDrop(targetEl, spec, skills, die);
        if (toSkillName === undefined) {
          render(); // 受け付けられない場所。掴む前の見た目へ戻す
          return;
        }

        const token = getToken();
        const draft = readDraft(token?.components, skills.map(skill => skill.name));
        const skill = skills.find(item => item.name === toSkillName) ?? null;
        const next = moveDie(draft, die.id, toSkillName, { spec, skill });

        // 動かなかった（元と同じ場所・置けない）なら送らない
        if (next === draft) render();
        else saveDraft(next);
      }
    });
  }

  // --- 描画 -------------------------------------------------------

  function buildDie(die, spec, skills, canEdit) {
    const dieEl = renderDieFace(die);
    if (canEdit) {
      dieEl.classList.add('is-draggable');
      bindDieDrag(dieEl, die, spec, skills);
    }
    return dieEl;
  }

  function buildPool(draft, spec, skills, canEdit) {
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
      draft.pool.forEach(die => pool.appendChild(buildDie(die, spec, skills, canEdit)));
    }
    section.appendChild(pool);

    return section;
  }

  // スキル1枠。正方形のカードで、上から 名前 / ダイスの置き場 / 状態 / 発動ボタン。
  // 名前も状態も長くなりうるので、はみ出す分は省略記号に逃がす（枠の形を崩さないため。
  // 全文はtitle属性で読める）。
  function buildSkillCard(skill, draft, spec, canEdit, skills) {
    const dice = placedDice(draft, skill.name);
    const result = evaluatePlacement(spec, skill, dice);

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
      dice.forEach(die => slot.appendChild(buildDie(die, spec, skills, canEdit)));
    }
    card.appendChild(slot);

    const status = document.createElement('div');
    status.className = 'dice-draft-status';
    status.classList.toggle('is-ready', result.ready);
    status.textContent = result.description;
    status.title = result.description;
    card.appendChild(status);

    const useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'dice-draft-use-btn';
    useBtn.textContent = '発動';
    useBtn.disabled = !canEdit || !result.ready;
    useBtn.addEventListener('click', () => activate(skill, spec));
    card.appendChild(useBtn);

    return card;
  }

  // ドラフト導入前に「目ごとの個数」をパラメータで持っていたシステムのための移行
  // （ステラナイツのface1..face6）。自動でやらないのは、これらが手入力もできる値で、
  // 黙って書き換えると利用者の意図を壊しうるため。
  function buildMigration(spec, token) {
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
        store.dispatch('SET_PARAMETER', { characterId: latest.id, paramId: entry.paramId, value: 0 });
      });
    });

    return button;
  }

  function activate(skill, spec) {
    const token = getToken();
    if (!token || !canOperateToken(token)) return;

    const skills = readSkills(spec, token);
    const draft = readDraft(token.components, skills.map(item => item.name));
    const dice = placedDice(draft, skill.name);
    const result = evaluatePlacement(spec, skill, dice);
    if (!result.ready) return;

    // 乗っていたダイスは消費する（プールへは戻さない）
    saveDraft(consumePlacement(draft, skill.name));

    // ここが js/parameters/skill/skill-use.js の runSkillUse() を差し込む一点。
    // 通すと使用回数の記録・使用条件の判定・修正値バフの付与・警告付きのログまで面倒を見てくれる
    // （必要なのは dispatch / getToken / getEffectiveParameterValue / generateBuffId /
    // onSaveSkills で、どれもこの画面から渡せる）。今はまだ通していないので、
    // 消費したことと何回ぶんかをログに流すだけ。
    logToMain(spec, token, `スキル発動: ${skill.name}（${result.description}）`);
  }

  function showNotice(text) {
    notice.textContent = text;
    notice.hidden = false;
    content.innerHTML = '';
  }

  function render() {
    const spec = getSpec();
    const token = getToken();

    if (!spec) {
      showNotice(NO_PLUGIN_NOTICE);
      return;
    }
    if (!token) {
      showNotice(NO_TOKEN_NOTICE);
      return;
    }

    const canEdit = canOperateToken(token);
    const skills = readSkills(spec, token);
    const draft = readDraft(token.components, skills.map(skill => skill.name));

    notice.hidden = canEdit;
    notice.textContent = canEdit ? '' : '他の人のコマです（表示のみ。動かせるのは持ち主とGMです）';

    content.innerHTML = '';

    const who = document.createElement('div');
    who.className = 'dice-draft-owner';
    who.textContent = `${token.name}　（全${countDice(draft)}個）`;
    content.appendChild(who);

    content.appendChild(buildPool(draft, spec, skills, canEdit));

    const skillSection = document.createElement('div');
    skillSection.className = 'dice-draft-section';
    const heading = document.createElement('div');
    heading.className = 'dice-draft-heading';
    heading.textContent = 'スキル';
    skillSection.appendChild(heading);

    if (!spec.skillSpec) {
      const empty = document.createElement('div');
      empty.className = 'dice-draft-empty';
      empty.textContent = NO_SKILL_NOTICE;
      skillSection.appendChild(empty);
    } else if (skills.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dice-draft-empty';
      empty.textContent = `キャラクター更新の${spec.skillSpec.noun}一覧から登録すると、ここに並びます。`;
      skillSection.appendChild(empty);
    } else {
      // 正方形のカードを横に並べ、幅で折り返す（CSS側の .dice-draft-skill-list）
      const list = document.createElement('div');
      list.className = 'dice-draft-skill-list';
      skills.forEach(skill => {
        list.appendChild(buildSkillCard(skill, draft, spec, canEdit, skills));
      });
      skillSection.appendChild(list);
    }
    content.appendChild(skillSection);

    if (canEdit) {
      const migrate = buildMigration(spec, token);
      if (migrate) content.appendChild(migrate);
    }
  }

  // 材料の参照が変わったときだけ組み直す。ダイス1個ごとにドラッグを貼り直すので、
  // 毎回のSTATE_CHANGEDで作り直すと重い（js/character-panel.jsの参照比較と同じ狙い）。
  function renderIfChanged() {
    if (dragging) return;

    const spec = getSpec();
    const token = getToken();
    const key = {
      tokenId: currentTokenId,
      pluginId: store.state.room?.activePlugin ?? null,
      draft: token?.components?.[DICE_DRAFT_COMPONENT_KEY] ?? null,
      skills: (spec?.skillSpec && token?.components?.[spec.skillSpec.componentKey]) ?? null,
      // 移行ボタンの出し入れに効くので、移行元パラメータの参照も見る
      parameters: token?.parameters ?? null,
      name: token?.name ?? null
    };

    if (lastKey
      && lastKey.tokenId === key.tokenId
      && lastKey.pluginId === key.pluginId
      && lastKey.draft === key.draft
      && lastKey.skills === key.skills
      && lastKey.parameters === key.parameters
      && lastKey.name === key.name) return;

    lastKey = key;
    render();
  }

  EventBus.subscribe('STATE_CHANGED', renderIfChanged);
  // 名乗りが変わると操作してよいかが変わる（canOperateToken）
  EventBus.subscribe('IDENTITY_CHANGED', () => { lastKey = null; renderIfChanged(); });

  render();

  // 盤外の右クリックメニューから表示/非表示を切り替えられるようにする
  setDiceDraftPanelController(panel);

  /** 対象のコマを切り替える。チャット欄の参照キャラクターに合わせる（js/main.js）。 */
  panel.setCharacter = (tokenId) => {
    if (currentTokenId === (tokenId || null)) return;
    currentTokenId = tokenId || null;
    lastKey = null;
    renderIfChanged();
  };

  return panel;
}
