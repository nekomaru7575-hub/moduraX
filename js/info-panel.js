// js/info-panel.js
// 「情報」：タイトルと内容の組を、浮動パネルのタブとして並べる共有メモ。
// 調べた情報・ハンドアウト・GMの配布資料など、ログのように流れず何度でも読み返せて、
// かつ渡す相手を選べる置き場として使う。既定は非表示で、盤外の右クリックメニューから出す。
//
// 1件（エントリ）は { id, title, ownerId, sections } で、公開先(audience)はエントリでは
// なくsectionが持つ。これにより1つのタブの中で「表＝全員に公開、裏＝選んだ人だけ」を
// 同居させられる（シノビガミ／インセインのダブルハンドアウト）。
// タブは「見えるsectionが1つでもあるか」で出し分けるので、全section非公開の情報は
// タイトルごと相手の画面に出ない。逆に表が公開なら、裏の対象外の人にもタブと表は見え、
// 裏だけが見えない。鍵マークも自分に見えるsectionからしか立てないので、
// 「見えない裏がある」ことも相手には伝わらない。
//
// 編集・削除できるのは作成者(ownerId)とGM。ただしこれは画面側だけの制限で、サーバーは
// 強制しない（js/room-authority.jsのGM限定アクションには入れていない。誰でも作成・開示
// できる機能なので）。同じくjs/visibility.jsの但し書きのとおり、限定公開は「うっかり
// 見えない」ための仕切りであって、状態そのものは今も全クライアントへ配られている。
// 🔒の表示を「守られている」と読み違えないこと。
//
// net-sync.js/round-panel.jsと同様にinitInfoPanel()をexportし、main.jsの初期化から1回だけ呼ぶ。

import { store, setInfoPanelController } from './board-data-driven.js';
import { generateInfoEntryId, generateInfoSectionId } from './game-store.js';
import { EventBus } from './EventBus.js';
import { createFloatingPanel } from './floating-panel.js';
import { showInfoEntryDialog } from './info-entry-dialog.js';
import { showAudienceDialog } from './audience-picker.js';
import { showContextMenu } from './context-menu.js';
import { canView, isGm, isRestricted, describeAudience } from './visibility.js';
import { getCurrentParticipantId } from './local-identity.js';

const EDIT_DENIED_REASON = '作成者とGMだけが編集できます。';

// 「どのタブを見ているか」は各クライアントのローカル状態にする（共有状態に入れると
// 全員のタブが同時に切り替わってしまう。チャットタブのactiveTabIdと同じ扱い）。
let activeEntryId = null;
let lastRenderedEntriesRef = null;
let lastRenderedParticipantsRef = null;

function entryLabel(entry) {
  return entry.title.trim() || '(無題)';
}

// 自分に見えるsectionだけを配列順に返す。見えないsectionは呼び出し側にも渡さない
// （「非公開の項目があります」のような痕跡すら出さないため。裏の使命の存在自体が手掛かりになる）。
function visibleSections(entry, myId) {
  return entry.sections.filter(section => canView(section.audience, myId));
}

function visibleEntries(state, myId) {
  return (state.infoEntries || []).filter(entry => visibleSections(entry, myId).length > 0);
}

// 作成者本人とGMだけが編集・削除できる。ownerIdが無い（表示名未設定の人が作った）ものは、
// 直せる人がいなくなってしまうので誰でも触れる。コマのcanOperateTokenと同じ規則。
function canEditEntry(entry, myId, amGm) {
  if (!entry) return false;
  if (!entry.ownerId) return true;
  return amGm || entry.ownerId === myId;
}

export function initInfoPanel() {
  const panel = createFloatingPanel({
    title: '情報',
    storageKey: 'infoPanelRect',
    defaultRect: { x: 360, y: 120, w: 340, h: 440 },
    // 既定は非表示。保存値がある人（一度でも開いた人）は前回の状態が優先される
    defaultVisible: false
  });
  setInfoPanelController(panel);

  const container = panel.body;
  // チャットパレットと同じく、パネル本体のクラスを中身側のものへ差し替える
  // （flexの縦並びは.info-panel側で持ち直す）
  container.className = 'info-panel';

  const tabRow = document.createElement('div');
  tabRow.className = 'info-panel-tabs';
  container.appendChild(tabRow);

  const sectionsEl = document.createElement('div');
  sectionsEl.className = 'info-panel-sections';
  container.appendChild(sectionsEl);

  const footer = document.createElement('div');
  footer.className = 'info-panel-footer';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'info-panel-footer-btn';
  editBtn.textContent = '編集';

  const audienceBtn = document.createElement('button');
  audienceBtn.type = 'button';
  audienceBtn.className = 'info-panel-footer-btn';
  audienceBtn.textContent = '公開先';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'info-panel-footer-btn';
  removeBtn.textContent = '削除';

  footer.appendChild(editBtn);
  footer.appendChild(audienceBtn);
  footer.appendChild(removeBtn);
  container.appendChild(footer);

  // 表示中のタブが見えなくなった（公開先から外された・消された）ときに、
  // 空白の本文が残らないよう先頭の見えるタブへ寄せる。
  function ensureActiveEntryVisible(state, myId) {
    const entries = visibleEntries(state, myId);
    if (entries.some(entry => entry.id === activeEntryId)) return;
    activeEntryId = entries.length > 0 ? entries[0].id : null;
  }

  function activeEntry(state, myId) {
    return visibleEntries(state, myId).find(entry => entry.id === activeEntryId) ?? null;
  }

  function openCreateDialog() {
    showInfoEntryDialog({
      mode: 'create',
      participants: store.state.participants || {},
      myParticipantId: getCurrentParticipantId(),
      onConfirm: ({ title, sections }) => {
        const id = generateInfoEntryId();
        store.dispatch('ADD_INFO_ENTRY', {
          id,
          title,
          // 表示名未設定（ゲスト）ならnull＝誰でも編集できる情報になる
          ownerId: getCurrentParticipantId(),
          sections: sections.map(section => ({ ...section, id: generateInfoSectionId() }))
        });
        activeEntryId = id;
        render(store.state);
      }
    });
  }

  function renderTabs(state, myId) {
    tabRow.innerHTML = '';

    visibleEntries(state, myId).forEach(entry => {
      const sections = visibleSections(entry, myId);
      const restricted = sections.filter(section => isRestricted(section.audience));

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'info-panel-tab';
      btn.classList.toggle('is-active', entry.id === activeEntryId);
      // 限定公開が混ざっていることは、チャットタブと同じく鍵で示す
      btn.textContent = (restricted.length > 0 ? '🔒' : '') + entryLabel(entry);
      btn.title = [
        entryLabel(entry),
        ...restricted.map(section => describeAudience(section.audience, state.participants))
      ].join('\n');
      btn.addEventListener('click', () => {
        activeEntryId = entry.id;
        render(store.state);
      });
      tabRow.appendChild(btn);
    });

    // 追加は誰でもできる（GM以外も情報を作って開示できるのがこの機能の前提）
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'info-panel-tab-add';
    addBtn.textContent = '＋';
    addBtn.title = '情報を追加';
    addBtn.addEventListener('click', openCreateDialog);
    tabRow.appendChild(addBtn);
  }

  function renderSections(state, myId) {
    sectionsEl.innerHTML = '';

    const entry = activeEntry(state, myId);
    if (!entry) {
      const empty = document.createElement('p');
      empty.className = 'info-panel-empty';
      empty.textContent = '表示できる情報がありません。「＋」から追加できます。';
      sectionsEl.appendChild(empty);
      return;
    }

    visibleSections(entry, myId).forEach(section => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'info-panel-section';

      // 見出し（表／裏など）か、限定公開の目印が要るときだけ帯を出す。見出し無しの
      // 区画1つだけ＝ただのメモのときは、余計な行を足さない。
      if (section.label.trim() !== '' || isRestricted(section.audience)) {
        const head = document.createElement('div');
        head.className = 'info-panel-section-head';
        head.textContent = (isRestricted(section.audience) ? '🔒' : '') + section.label;
        head.title = describeAudience(section.audience, state.participants);
        sectionEl.appendChild(head);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'info-panel-section-body';
      // 他クライアントから同期されてくるユーザー入力なので、必ずtextContentで入れる
      // （改行はCSSのwhite-space:pre-wrapで見せる）
      bodyEl.textContent = section.body;
      sectionEl.appendChild(bodyEl);

      sectionsEl.appendChild(sectionEl);
    });
  }

  function renderFooter(state, myId) {
    const entry = activeEntry(state, myId);
    const editable = canEditEntry(entry, myId, isGm(state.participants, myId));

    // 押せない理由が分かるよう、消さずに無効化して理由をツールチップに出す
    [editBtn, audienceBtn, removeBtn].forEach(btn => {
      btn.disabled = !entry || !editable;
      btn.title = !entry ? '' : (editable ? '' : EDIT_DENIED_REASON);
    });
  }

  function render(state) {
    const myId = getCurrentParticipantId();
    ensureActiveEntryVisible(state, myId);
    renderTabs(state, myId);
    renderSections(state, myId);
    renderFooter(state, myId);
  }

  editBtn.addEventListener('click', () => {
    const myId = getCurrentParticipantId();
    const entry = activeEntry(store.state, myId);
    if (!entry) return;
    if (!canEditEntry(entry, myId, isGm(store.state.participants, myId))) return;

    // 自分に見える区画だけを渡す。見えない区画（自分が対象外の裏など）は編集画面に
    // 出てこないので、知らないうちに書き換えたり消したりすることがない。
    showInfoEntryDialog({
      mode: 'edit',
      title: entry.title,
      sections: visibleSections(entry, myId),
      participants: store.state.participants || {},
      myParticipantId: myId,
      onConfirm: ({ title, sections, removedSectionIds }) => {
        // 先に追加・更新、あとから削除の順で送る。逆にすると「1つ消して1つ足す」編集で、
        // 消す時点の区画が1つになって最後の1つを守るガードに引っかかってしまう。
        store.dispatch('UPDATE_INFO_ENTRY', {
          id: entry.id,
          title,
          sections: sections.map(section => (
            section.id ? section : { ...section, id: generateInfoSectionId() }
          ))
        });
        removedSectionIds.forEach(sectionId => {
          store.dispatch('REMOVE_INFO_SECTION', { id: entry.id, sectionId });
        });
      }
    });
  });

  // 公開先だけを手早く変える経路。区画が複数ある情報（表／裏）では、まずどの区画かを選ぶ
  // ——「裏を1人に開示する」のような、卓中に一番よく起きる操作をここで済ませるため。
  function openAudienceDialog(entry, section, myId) {
    const sectionName = section.label.trim() ? `「${section.label.trim()}」` : '';
    showAudienceDialog({
      title: `情報の公開先${sectionName}`,
      description: `「${entryLabel(entry)}」${sectionName}を誰に見せるかを選びます。`
        + '公開先に入っていない人には、この区画があること自体が表示されません。',
      audience: section.audience,
      participants: store.state.participants || {},
      myParticipantId: myId,
      onConfirm: (audience) => {
        store.dispatch('SET_INFO_SECTION_AUDIENCE', { id: entry.id, sectionId: section.id, audience });
      }
    });
  }

  audienceBtn.addEventListener('click', () => {
    const myId = getCurrentParticipantId();
    const entry = activeEntry(store.state, myId);
    if (!entry) return;
    if (!canEditEntry(entry, myId, isGm(store.state.participants, myId))) return;

    const sections = visibleSections(entry, myId);
    if (sections.length === 0) return;
    if (sections.length === 1) {
      openAudienceDialog(entry, sections[0], myId);
      return;
    }

    const rect = audienceBtn.getBoundingClientRect();
    showContextMenu(rect.left, rect.bottom + 4, sections.map((section, index) => ({
      label: (isRestricted(section.audience) ? '🔒' : '')
        + (section.label.trim() || `区画${index + 1}`),
      title: describeAudience(section.audience, store.state.participants),
      onSelect: () => openAudienceDialog(entry, section, myId)
    })));
  });

  removeBtn.addEventListener('click', () => {
    const myId = getCurrentParticipantId();
    const entry = activeEntry(store.state, myId);
    if (!entry) return;
    if (!canEditEntry(entry, myId, isGm(store.state.participants, myId))) return;
    if (!confirm(`情報「${entryLabel(entry)}」を削除します。よろしいですか？`)) return;

    store.dispatch('REMOVE_INFO_ENTRY', { id: entry.id });
  });

  render(store.state);

  EventBus.subscribe('STATE_CHANGED', (state) => {
    if (state.infoEntries === lastRenderedEntriesRef
      && state.participants === lastRenderedParticipantsRef) return;
    lastRenderedEntriesRef = state.infoEntries;
    lastRenderedParticipantsRef = state.participants;
    render(state);
  });

  // 名乗る人が変わると、見えるタブと編集できるかが変わる。状態自体は変わらず上の差分
  // チェックにも引っかからないため、参照キャッシュを捨てて描き直す。
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    lastRenderedEntriesRef = null;
    lastRenderedParticipantsRef = null;
    render(store.state);
  });
}
