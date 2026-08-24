// js/site-nav.js
// 部屋の外にある3ページ（部屋入口・コマ作成ツール・このサービスについて）の行き来。
// 各ページのヘッダー右上に置いた「⋯」に、3つの行き先をまとめる。
//
// 【なぜまとめたか】以前はページごとに導線がばらばらで、コマ作成ツールからは
// 「このサービスについて」へ行けず、その逆も同じだった。置き場所も見た目も
// 揃っていなかったので、部屋の画面が右上の「⋮」に操作を集めているのと同じ形にした。
//
// 【部屋の画面（combined_layout.html）は対象外】部屋の中は自前のルームメニューを持って
// いて、そちらから「このサービスについて」は意図的に外してある（セッション中に法務文書へ
// 飛ぶ導線は要らない）。このファイルは部屋のページからは読み込まない。
//
// 【自分で動く】読み込まれた時点で下のinitが走る。#siteMenuBtn が無いページでは
// 何もしないので、間違って読み込んでも害は無い。

import { setIcon } from './icons.js';
import { showContextMenu } from './context-menu.js';

// 並び順がそのままメニューの並び順。行き先を増やすならここに1行足す。
const PAGES = [
  { id: 'index', label: '部屋入口', href: '/' },
  { id: 'builder', label: 'コマ作成ツール', href: '/character-builder.html' },
  { id: 'notes', label: 'リリースノート', href: '/release-notes.html' },
  { id: 'about', label: 'このサービスについて', href: '/about.html' }
];

// 今どのページを見ているか。サーバーは '/' を index.html として配る
// （server/index.js の relativePath）ので、両方を部屋入口として扱う。
function currentPageId() {
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') return 'index';
  if (path === '/character-builder.html') return 'builder';
  if (path === '/release-notes.html') return 'notes';
  if (path === '/about.html') return 'about';
  return '';
}

function init() {
  const btn = document.getElementById('siteMenuBtn');
  if (!btn) return;

  setIcon(btn, 'more');

  const here = currentPageId();

  btn.addEventListener('click', () => {
    const rect = btn.getBoundingClientRect();
    // 画面端からはみ出したときの寄せ直しは showContextMenu 側が持っている
    showContextMenu(rect.left, rect.bottom + 4, PAGES.map(page => ({
      label: page.label,
      // 今いるページには印を付けて押せなくする。項目ごと消さないのは、3つの並びが
      // どのページでも同じ位置に出る方が覚えやすいため。印の無い行にも同じ幅の
      // 場所取り（blank）を置いて、名前の頭を揃える（js/mobile-layout.jsと同じ）。
      icon: page.id === here ? 'check' : 'blank',
      iconLabel: page.id === here ? '表示中' : '',
      disabled: page.id === here,
      title: page.id === here ? '今このページです' : undefined,
      onSelect: () => { window.location.href = page.href; }
    })));
  });
}

init();
