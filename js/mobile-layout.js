// js/mobile-layout.js
// 狭幅（スマホ）向けの縦積みレイアウト。
//
//   ┌ タイトル ♪ ⋮ ┐  .app-header
//   │  中央スペース  │  #mobileStage … 盤面／キャラ一覧／パレット／情報のどれか1つ
//   │  [切り替えタブ] │  #mobileStageTabs
//   │   ログ表示      │  .log-section
//   └ チャット入力  ┘  .chat-send-panel
//
// PC幅では何もしない。狭幅に入ったときだけ、盤面(.board-area)と3枚の浮動パネルを
// 中央スペースへ移し、タブで切り替えられるようにする。PC幅へ戻れば元の場所へ返す。
// 見た目の切り替え自体はCSS（combined_layout.htmlの@media）が持ち、ここは
// DOMの置き場所とタブの状態だけを扱う。

const MOBILE_QUERY = '(max-width: 900px)';
const ACTIVE_VIEW_KEY = 'mobileActiveView';

// MediaQueryListはどこからも参照されなくなるとリスナーごと回収されうるので、
// モジュールスコープで持ち続ける。
let mobileQuery = null;

const BOARD_VIEW_ID = 'board';

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
  if (!mainArea || !boardArea) return;

  const views = [
    { id: BOARD_VIEW_ID, label: '盤面', element: boardArea, panel: null },
    ...panels.map(({ id, label, panel }) => ({ id, label, element: panel.element, panel }))
  ];

  const stage = document.createElement('div');
  stage.id = 'mobileStage';

  const tabs = document.createElement('div');
  tabs.id = 'mobileStageTabs';

  const savedViewId = loadActiveViewId();
  let activeViewId = views.some(v => v.id === savedViewId) ? savedViewId : BOARD_VIEW_ID;
  let mobile = false;

  const tabButtons = views.map((view) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-stage-tab';
    btn.textContent = view.label;
    btn.addEventListener('click', () => setActiveView(view.id));
    tabs.appendChild(btn);
    return btn;
  });

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

    // 盤面は.main-areaの先頭へ、浮動パネルはbody直下へ返す
    views.forEach((view) => {
      view.element.classList.remove('is-active');
      if (view.panel) {
        view.panel.undock();
      } else {
        mainArea.insertBefore(view.element, mainArea.firstChild);
      }
    });

    stage.remove();
    tabs.remove();
    window.dispatchEvent(new Event('resize'));
  }

  mobileQuery = window.matchMedia(MOBILE_QUERY);
  const sync = () => (mobileQuery.matches ? enterMobile() : leaveMobile());

  mobileQuery.addEventListener('change', sync);
  // changeの取りこぼしに備えた保険。enterMobile/leaveMobileは現在の状態と同じなら
  // 何もしないので、resizeのたびに呼んでも無駄な組み替えは起きない。
  window.addEventListener('resize', sync);
  sync();
}
