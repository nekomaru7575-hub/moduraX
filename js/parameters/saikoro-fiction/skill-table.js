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
// 【左右の結合】表の左端と右端が繋がるか（円環か）は**キャラクターごと**の設定
// （state.cyclic）で、表のボックスのチェックボックスから切り替える。既定は false＝繋がらない。
// specのcyclicはその初期値でしかなく、判定はすべてstate.cyclicを見る。
// 繋がらない表では gap[0]（表の左端）は存在しないものとして扱い、UIにも出さない。
//
// 【距離】縦は行の差、横は「列を1つ跨ぐごとに1 ＋ その際に越えるギャップが未塗りつぶしなら1」。
// 塗りつぶし済みのギャップは0として無視する。円環の場合は左回り・右回りの安い方を採る
// （ギャップを塗りつぶすと遠回りの方が安くなり得るため）。
// 目標値は baseTarget（シノビガミなら5）＋ 距離。

// checkを持たないspec向けのフォールバック。オプションは無く、素の2D6で目標値を判定する。
const DEFAULT_CHECK = {
  options: [],
  modifiers: [],
  buildCommand: ({ targetNumber }) => `2D6>=${targetNumber}`
};

/**
 * @param {{
 *   id: string,
 *   columns: {key:string, label:string}[],
 *   rows: number[],            出目のラベル（例: [2,3,...,12]）
 *   cells: string[][],         cells[列index][行index] = 特技名
 *   cyclic?: boolean,          左端と右端を繋ぐかの初期値（既定: false＝繋がらない）。
 *                              実際に繋ぐかはキャラクターごとに切り替える（state.cyclic）。
 *   gapFillable?: boolean,     ギャップを塗りつぶせるか（既定: true）
 *   baseTarget?: number,       目標値の基準（既定: 5）
 *   check?: {
 *     options: {key:string, label:string, default:number, min:number, max:number}[],
 *       判定コマンドに渡す値の宣言（シノビガミならダイス数・スペシャル値・ファンブル値）。
 *       **入力欄ではない**：既定値と、修正を足した後に丸める上下限を決めるためのもの。
 *       修正でどれだけ振り切れても、BCDiceが受け付けない値（0個のダイス等）にならない。
 *     modifiers?: {key:string, label:string, paramId:string, min:number, max:number}[],
 *       判定ボックスに並べる修正値の入力欄。値はコマのパラメータ（paramId）そのもので、
 *       書き換えるとコマに残る。**この配列が空なら入力欄は出ない。**
 *       どの修正がどこへ効くかは check.resolve が決めるので、ここでは解釈しない。
 *     buildCommand: ({options, targetNumber}) => string
 *       BCDiceへ投げるコマンド文字列。システム固有（シノビガミならSG）なのでプラグインが持つ。
 *     resolve?: ({options, targetNumber, getParam}) => {options, targetNumber, notes}
 *       修正（modifiersのパラメータ）を判定へ反映する。getParamはバフ込みの実効値を返す。
 *   },
 *   slots?: {
 *     「失われうる枠」。シノビガミの生命力、インセインの恐怖心のように、
 *     チェックを入れると何かが減る/使えなくなる枠を表に載せるための宣言。
 *     省略すればチェック欄は一切出ず、従来どおりの表になる。
 *     column?: { label: string, disablesColumn?: boolean }
 *       各列（分野）の見出しに1つずつ置く枠。disablesColumn:true なら、失われた列の特技は
 *       判定の目標にも代用元にもできなくなる（isColumnDisabled / findNearestAcquired）。
 *     extra?: { label: string, max?: number }
 *       表の上にまとめて置く枠。個数はキャラクターごとに決める（state.extraSlotCount）。
 *       maxは入力できる上限（既定12）。
 *   }
 * }} definition
 */
export function createSkillTableSpec(definition) {
  const {
    id,
    columns,
    rows,
    cells,
    cyclic = false,
    gapFillable = true,
    baseTarget = 5,
    check = DEFAULT_CHECK,
    slots = null
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
    id, columns, rows, cells, cyclic, gapFillable, baseTarget, check, slots,
    gapCount: columns.length,
    cellIndex, nameIndex, columnIndex
  });
}

// ---------------------------------------------------------------------------
// 失われうる枠（spec.slots）
// ---------------------------------------------------------------------------

/** 追加枠の個数の上限。specで指定が無ければこれ。 */
const DEFAULT_EXTRA_SLOT_MAX = 12;

export function hasColumnSlots(spec) {
  return !!spec.slots?.column;
}

export function hasExtraSlots(spec) {
  return !!spec.slots?.extra;
}

export function extraSlotMax(spec) {
  return spec.slots?.extra?.max ?? DEFAULT_EXTRA_SLOT_MAX;
}

export function isColumnLost(state, columnKey) {
  return state.lostColumns.includes(columnKey);
}

export function isExtraSlotLost(state, index) {
  return state.lostExtraSlots.includes(index);
}

/**
 * その列の特技が使えなくなっているか。
 * 枠を失っていても disablesColumn を宣言していなければ判定には影響しない
 * （「枠は減るが特技は使える」システムもありうるため、宣言した時だけ塞ぐ）。
 */
export function isColumnDisabled(spec, state, columnIndex) {
  if (!spec.slots?.column?.disablesColumn) return false;
  const column = spec.columns[columnIndex];
  return !!column && isColumnLost(state, column.key);
}

/** 残っている枠の数。パラメータの自動算出（プラグインのcomputeDerivedParameters）から使う。 */
export function countRemainingSlots(spec, state) {
  const column = hasColumnSlots(spec) ? spec.columns.length - state.lostColumns.length : 0;
  const extra = hasExtraSlots(spec) ? state.extraSlotCount - state.lostExtraSlots.length : 0;
  return { column, extra, total: column + extra };
}

/** 列の枠の喪失をトグルした新しいstateを返す */
export function toggleColumnSlot(state, columnKey) {
  const lostColumns = isColumnLost(state, columnKey)
    ? state.lostColumns.filter(key => key !== columnKey)
    : [...state.lostColumns, columnKey];
  return { ...state, lostColumns };
}

/** 追加枠の喪失をトグルした新しいstateを返す */
export function toggleExtraSlot(state, index) {
  const lostExtraSlots = isExtraSlotLost(state, index)
    ? state.lostExtraSlots.filter(i => i !== index)
    : [...state.lostExtraSlots, index];
  return { ...state, lostExtraSlots };
}

/**
 * 追加枠の個数を変えた新しいstateを返す。
 * 減らしたときに、はみ出した枠の「失った」印が残っていると、見えない枠のせいで
 * 残数が合わなくなる（countRemainingSlotsが負に振れる）ので、ここで一緒に捨てる。
 */
export function setExtraSlotCount(spec, state, rawCount) {
  const count = Math.min(Math.max(Math.trunc(Number(rawCount)) || 0, 0), extraSlotMax(spec));
  return {
    ...state,
    extraSlotCount: count,
    lostExtraSlots: state.lostExtraSlots.filter(index => index < count)
  };
}

// ---------------------------------------------------------------------------
// 判定コマンドに渡す値（ダイス数・スペシャル値など）と、その修正値の入力欄
//
// options は入力欄ではない。既定値（＝修正が何も無いときの値）と、修正を足した後に
// 丸める上下限を決める。実際に卓がいじるのは modifiers 側で、そちらの値はコマの
// パラメータに入っている（判定ボックスの入力欄はそのパラメータを直接書き換える）。
// ---------------------------------------------------------------------------

/**
 * 判定ボックスに並べる修正値の入力欄の宣言。宣言が無ければ空配列（入力欄を出さない）。
 * 実際の値はコマのパラメータ側にあるので、ここが返すのは「どのパラメータをどの名前で
 * 並べるか」だけ。
 */
export function checkModifiers(spec) {
  return spec.check.modifiers ?? [];
}

/**
 * 修正を足した後の値を、整数化してmin/maxへ丸める。未指定の項目は既定値で埋める。
 * 修正がどれだけ振り切れても、BCDiceが受け付けない値（0個のダイス等）を投げないための関門。
 */
export function normalizeCheckOptions(spec, raw) {
  const options = {};
  spec.check.options.forEach(option => {
    // 空文字・null は「未指定」として既定値へ。Number('') は0になるので、そのままだと
    // 下限へ張り付いてしまう。
    const source = raw?.[option.key];
    const blank = source === undefined || source === null || String(source).trim() === '';
    const value = blank ? NaN : Math.round(Number(source));
    options[option.key] = Number.isFinite(value)
      ? Math.min(Math.max(value, option.min), option.max)
      : option.default;
  });
  return options;
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

export function createEmptySkillTableState(spec) {
  return {
    acquired: [], filledGaps: [], lostColumns: [], extraSlotCount: 0, lostExtraSlots: [],
    cyclic: !!spec?.cyclic
  };
}

/**
 * 保存済みデータを安全な形に正規化する。古いコマは components 自体が無い
 * （game-store.js の hydrate は token.components を補完しない）ため、読む側は必ずこれを通す。
 * 表の定義が変わって存在しなくなったセルID・範囲外のギャップ・列キーは黙って捨てる。
 * spec が slots を宣言していない場合は、保存済みの値があっても空にする（表に出ない枠が
 * 残数の計算にだけ効いてしまうのを防ぐ）。
 */
export function normalizeSkillTableState(spec, raw) {
  const acquired = Array.isArray(raw?.acquired)
    ? [...new Set(raw.acquired.filter(cellId => spec.cellIndex.has(cellId)))]
    : [];

  const filledGaps = (spec.gapFillable && Array.isArray(raw?.filledGaps))
    ? [...new Set(raw.filledGaps.filter(i => Number.isInteger(i) && i >= 0 && i < spec.gapCount))]
    : [];

  const validColumnKeys = new Set(spec.columns.map(column => column.key));
  const lostColumns = (hasColumnSlots(spec) && Array.isArray(raw?.lostColumns))
    ? [...new Set(raw.lostColumns.filter(key => validColumnKeys.has(key)))]
    : [];

  const rawCount = Number(raw?.extraSlotCount);
  const extraSlotCount = hasExtraSlots(spec) && Number.isFinite(rawCount)
    ? Math.min(Math.max(Math.trunc(rawCount), 0), extraSlotMax(spec))
    : 0;

  const lostExtraSlots = (extraSlotCount > 0 && Array.isArray(raw?.lostExtraSlots))
    ? [...new Set(raw.lostExtraSlots.filter(i => Number.isInteger(i) && i >= 0 && i < extraSlotCount))]
    : [];

  // 左右を繋ぐかはキャラクターごとの設定。保存済みの指定が無ければspecの初期値に従う。
  const cyclic = typeof raw?.cyclic === 'boolean' ? raw.cyclic : !!spec.cyclic;

  return { acquired, filledGaps, lostColumns, extraSlotCount, lostExtraSlots, cyclic };
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

/**
 * 左右を繋ぐかをトグルした新しいstateを返す。
 * 繋がなくなると gap[0]（表の左端）は表示も距離計算も対象外になるが、塗りつぶしの印は
 * 消さない。繋ぎ直したときに塗り直させないため（isGapFilledは残ったまま無視される）。
 */
export function toggleCyclic(state) {
  return { ...state, cyclic: !state.cyclic };
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
 * 円環かどうかはキャラクターごとの設定（state.cyclic）なので、specではなくstateを見る。
 */
export function columnDistance(spec, state, colA, colB) {
  if (colA === colB) return 0;

  const columnCount = spec.columns.length;
  const filled = new Set(spec.gapFillable ? state.filledGaps : []);
  const gapCost = gapIndex => (filled.has(gapIndex) ? 0 : 1);

  // 右へ1歩（列c → 列c+1）で越えるギャップは gap[(c+1) % N]（＝列c+1の左）
  const stepRightCost = fromColumn => 1 + gapCost((fromColumn + 1) % columnCount);
  // 左へ1歩（列c → 列c-1）で越えるギャップは gap[c]（＝列cの左）
  const stepLeftCost = fromColumn => 1 + gapCost(fromColumn);

  if (!state.cyclic) {
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
  return columnDistance(spec, state, a.columnIndex, b.columnIndex)
    + Math.abs(a.rowIndex - b.rowIndex);
}

/**
 * 目標のセルに一番近い「取得済み」のセルを探す。距離は分離可能なので全セル総当たりでよい。
 *
 * 枠を失った列（isColumnDisabled）の特技は、取得していても代用元にしない。
 * 枠の喪失が効くのはここだけで、目標にする側は制限しない（resolveSkillCheck参照）。
 * その分野の特技を判定するときは、生きている分野から代用することになる。
 *
 * @returns {{cellId:string, distance:number, ties:string[]} | null} 使える取得済みが無ければnull
 *   ties は同じ距離だった他の候補（どれを使ってもよいことをUIで示すため）
 */
export function findNearestAcquired(spec, state, targetCellId) {
  let best = null;
  let ties = [];

  state.acquired.forEach(cellId => {
    const cell = getCell(spec, cellId);
    if (!cell || isColumnDisabled(spec, state, cell.columnIndex)) return;

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
 *
 * 枠を失った分野でも「その特技を目標にした判定」自体はできる。効くのは代用元の側で、
 * 失った分野の取得済み特技は無かったものとして距離を測り直す（findNearestAcquired）。
 * 結果として、失った分野の特技は他の分野から代用することになり目標値が上がる。
 *
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
