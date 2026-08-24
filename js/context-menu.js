// js/context-menu.js
// 汎用の右クリックコンテキストメニュー。
// 表示位置と項目リストだけを受け取り、DOM生成・後片付けを担当する。
// 項目の中身（何ができるか）は呼び出し側が決める。

import { setIconText } from './icons.js';

let currentMenuEl = null;

function closeContextMenu() {
  if (currentMenuEl) {
    currentMenuEl.remove();
    currentMenuEl = null;
    document.removeEventListener('pointerdown', onOutsideClick);
    document.removeEventListener('keydown', onEscape);
  }
}

function onOutsideClick(event) {
  if (currentMenuEl && !currentMenuEl.contains(event.target)) {
    closeContextMenu();
  }
}

function onEscape(event) {
  if (event.key === 'Escape') closeContextMenu();
}

/**
 * @param {number} x クライアントX座標
 * @param {number} y クライアントY座標
 * @param {{label: string, onSelect: () => void, danger?: boolean, disabled?: boolean,
 *   title?: string, icon?: string, iconLabel?: string}[]} items
 *   disabled: 押せない項目として出す（項目ごと消すと「なぜ出ないのか」が分からないため、
 *   権限が無くてできない操作はtitleに理由を入れてこちらで示す）。
 *   icon: js/icons.js のアイコン名。labelの前に置く。文字に書かれていない意味を
 *   アイコンが持つとき（鍵＝限定公開など）は iconLabel に読み上げ用の語を渡す。
 */
export function showContextMenu(x, y, items) {
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
    if (item.icon) {
      setIconText(btn, item.icon, item.label, item.iconLabel || '');
    } else {
      btn.textContent = item.label;
    }
    if (item.title) btn.title = item.title;

    if (item.disabled) {
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => {
        closeContextMenu();
        item.onSelect();
      });
    }
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  currentMenuEl = menu;

  // 画面端でメニューがはみ出さないよう補正
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 8}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  }

  // 開いた瞬間のclickで即閉じないよう、少し遅らせて監視開始。
  // mousedownではなくpointerdownで見るのは、タッチでは前者が発火せず
  // 「外側をタップしてもメニューが閉じない」状態になるため。
  setTimeout(() => {
    document.addEventListener('pointerdown', onOutsideClick);
    document.addEventListener('keydown', onEscape);
  }, 0);
}