// js/resizable-stack.js
// 縦に並んだ複数セクション（[data-resizable-section]を持つ要素）の間に
// ドラッグハンドルを挿入し、高さをユーザーが調整できるようにする汎用ユーティリティ。
// サイズはブラウザ単位（localStorage）で保存し、次回起動時も復元する。

import { bindDragGesture } from './drag-gesture.js';

function loadSizes(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const sizes = raw ? JSON.parse(raw) : null;
    return Array.isArray(sizes) ? sizes : null;
  } catch {
    return null;
  }
}

function saveSizes(storageKey, sizes) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(sizes));
  } catch {
    // localStorageが使えない環境では保存を諦める
  }
}

function applySize(section, size) {
  section.style.flex = `0 0 ${size}px`;
}

/**
 * @param {{ container: HTMLElement, storageKey: string, minSize?: number }} options
 */
export function makeResizableStack({ container, storageKey, minSize = 60 }) {
  const sections = Array.from(container.querySelectorAll('[data-resizable-section]'));
  if (sections.length < 2) return;

  const saved = loadSizes(storageKey);
  const containerHeight = container.getBoundingClientRect().height || sections.length * 200;
  const defaultSize = Math.max(minSize, Math.floor(containerHeight / sections.length));

  sections.forEach((section, index) => {
    applySize(section, saved?.[index] ?? defaultSize);
  });

  for (let i = 0; i < sections.length - 1; i++) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    sections[i].insertAdjacentElement('afterend', handle);

    const before = sections[i];
    const after = sections[i + 1];

    bindDragGesture(handle, {
      onStart: (event) => {
        handle.classList.add('dragging');

        const startBeforeSize = before.getBoundingClientRect().height;
        const startAfterSize = after.getBoundingClientRect().height;

        return {
          startY: event.clientY,
          startBeforeSize,
          // ドラッグ中はこの2区画の合計を保つ
          total: startBeforeSize + startAfterSize
        };
      },

      onMove: (event, { startY, startBeforeSize, total }) => {
        const delta = event.clientY - startY;
        const nextBefore = Math.max(minSize, Math.min(startBeforeSize + delta, total - minSize));

        applySize(before, nextBefore);
        applySize(after, total - nextBefore);
      },

      onEnd: () => {
        handle.classList.remove('dragging');
        saveSizes(storageKey, sections.map(s => Math.round(s.getBoundingClientRect().height)));
      }
    });
  }
}
