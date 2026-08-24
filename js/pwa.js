// js/pwa.js
// 「ホーム画面／デスクトップへのアプリとして追加」まわり。Service Workerの登録と、
// 部屋一覧に出す追加の導線だけを持つ（キャッシュ方針そのものは sw.js 側）。
//
// インストールすると何が変わるか：アドレスバーとタブが消えて全画面になり、
// アプリ一覧・ホーム画面からアイコンで起動できる。盤面の縦の広さが素直に効くので、
// スマホでは体感がかなり変わる。
//
// 注意（iOS）：ホーム画面に追加したものは、Safariとストレージが別枠になる。
// このアプリの参加者ID・チャットパレット・覚えた入室パスワードはすべてlocalStorage
// なので、Safariで使っていた内容は引き継がれず「別のデバイス」として振る舞う。

import { setIcon, setIconText } from './icons.js';

const HINT_DISMISSED_KEY = 'mojulaX:pwaHintDismissed';

// すでにインストール済みの状態で開かれているか。
// display-modeが標準の見方で、navigator.standaloneはiOSだけが持つ古い作り。
function isInstalled() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  return window.navigator.standalone === true;
}

// iOSは beforeinstallprompt を実装していないので、こちらから手順を案内するしかない。
// iPadOSはUAがMacを名乗るため、タッチ点の数で見分ける。
function isIos() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function hintDismissed() {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === '1';
  } catch {
    // プライベートモード等でlocalStorageが触れないことがある。案内は出す側に倒す。
    return false;
  }
}

function dismissHint() {
  try {
    localStorage.setItem(HINT_DISMISSED_KEY, '1');
  } catch {
    // 覚えられなくても案内を閉じる動作自体は成立させる
  }
}

// --- Service Workerの登録 ---
// 失敗しても画面は普通に動く（sw.jsはコードをキャッシュしないので、居ても居なくても
// 表示は同じ）。なのでエラーは投げ直さず、コンソールに残すだけにする。
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // SWはhttpsか localhost でしか動かない。それ以外（LAN内のIP直打ちでの動作確認等）では
  // 登録に失敗して例外が出るだけなので、はじめから呼ばない。
  const secure = window.isSecureContext;
  if (!secure) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[pwa] Service Workerの登録に失敗しました', err);
    });
  });
}

// --- 部屋一覧に出す「アプリとして追加」の導線 ---

// Chrome/Edge（PC・Android）が「今なら入れられる」と判断したときに渡してくるイベント。
// これを取っておいて、ユーザーがボタンを押した時点でprompt()する。
// モジュールの評価より先に飛んでくることがあるので、待ち受けはファイルの読み込み時点で張る。
let deferredPrompt = null;
let onPromptAvailable = null;

window.addEventListener('beforeinstallprompt', (event) => {
  // 既定のミニ情報バーを止めて、こちらのボタンに寄せる
  event.preventDefault();
  deferredPrompt = event;
  if (onPromptAvailable) onPromptAvailable();
});

function createInstallButton(container) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-secondary';
  setIconText(button, 'install', 'アプリとして追加');
  button.style.marginLeft = '12px';

  button.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    // prompt()は1つのイベントに対して一度しか呼べない。押した時点で手放す。
    deferredPrompt = null;
    button.remove();
    try {
      await prompt.prompt();
    } catch (err) {
      console.warn('[pwa] インストールの確認を出せませんでした', err);
    }
  });

  container.appendChild(button);
  return button;
}

function createIosHint(container) {
  const hint = document.createElement('p');
  hint.style.color = '#aaa';
  hint.style.fontSize = '0.85rem';
  hint.style.margin = '8px 0 0';
  hint.style.lineHeight = '1.6';
  setIconText(hint, 'install', '共有ボタン →「ホーム画面に追加」で、アプリとして全画面で使えます。');

  const close = document.createElement('button');
  close.type = 'button';
  setIcon(close, 'close');
  close.setAttribute('aria-label', 'この案内を閉じる');
  close.style.background = 'none';
  close.style.border = 'none';
  close.style.color = '#888';
  close.style.cursor = 'pointer';
  close.style.marginLeft = '6px';
  close.style.fontSize = '0.85rem';
  close.addEventListener('click', () => {
    dismissHint();
    hint.remove();
  });

  hint.appendChild(close);
  container.appendChild(hint);
}

// 部屋一覧（index.html）から呼ぶ。containerはヘッダーのリンク行（.header-links）。
export function mountInstallPrompt(container) {
  if (!container) return;
  // 入れて開いている人に「追加」を見せても意味が無い
  if (isInstalled()) return;

  if (isIos()) {
    if (!hintDismissed()) createIosHint(container);
    return;
  }

  // Chrome/Edgeの経路。beforeinstallpromptは条件が揃うまで飛んでこないので、
  // 来たときに初めてボタンを出す（来なければ何も出ない＝すでに入っている・非対応など）。
  if (deferredPrompt) {
    createInstallButton(container);
  } else {
    onPromptAvailable = () => {
      onPromptAvailable = null;
      createInstallButton(container);
    };
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    onPromptAvailable = null;
  });
}
