// js/parameters/saikoro-fiction/skill-table.js
// サイコロ・フィクション系システム（シノビガミ／インセイン等）が共通して持つ「特技表」の
// データモデルと距離計算。特技名・分野名・システムIDは一切持たず、すべてプラグインから
// createSkillTableSpec() の引数として渡してもらう。
//
// このファイルはDOMに触れない（server/index.js が game-store.js 経由でプラグインを
// import するため、Node環境でも読み込める必要がある）。UIは skill-table-box.js、
// 判定の実行は skill-check.js が担当する。
//
// 【表の形】分野N列 × 出目M行（2D6なら2〜12の11行）。各列の左側に1つずつギャップがあり、
// ギャップもN個。gap[0] は「列0の左」＝円環の場合は最終列と列0の間になる。
//
//   [gap0][列0][gap1][列1][gap2][列2] … [gapN-1][列N-1] →（円環なら gap0 に戻る）
//
// 【距離】縦は行の差、横は「列を1つ跨ぐごとに1 ＋ その際に越えるギャップが未塗りつぶしなら1」。
// 塗りつぶし済みのギャップは0として無視する。円環の場合は左回り・右回りの安い方を採る
// （ギャップを塗りつぶすと遠回りの方が安くなり得るため）。
// 目標値は baseTarget（シノビガミなら5）＋ 距離。

/**
 * @param {{
 *   id: string,
 *   columns: {key:string, label:string}[],
 *   rows: number[],            出目のラベル（例: [2,3,...,12]）
 *   cells: string[][],         cells[列index][行index] = 特技名
 *   cyclic?: boolean,          左端と右端が繋がるか（既定: true）
 *   gapFillable?: boolean,     ギャップを塗りつぶせるか（既定: true）
 *   baseTarget?: number        目標値の基準（既定: 5）
 * }} definition
 */
export function createSkillTableSpec(definition) {
  const {
    id,
    columns,
    rows,
    cells,
    cyclic = true,
    gapFillable = true,
    baseTarget = 5
  } = definition;

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error(`[skill-table] ${id}: columns が空です`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`[skill-table] ${id}: rows が空です`);
  }
  if (!Array.isArray(cells) || cells.length !== columns.length) {
    throw new Error(`[skill-table] ${id}: cells の列数(${cells?.length})が columns(${columns.length})と一致しません`);
  }
  cells.forEach((column, index) => {
    if (!Array.isArray(column) || column.length !== rows.length) {
      throw new Error(`[skill-table] ${id}: cells[${index}] の行数(${column?.length})が rows(${rows.length})と一致しません`);
    }
  });

  // セルID → 位置。IDは「列キー:出目」（例 "ninjutsu:7"）。特技名ではなく列キーと出目で
  // 識別することで、後から特技名を修正しても保存済みの取得データが壊れない。
  const cellIndex = new Map();
  // 特技名 → セルID。チャットコマンドの引数解決に使う。
  const nameIndex = new Map();
  // 列キー・列ラベル → 列index。"忍術:7" のような指定を受けるため両方引く。
  const columnIndex = new Map();

  columns.forEach((column, colIndex) => {
    columnIndex.set(column.key, colIndex);
    columnIndex.set(column.label, colIndex);
    rows.forEach((roll, rowIndex) => {
      const cellId = `${column.key}:${roll}`;
      cellIndex.set(cellId, { columnIndex: colIndex, rowIndex });
      const name = cells[colIndex][rowIndex];
      if (name && !nameIndex.has(name)) nameIndex.set(name, cellId);
    });
  });

  return Object.freeze({
    id, columns, rows, cells, cyclic, gapFillable, baseTarget,
    gapCount: columns.length,
    cellIndex, nameIndex, columnIndex
  });
}

/** 列index・行indexからセルIDを組み立てる */
export function makeCellId(spec, columnIndex, rowIndex) {
  return `${spec.columns[columnIndex].key}:${spec.rows[rowIndex]}`;
}

/**
 * セルIDを解決する。存在しないIDならnull。
 * @returns {{cellId:string, columnIndex:number, rowIndex:number, columnKey:string,
 *            columnLabel:string, roll:number, name:string} | null}
 */
export function getCell(spec, cellId) {
  const position = spec.cellIndex.get(cellId);
  if (!position) return null;
  const { columnIndex, rowIndex } = position;
  const column = spec.columns[columnIndex];
  return {
    cellId,
    columnIndex,
    rowIndex,
    columnKey: column.key,
    columnLabel: column.label,
    roll: spec.rows[rowIndex],
    name: spec.cells[columnIndex][rowIndex]
  };
}

/**
 * 特技名（"隠形術"）または「分野:出目」（"忍術:7" / "ninjutsu:7"）からセルIDを引く。
 * どちらでも解決できなければnull。
 */
export function findCellIdByName(spec, rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) return null;

  const byName = spec.nameIndex.get(text);
  if (byName) return byName;

  const separatorAt = text.lastIndexOf(':');
  if (separatorAt > 0) {
    const columnPart = text.slice(0, separatorAt).trim();
    const rollPart = Number(text.slice(separatorAt + 1).trim());
    const colIndex = spec.columnIndex.get(columnPart);
    const rowIndex = spec.rows.indexOf(rollPart);
    if (colIndex !== undefined && rowIndex >= 0) return makeCellId(spec, colIndex, rowIndex);
  }

  return null;
}

// ---------------------------------------------------------------------------
// 状態（キャラクターの components.skillTable に保存する形）
// ---------------------------------------------------------------------------

export function createEmptySkillTableState() {
  return { acquired: [], filledGaps: [] };
}

/**
 * 保存済みデータを安全な形に正規化する。古いコマは components 自体が無い
 * （game-store.js の hydrate は token.components を補完しない）ため、読む側は必ずこれを通す。
 * 表の定義が変わって存在しなくなったセルID・範囲外のギャップは黙って捨てる。
 */
export function normalizeSkillTableState(spec, raw) {
  const acquired = Array.isArray(raw?.acquired)
    ? [...new Set(raw.acquired.filter(cellId => spec.cellIndex.has(cellId)))]
    : [];

  const filledGaps = (spec.gapFillable && Array.isArray(raw?.filledGaps))
    ? [...new Set(raw.filledGaps.filter(i => Number.isInteger(i) && i >= 0 && i < spec.gapCount))]
    : [];

  return { acquired, filledGaps };
}

export function isAcquired(state, cellId) {
  return state.acquired.includes(cellId);
}

export function isGapFilled(state, gapIndex) {
  return state.filledGaps.includes(gapIndex);
}

/** 取得状態をトグルした新しいstateを返す（元のstateは変更しない） */
export function toggleAcquired(state, cellId) {
  const acquired = isAcquired(state, cellId)
    ? state.acquired.filter(id => id !== cellId)
    : [...state.acquired, cellId];
  return { ...state, acquired };
}

/** ギャップの塗りつぶしをトグルした新しいstateを返す */
export function toggleGap(state, gapIndex) {
  const filledGaps = isGapFilled(state, gapIndex)
    ? state.filledGaps.filter(i => i !== gapIndex)
    : [...state.filledGaps, gapIndex];
  return { ...state, filledGaps };
}

// ---------------------------------------------------------------------------
// 距離と目標値
// ---------------------------------------------------------------------------

/**
 * 列Aから列Bまでの横方向の距離。
 * 列を1つ跨ぐごとに1、その際に越えるギャップが未塗りつぶしならさらに1。
 * 円環なら左回り・右回りの安い方を返す。
 */
export function columnDistance(spec, filledGaps, colA, colB) {
  if (colA === colB) return 0;

  const columnCount = spec.columns.length;
  const filled = new Set(spec.gapFillable ? filledGaps : []);
  const gapCost = gapIndex => (filled.has(gapIndex) ? 0 : 1);

  // 右へ1歩（列c → 列c+1）で越えるギャップは gap[(c+1) % N]（＝列c+1の左）
  const stepRightCost = fromColumn => 1 + gapCost((fromColumn + 1) % columnCount);
  // 左へ1歩（列c → 列c-1）で越えるギャップは gap[c]（＝列cの左）
  const stepLeftCost = fromColumn => 1 + gapCost(fromColumn);

  if (!spec.cyclic) {
    const low = Math.min(colA, colB);
    const high = Math.max(colA, colB);
    let total = 0;
    for (let column = low; column < high; column++) total += stepRightCost(column);
    return total;
  }

  let rightward = 0;
  for (let column = colA; column !== colB; column = (column + 1) % columnCount) {
    rightward += stepRightCost(column);
  }

  let leftward = 0;
  for (let column = colA; column !== colB; column = (column - 1 + columnCount) % columnCount) {
    leftward += stepLeftCost(column);
  }

  return Math.min(rightward, leftward);
}

/**
 * セル間の距離。横（ギャップを含む）と縦（行の差）は互いに独立なので単純な和になる。
 * 縦方向は繋がらない（表の上端と下端は円環にしない）。
 */
export function cellDistance(spec, state, cellIdA, cellIdB) {
  const a = getCell(spec, cellIdA);
  const b = getCell(spec, cellIdB);
  if (!a || !b) return null;
  return columnDistance(spec, state.filledGaps, a.columnIndex, b.columnIndex)
    + Math.abs(a.rowIndex - b.rowIndex);
}

/**
 * 目標のセルに一番近い「取得済み」のセルを探す。距離は分離可能なので全セル総当たりでよい。
 * @returns {{cellId:string, distance:number, ties:string[]} | null} 取得済みが1つも無ければnull
 *   ties は同じ距離だった他の候補（どれを使ってもよいことをUIで示すため）
 */
export function findNearestAcquired(spec, state, targetCellId) {
  let best = null;
  let ties = [];

  state.acquired.forEach(cellId => {
    const distance = cellDistance(spec, state, targetCellId, cellId);
    if (distance === null) return;
    if (best === null || distance < best.distance) {
      best = { cellId, distance };
      ties = [];
    } else if (distance === best.distance) {
      ties.push(cellId);
    }
  });

  return best ? { ...best, ties } : null;
}

/**
 * 目標の特技に対する判定内容を解決する。
 * @returns {{
 *   targetCell: object, usedCell: object|null, distance: number|null,
 *   targetNumber: number|null, owned: boolean, ties: string[]
 * } | null} targetCellIdが不正ならnull
 */
export function resolveSkillCheck(spec, state, targetCellId) {
  const targetCell = getCell(spec, targetCellId);
  if (!targetCell) return null;

  const nearest = findNearestAcquired(spec, state, targetCellId);
  if (!nearest) {
    return { targetCell, usedCell: null, distance: null, targetNumber: null, owned: false, ties: [] };
  }

  return {
    targetCell,
    usedCell: getCell(spec, nearest.cellId),
    distance: nearest.distance,
    targetNumber: spec.baseTarget + nearest.distance,
    owned: nearest.distance === 0,
    ties: nearest.ties
  };
}
