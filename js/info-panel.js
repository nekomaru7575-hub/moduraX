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
// 公開先とは別の軸で、区画の本文の一部の語だけを伏せられる（section.masks）。フタリソウサの
// 「知ってたカード」のように、本文は見せたまま1語ずつ開いていく遊び方のためのもの。伏せている
// 間は文字数が分からないよう伏せ字1文字だけを描き、開くと語がその場に現れる。ここは区画と違って
// 「伏せた語がある」こと自体は隠さない（伏せ字が見えている＝そこに何かある、が出発点なので）。
//
// 編集・削除できるのは作成者(ownerId)とGM。ただしこれは画面側だけの制限で、サーバーは
// 強制しない（js/room-authority.jsのGM限定アクションには入れていない。誰でも作成・開示
// できる機能なので）。同じくjs/visibility.jsの但し書きのとおり、限定公開は「うっかり
// 見えない」ための仕切りであって、状態そのものは今も全クライアントへ配られている。
// 🔒の表示を「守られている」と読み違えないこと。
//
// net-sync.js/round-panel.jsと同様にinitInfoPanel()をexportし、main.jsの初期化から1回だけ呼ぶ。

import { store, setInfoPanelController } from './board-data-driven.js';
import { generateInfoEntryId, generateInfoSectionId, listMaskMarkers } from './game-store.js';
import { EventBus } from './EventBus.js';
import { createFloatingPanel } from './floating-panel.js';
import { showInfoEntryDialog } from './info-entry-dialog.js';
import { showAudienceDialog } from './audience-picker.js';
import { showContextMenu } from './context-menu.js';
import { canView, isGm, isRestricted, describeAudience } from './visibility.js';
import { getCurrentParticipantId } from './local-identity.js';
import { setIconText } from './icons.js';

const EDIT_DENIED_REASON = '作成者とGMだけが編集できます。';
// 編集画面には伏せた語がそのまま並ぶので、見透かせない人には開かせない。削除・公開先は
// 中身が見えないので、こちらの制限は掛けない（下のcanRevealMasksの但し書き参照）。
const PEEK_DENIED_REASON = '伏せた語があるため、作成者とGMだけが編集できます。';

// 「どのタブを見ているか」は各クライアントのローカル状態にする（共有状態に入れると
// 全員のタブが同時に切り替わってしまう。チャットタブのactiveTabIdと同じ扱い）。
let activeEntryId = null;
let lastRenderedEntriesRef = null;
let lastRenderedParticipantsRef = null;

// 引き取り（下のclaimRestoredEntries）の連続失敗を数える。サーバーに断られるとRESYNCで
// 印の付いた状態が戻ってくるため、無条件に撃ち直すと往復し続けてしまう。引き取れたら
// 0に戻すので、入室中に続けて読み込んだ場合もその都度やり直せる。
const MAX_CLAIM_ATTEMPTS = 3;
let claimAttempts = 0;

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

// 伏せた語の中身を画面で見てよいか。canEditEntryの「持ち主がいなければ誰でも」という逃げ道は
// 作らない。あれは「直せる人がいなくなる」のを避けるためのものだが、見透かしで同じことをすると
// 持ち主のいない情報（取り込んだ部屋データなど）の伏せ字が全員に見えてしまう。見えてしまった
// 驚きは取り消せないので、迷ったら見せない側へ倒す。
function canRevealMasks(entry, myId, amGm) {
  if (!entry || !myId) return false; // ゲスト（表示名未設定）は見透かせない
  return amGm || entry.ownerId === myId;
}

function hasMaskedWords(entry, myId) {
  if (!entry) return false;
  return visibleSections(entry, myId).some(section => section.masks.length > 0);
}

// 伏せ字1つぶんの節点を作る。触れる人だけbuttonにして、触れない人にはtitleもcursorも
// 付けない（「何かある」以上の手掛かりを渡さない）。
function buildMaskNode(mask, canReveal, onToggle) {
  const el = document.createElement(canReveal ? 'button' : 'span');
  if (canReveal) el.type = 'button';
  el.className = 'info-mask'
    + (mask.revealed ? ' is-revealed' : '')
    + (!mask.revealed && canReveal ? ' is-peek' : '');

  if (mask.revealed || canReveal) {
    el.textContent = mask.text;
    // 公開済みの語は全員に地の文として見える。押せない人には、伏せ字だったことも言わない
    if (canReveal) {
      el.title = mask.revealed ? '公開済みの語（押すと伏せ直せます）' : '伏せている語（あなたにだけ見えています）';
    }
  } else {
    // 常に伏せ字1つぶん。mask.textの長さには触れない（文字数から語を当てられないように）
    el.textContent = mask.mask;
    el.setAttribute('aria-label', '伏せられた語');
  }

  if (canReveal) el.addEventListener('click', onToggle);
  return el;
}

// 本文を、伏せ字のところで切りながら組み立てる。他クライアントから同期されてくるユーザー入力
// なので、ここでもinnerHTMLは使わない（テキストは必ずtextContent、改行はCSSのpre-wrap）。
function renderSectionBody(bodyEl, section, canReveal, onToggle) {
  const byId = new Map(section.masks.map(mask => [mask.id, mask]));
  const nodes = [];
  let cut = 0;

  listMaskMarkers(section.body).forEach(marker => {
    const mask = byId.get(marker.id);
    // 対応する伏せ語が無い目印はcutを進めない＝次の切れ端に入り、ただの文字として出る
    // （本文は自由入力欄なので、利用者が手で打った {{1}} を黙って消さない）
    if (!mask) return;
    nodes.push(document.createTextNode(section.body.slice(cut, marker.start)));
    nodes.push(buildMaskNode(mask, canReveal, (event) => onToggle(event, section, mask)));
    cut = marker.end;
  });

  if (nodes.length === 0) {
    bodyEl.textContent = section.body; // 伏せ字なし＝従来どおり
    return;
  }
  nodes.push(document.createTextNode(section.body.slice(cut)));
  bodyEl.replaceChildren(...nodes);
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
      if (restricted.length > 0) {
        setIconText(btn, 'lock', entryLabel(entry), '限定公開を含む');
      } else {
        btn.textContent = entryLabel(entry);
      }
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
        if (isRestricted(section.audience)) {
          setIconText(head, 'lock', section.label, '限定公開');
        } else {
          head.textContent = section.label;
        }
        head.title = describeAudience(section.audience, state.participants);
        sectionEl.appendChild(head);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'info-panel-section-body';
      // 本文は他クライアントから同期されてくるユーザー入力。renderSectionBodyが
      // textContentだけで組み立てる（改行はCSSのwhite-space:pre-wrapで見せる）
      renderSectionBody(
        bodyEl,
        section,
        canRevealMasks(entry, myId, isGm(state.participants, myId)),
        (event, targetSection, mask) => openMaskMenu(event, entry, targetSection, mask)
      );
      sectionEl.appendChild(bodyEl);

      sectionsEl.appendChild(sectionEl);
    });
  }

  // 伏せた語を1つ公開する／伏せ直す。取り消しづらい操作（読まれた事実は戻らない）なので、
  // 押しただけでは変えず、公開先ボタンと同じくshowContextMenuで一段挟む。
  function openMaskMenu(event, entry, section, mask) {
    const rect = event.currentTarget.getBoundingClientRect();
    showContextMenu(rect.left, rect.bottom + 4, [{
      label: mask.revealed ? 'この語を伏せ直す' : 'この語を公開する',
      icon: mask.revealed ? 'lock' : 'unlock',
      iconLabel: mask.revealed ? '伏せる' : '公開する',
      onSelect: () => {
        store.dispatch('SET_INFO_MASK_REVEALED', {
          id: entry.id,
          sectionId: section.id,
          maskId: mask.id,
          revealed: !mask.revealed
        });
      }
    }]);
  }

  function renderFooter(state, myId) {
    const entry = activeEntry(state, myId);
    const editable = canEditEntry(entry, myId, isGm(state.participants, myId));
    // 編集画面は伏せた語がそのまま読める覗き窓になるので、伏せ字を持つ情報だけは
    // 見透かせる人にしか開かせない。削除・公開先は中身が見えないので editable のまま
    // （ここまで縛ると、持ち主のいない伏せ字入りの情報が誰にも消せない置き土産になる）。
    const peekable = !hasMaskedWords(entry, myId) || canRevealMasks(entry, myId, isGm(state.participants, myId));

    // 押せない理由が分かるよう、消さずに無効化して理由をツールチップに出す
    [editBtn, audienceBtn, removeBtn].forEach(btn => {
      const allowed = editable && (btn !== editBtn || peekable);
      btn.disabled = !entry || !allowed;
      btn.title = !entry ? '' : (allowed ? '' : (editable ? PEEK_DENIED_REASON : EDIT_DENIED_REASON));
    });
  }

  // 部屋データの読み込みで復元された情報（restoredFromImport）を、GMのものとして引き取る。
  // 読み込んだファイルの公開先は、部屋が変われば誰も名乗れないIDになっている。取り込みの時点
  // （js/state-import.js）では宛先なしに潰してあるので、GMの画面へ届いたここで引き取って
  // 初めて読めるようになる。GMがまだ決まっていない部屋では誰も撃たないので、部屋の作成と
  // 同時に読み込んだ場合は、最初に名乗った人がGMになった瞬間に引き取られる。
  function claimRestoredEntries(state, myId) {
    if (!(state.infoEntries || []).some(entry => entry.restoredFromImport)) {
      claimAttempts = 0; // 引き取り済み。次の読み込みに備えて数え直す
      return false;
    }
    if (claimAttempts >= MAX_CLAIM_ATTEMPTS) return false;
    if (!myId || !isGm(state.participants, myId)) return false;

    claimAttempts += 1;
    store.dispatch('CLAIM_RESTORED_INFO', { participantId: myId });
    return true;
  }

  function render(state) {
    const myId = getCurrentParticipantId();
    // 引き取ると状態が変わり、その通知で描き直されるので、ここでは描かずに譲る
    if (claimRestoredEntries(state, myId)) return;
    ensureActiveEntryVisible(state, myId);
    // 本文は毎回作り直すので、そのままだと語を1つ公開するたびに先頭までスクロールが戻る。
    // 伏せ字は本文の途中を何度も操作するため、位置を持ち越す。
    const scrollTop = sectionsEl.scrollTop;
    renderTabs(state, myId);
    renderSections(state, myId);
    renderFooter(state, myId);
    sectionsEl.scrollTop = scrollTop;
  }

  editBtn.addEventListener('click', () => {
    const myId = getCurrentParticipantId();
    const entry = activeEntry(store.state, myId);
    if (!entry) return;
    const amGm = isGm(store.state.participants, myId);
    if (!canEditEntry(entry, myId, amGm)) return;
    // renderFooterと同じ判定。伏せた語は編集画面にそのまま並ぶので、見透かせない人には開かない
    if (hasMaskedWords(entry, myId) && !canRevealMasks(entry, myId, amGm)) return;

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
      label: section.label.trim() || `区画${index + 1}`,
      icon: isRestricted(section.audience) ? 'lock' : '',
      iconLabel: '限定公開',
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
  // 引き取りの失敗数もここで0に戻す：サーバーは名乗りが通っていない接続からのGM限定操作を
  // 断るので、名乗りが通った（IDENTITY_ACCEPTED）この機会に必ずやり直す。
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    claimAttempts = 0;
    lastRenderedEntriesRef = null;
    lastRenderedParticipantsRef = null;
    render(store.state);
  });

  // 狭幅レイアウトで中央スペースへはめ込むため、パネル本体をjs/main.jsへ返す
  return panel;
}
