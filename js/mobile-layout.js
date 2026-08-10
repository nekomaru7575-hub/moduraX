// js/mobile-layout.js
// 狭幅（スマホ）向けの縦積みレイアウト。
//
//   ┌ タイトル ♪ ⋮ ┐  .app-header
//   │                │
//   │  中央スペース  │  #mobileStage … 盤面／チャット／キャラ一覧／
//   │                │                 パレット／情報のどれか1つ
//   └ [切り替えタブ] ┘  #mobileStageTabs
//
// 上部の細いヘッダーと、残り全部の2分割。チャット（ログ＋入力欄）も常時表示をやめて
// タブの1つにしてある。常時表示だと下段だけで340px近くを固定的に取られ、
// どのタブも半分以下の高さしか使えなかったため（特にチャットパレットの編集欄）。
//
// PC幅では何もしない。狭幅に入ったときだけ、盤面(.board-area)・チャット(.control-area)・
// 3枚の浮動パネルを中央スペースへ移す。PC幅へ戻れば元の場所へ返す。
// 見た目の切り替え自体はCSS（combined_layout.htmlの@media）が持ち、ここは
// DOMの置き場所とタブの状態だけを扱う。

import { EventBus } from './EventBus.js';

const MOBILE_QUERY = '(max-width: 900px)';
const ACTIVE_VIEW_KEY = 'mobileActiveView';

// MediaQueryListはどこからも参照されなくなるとリスナーごと回収されうるので、
// モジュールスコープで持ち続ける。
let mobileQuery = null;

const BOARD_VIEW_ID = 'board';
const CHAT_VIEW_ID = 'chat';

// これ以上はバッジに収まらないので丸める
const UNREAD_CAP = 99;

function countLogEntries(state) {
  return Object.values(state?.chatLogs ?? {}).reduce((total, entries) => total + entries.length, 0);
}

function loadActiveViewId() {
  try {
    return sessionStorage.getItem(ACTIVE_VIEW_KEY);
  } catch {
    return null;
  }
}

function saveActiveViewId(viewId) {
  try {
    sessionStorage.setItem(ACTIVE_VIEW_KEY, viewId);
  } catch {
    // sessionStorageが使えない環境では覚えない（既定の盤面から始まる）
  }
}

/**
 * @param {{ panels: { id: string, label: string, panel: { element: HTMLElement, dock: (c: HTMLElement) => void, undock: () => void } }[] }} options
 *   panels: 中央スペースへはめ込む浮動パネル。並べた順にタブが出る。
 */
export function initMobileLayout({ panels = [] } = {}) {
  const mainArea = document.querySelector('.main-area');
  const boardArea = document.querySelector('.board-area');
  const controlArea = document.querySelector('.control-area');
  if (!mainArea || !boardArea || !controlArea) return;

  const views = [
    { id: BOARD_VIEW_ID, label: '盤面', element: boardArea, panel: null },
    { id: CHAT_VIEW_ID, label: 'チャット', element: controlArea, panel: null },
    ...panels.map(({ id, label, panel }) => ({ id, label, element: panel.element, panel }))
  ];

  const stage = document.createElement('div');
  stage.id = 'mobileStage';

  const tabs = document.createElement('div');
  tabs.id = 'mobileStageTabs';

  const savedViewId = loadActiveViewId();
  let activeViewId = views.some(v => v.id === savedViewId) ? savedViewId : BOARD_VIEW_ID;
  let mobile = false;

  // チャットタブだけ、非表示の間に増えたログの件数をバッジで出す
  let unreadCount = 0;
  let lastLogTotal = null;
  let unreadBadge = null;

  const tabButtons = views.map((view) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-stage-tab';

    const labelEl = document.createElement('span');
    labelEl.textContent = view.label;
    btn.appendChild(labelEl);

    if (view.id === CHAT_VIEW_ID) {
      unreadBadge = document.createElement('span');
      unreadBadge.className = 'mobile-stage-tab-badge';
      unreadBadge.hidden = true;
      btn.appendChild(unreadBadge);
    }

    btn.addEventListener('click', () => setActiveView(view.id));
    tabs.appendChild(btn);
    return btn;
  });

  function renderUnreadBadge() {
    if (!unreadBadge) return;
    unreadBadge.hidden = unreadCount === 0;
    unreadBadge.textContent = unreadCount > UNREAD_CAP ? `${UNREAD_CAP}+` : String(unreadCount);
  }

  function applyActiveView() {
    views.forEach((view, index) => {
      const isActive = view.id === activeViewId;
      view.element.classList.toggle('is-active', isActive);
      tabButtons[index].classList.toggle('is-active', isActive);
    });
  }

  function setActiveView(viewId) {
    activeViewId = viewId;
    saveActiveViewId(viewId);
    applyActiveView();

    // 隠れている間はビューポートの大きさが0なので、盤面へ戻った瞬間に
    // 背景の再計算とパンの丸め直しが要る。既にresizeで同じことをしているので相乗りする
    // （js/board-data-driven.jsのresizeハンドラ）。
    if (viewId === BOARD_VIEW_ID) window.dispatchEvent(new Event('resize'));

    if (viewId === CHAT_VIEW_ID) {
      unreadCount = 0;
      renderUnreadBadge();

      // 隠れている間は高さが0でスクロール位置が保てないので、最新の発言まで送り直す
      const logContainer = document.getElementById('logContainer');
      if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  function enterMobile() {
    if (mobile) return;
    mobile = true;

    mainArea.insertBefore(stage, mainArea.firstChild);
    mainArea.insertBefore(tabs, stage.nextSibling);

    views.forEach((view) => {
      stage.appendChild(view.element);
      view.panel?.dock(stage);
    });

    document.body.classList.add('is-mobile');
    applyActiveView();
    window.dispatchEvent(new Event('resize'));
  }

  function leaveMobile() {
    if (!mobile) return;
    mobile = false;

    document.body.classList.remove('is-mobile');

    // 盤面とチャットは.main-areaへ元の並び（盤面→チャット）で、浮動パネルはbody直下へ返す。
    // ここでは末尾に足していき、あとでstage/tabsを外すことで元の2要素だけが残る。
    views.forEach((view) => {
      view.element.classList.remove('is-active');
      if (view.panel) {
        view.panel.undock();
      } else {
        mainArea.appendChild(view.element);
      }
    });

    stage.remove();
    tabs.remove();

    // PC幅ではログが常に見えているので、未読という概念が無くなる
    unreadCount = 0;
    renderUnreadBadge();

    window.dispatchEvent(new Event('resize'));
  }

  // 発言が増えたことに気づけるよう、チャットタブを見ていない間の件数を数える。
  // 全タブの合計で見るので、別のチャットタブ（雑談など）への発言も拾える。
  EventBus.subscribe('STATE_CHANGED', (state) => {
    const total = countLogEntries(state);
    const previous = lastLogTotal;
    lastLogTotal = total;

    // 初回は基準を作るだけ。減ったとき（ログの消去）は未読にしない。
    if (previous === null || total <= previous) return;
    if (!mobile || activeViewId === CHAT_VIEW_ID) return;

    unreadCount += total - previous;
    renderUnreadBadge();
  });

  // 入室時にサーバーから届く既存ログ（数十件あることもある）を未読として数えないよう、
  // 全体を受け取り直したところで基準を引き直す。再接続で届き直した場合も同じ扱いにする。
  EventBus.subscribe('NET_INITIALIZED', (state) => {
    lastLogTotal = countLogEntries(state);
    unreadCount = 0;
    renderUnreadBadge();
  });

  mobileQuery = window.matchMedia(MOBILE_QUERY);
  const sync = () => (mobileQuery.matches ? enterMobile() : leaveMobile());

  mobileQuery.addEventListener('change', sync);
  // changeの取りこぼしに備えた保険。enterMobile/leaveMobileは現在の状態と同じなら
  // 何もしないので、resizeのたびに呼んでも無駄な組み替えは起きない。
  window.addEventListener('resize', sync);
  sync();
}
