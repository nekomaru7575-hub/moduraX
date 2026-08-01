// js/parameters/saikoro-fiction/skill-table-box.js
// サイコロ・フィクション共通の「特技表」ボックス。表の中身（特技名・分野名）は一切持たず、
// 呼び出し元から渡された spec をそのまま描画する。
// dx3-effect-box.js と同じ規約で、モジュールスコープに<dialog>を1つ持ち回す。

import {
  makeCellId, getCell, isAcquired, isGapFilled, toggleAcquired, toggleGap, resolveSkillCheck
} from './skill-table.js';
import { describeSkillCheck, buildSkillCheckCommand } from './skill-check.js';

let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('dialog');
  dialogEl.className = 'character-dialog sf-skill-table-dialog';
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @param {{
 *   spec: object,                createSkillTableSpec() の戻り値
 *   state: {acquired:string[], filledGaps:number[]},  normalizeSkillTableState 済みのもの
 *   title?: string,
 *   editable?: boolean,          特技の取得・ギャップの塗りつぶしを編集できるか
 *   onSave?: (state) => void,    トグルするたびに即座に呼ばれる（保存ボタンは無い）
 *   onCheck?: (cellId) => void   判定モードでセルがクリックされた時。未指定なら判定モードを出さない
 * }} options
 */
export function showSkillTableBox({ spec, state, title = '特技表', editable = true, onSave, onCheck }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const canEdit = editable && typeof onSave === 'function';
  const canCheck = typeof onCheck === 'function';
  // 判定できるならまず判定モード。編集専用なら編集モード。
  let mode = canCheck ? 'check' : 'edit';

  // トグルのたびに onSave へ流す（コマ更新ダイアログ側で SET_COMPONENT され、
  // 他の参加者にも即座に同期される）。保存ボタンで溜めるとモード切替時に迷子になるため。
  let current = { acquired: [...state.acquired], filledGaps: [...state.filledGaps] };
  const commit = next => {
    current = next;
    onSave?.(current);
    render();
  };

  const form = document.createElement('form');
  form.method = 'dialog';

  const titleEl = document.createElement('h3');
  form.appendChild(titleEl);

  // モード切替（判定できる時だけ出す）
  const modeRow = document.createElement('div');
  modeRow.className = 'sf-skill-table-modes';
  const modeButtons = {};
  if (canCheck && canEdit) {
    [['check', '判定する'], ['edit', '取得を編集']].forEach(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sf-skill-table-mode-btn';
      button.textContent = label;
      button.addEventListener('click', () => { mode = value; render(); });
      modeButtons[value] = button;
      modeRow.appendChild(button);
    });
    form.appendChild(modeRow);
  }

  const grid = document.createElement('div');
  grid.className = 'sf-skill-table-grid';
  // 先頭は出目のラベル列。以降は［ギャップ／分野］の繰り返し。
  grid.style.gridTemplateColumns = `auto repeat(${spec.columns.length}, 14px minmax(0, 1fr))`;
  form.appendChild(grid);

  if (spec.cyclic) {
    const note = document.createElement('div');
    note.className = 'sf-skill-table-note';
    const first = spec.columns[0].label;
    const last = spec.columns[spec.columns.length - 1].label;
    note.textContent = `表の左右は繋がっています（${last} の右隣は ${first}）。左端のギャップがその境目です。`;
    form.appendChild(note);
  }

  const status = document.createElement('div');
  status.className = 'sf-skill-table-status';
  form.appendChild(status);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'dialog-add-row-btn';
  copyBtn.textContent = '判定コマンドをコピー';
  copyBtn.title = '取得済み特技の「特技判定(名前)」をまとめてコピーします。チャットパレットに貼り付けて使えます。';
  copyBtn.addEventListener('click', () => {
    const lines = current.acquired
      .map(cellId => getCell(spec, cellId))
      .filter(Boolean)
      .map(cell => buildSkillCheckCommand(cell.name));
    if (lines.length === 0) {
      setStatus('取得している特技がありません。');
      return;
    }
    navigator.clipboard?.writeText(lines.join('\n'))
      .then(() => setStatus(`${lines.length}件のコマンドをコピーしました。`))
      .catch(() => setStatus('コピーに失敗しました。'));
  });
  btnRow.appendChild(copyBtn);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.textContent = '閉じる';
  closeBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(closeBtn);

  form.appendChild(btnRow);
  dialog.appendChild(form);

  function setStatus(text) {
    status.textContent = text;
  }

  function defaultStatus() {
    if (mode === 'edit') {
      setStatus(spec.gapFillable
        ? 'マスをクリックで取得／解除、ギャップ（細い縦帯）をクリックで塗りつぶし。変更は即座に保存されます。'
        : 'マスをクリックで取得／解除。変更は即座に保存されます。');
    } else {
      setStatus('判定したい特技のマスをクリックしてください（カーソルを乗せると目標値が出ます）。');
    }
  }

  function previewStatus(cellId) {
    const resolution = resolveSkillCheck(spec, current, cellId);
    if (!resolution) return;
    setStatus(describeSkillCheck(resolution));
  }

  function render() {
    titleEl.textContent = `${title}（取得 ${current.acquired.length}件）`;

    Object.entries(modeButtons).forEach(([value, button]) => {
      button.classList.toggle('is-active', mode === value);
    });

    grid.innerHTML = '';
    grid.classList.toggle('is-check-mode', mode === 'check');

    // 見出し行：左上は空欄、以降は分野名
    const corner = document.createElement('div');
    corner.className = 'sf-skill-table-corner';
    corner.style.gridColumn = '1';
    corner.style.gridRow = '1';
    grid.appendChild(corner);

    spec.columns.forEach((column, colIndex) => {
      const header = document.createElement('div');
      header.className = 'sf-skill-table-header';
      header.textContent = column.label;
      header.style.gridColumn = String(3 + colIndex * 2);
      header.style.gridRow = '1';
      grid.appendChild(header);
    });

    // ギャップ：全行をまたぐ1本の縦帯にして、どこを押しても同じギャップをトグルできるようにする。
    // gap[i] は「列iの左」。円環でない表では gap[0]（＝表の左端）は存在しないので出さない。
    spec.columns.forEach((_column, gapIndex) => {
      if (gapIndex === 0 && !spec.cyclic) return;
      const gap = document.createElement('div');
      const filled = isGapFilled(current, gapIndex);
      gap.className = `sf-skill-gap${filled ? ' is-filled' : ''}`;
      gap.style.gridColumn = String(2 + gapIndex * 2);
      gap.style.gridRow = `2 / span ${spec.rows.length}`;
      const leftLabel = spec.columns[(gapIndex - 1 + spec.columns.length) % spec.columns.length].label;
      const rightLabel = spec.columns[gapIndex].label;
      gap.title = `${leftLabel} と ${rightLabel} の間のギャップ${filled ? '（塗りつぶし済み：距離に数えない）' : '（未塗りつぶし：1マスとして数える）'}`;
      if (mode === 'edit' && canEdit && spec.gapFillable) {
        gap.classList.add('is-clickable');
        gap.addEventListener('click', () => commit(toggleGap(current, gapIndex)));
      }
      grid.appendChild(gap);
    });

    spec.rows.forEach((roll, rowIndex) => {
      const rollLabel = document.createElement('div');
      rollLabel.className = 'sf-skill-table-roll';
      rollLabel.textContent = String(roll);
      rollLabel.style.gridColumn = '1';
      rollLabel.style.gridRow = String(2 + rowIndex);
      grid.appendChild(rollLabel);

      spec.columns.forEach((_column, colIndex) => {
        const cellId = makeCellId(spec, colIndex, rowIndex);
        const acquired = isAcquired(current, cellId);
        const cell = document.createElement('div');
        cell.className = `sf-skill-cell${acquired ? ' is-acquired' : ''}`;
        cell.textContent = spec.cells[colIndex][rowIndex] || '―';
        cell.style.gridColumn = String(3 + colIndex * 2);
        cell.style.gridRow = String(2 + rowIndex);

        if (mode === 'edit' && canEdit) {
          cell.classList.add('is-clickable');
          cell.title = acquired ? 'クリックで取得を解除' : 'クリックで取得';
          cell.addEventListener('click', () => commit(toggleAcquired(current, cellId)));
        } else if (mode === 'check' && canCheck) {
          cell.classList.add('is-clickable');
          cell.addEventListener('mouseenter', () => previewStatus(cellId));
          cell.addEventListener('mouseleave', defaultStatus);
          cell.addEventListener('click', () => {
            dialog.close();
            onCheck(cellId);
          });
        }

        grid.appendChild(cell);
      });
    });

    defaultStatus();
  }

  render();
  dialog.showModal();
}
