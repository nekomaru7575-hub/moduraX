// js/theme.js
// 部屋の画面の表示（暗い／明るい）の切り替え。
// 音量と同じく「見る側の好み」なので同期せず、このブラウザだけの設定として保存する
// （js/audio-player.js の音量と同じ方針）。
//
// 色の値は css/tokens.css の :root（暗い）と :root[data-theme="light"]（明るい）。
// 最初の描画より前に属性を付けるのは js/theme-boot.js の役目で、ここは切り替えと、
// 同じブラウザで開いている他の部屋のタブへの追従を受け持つ。

// js/theme-boot.js にも同じ値を直書きしている（あちらはimportできない）。変えるときは両方。
const THEME_KEY = 'mojulaX:theme';

// アドレスバーなどの色（meta theme-color）。それぞれの --surface-page に合わせる。
const THEME_COLORS = { dark: '#1a1a1a', light: '#f8f5ee' };

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  applyTheme(next);
  try {
    if (next === 'light') localStorage.setItem(THEME_KEY, 'light');
    else localStorage.removeItem(THEME_KEY);
  } catch (e) {
    // 保存できない環境（プライベートモード等）でも、この画面の切り替えだけは効かせる
  }
}

// theme-boot.js が付けた属性に meta theme-color を合わせ（meta は boot の時点ではまだ
// 読まれていない）、以後は他のタブでの切り替えに追従する。
export function initTheme() {
  applyTheme(getTheme());
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY) applyTheme(e.newValue === 'light' ? 'light' : 'dark');
  });
}
