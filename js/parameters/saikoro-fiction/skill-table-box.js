// js/parameters/saikoro-fiction/skill-table-box.js
// サイコロ・フィクション共通の「特技表」ボックス。表の中身（特技名・分野名）は一切持たず、
// 呼び出し元から渡された spec をそのまま描画する。
// skill/skill-box.js と同じ規約で、モジュールスコープに<dialog>を1つ持ち回す。

import {
  makeCellId, getCell, isAcquired, isGapFilled, toggleAcquired, toggleGap, resolveSkillCheck,
  checkModifiers,
  hasColumnSlots, hasExtraSlots, extraSlotMax, isColumnLost, isExtraSlotLost, isColumnDisabled,
  countRemainingSlots, toggleColumnSlot, toggleExtraSlot, setExtraSlotCount, toggleCyclic,
  hasCellDisable, isCellDisabled, toggleCellDisabled
} from './skill-table.js';
import {
  describeSkillCheck, buildCheckCommand, resolveCheckAdjustments
} from './skill-check.js';

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
 *   onCheck?: (cellId) => void
 *     判定モードでセルがクリックされた時。未指定なら判定モードを出さない。
 *   getToken?: () => object|null
 *     修正値（spec.check.modifiers）の現在値と、プレビューの目標値を引くために使う。
 *     スナップショットではなく関数で受け取るのは、この中で修正値を書き換えるため：
 *     渡された時点のコマを持ち回すと、直した値が同じダイアログの中で反映されない。
 *   getEffectiveParameterValue?: Function  バフ込みの実効値を引く口。
 *   onParameterChange?: (paramId, value) => void
 *     修正値の入力欄が変わった時。**渡さなければ入力欄は読み取り専用になる**
 *     （他人のコマを見ているだけの時）。値はコマのパラメータに残る。
 * }} options
 */
export function showSkillTableBox({
  spec, state, title = '特技表', editable = true, onSave, onCheck,
  getToken = null, getEffectiveParameterValue = null, onParameterChange = null
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const canEdit = editable && typeof onSave === 'function';
  const canCheck = typeof onCheck === 'function';
  // 判定できるならまず判定モード。編集専用なら編集モード。
  let mode = canCheck ? 'check' : 'edit';

  // トグルのたびに onSave へ流す（コマ更新ダイアログ側で SET_COMPONENT され、
  // 他の参加者にも即座に同期される）。保存ボタンで溜めるとモード切替時に迷子になるため。
  let current = {
    acquired: [...state.acquired],
    filledGaps: [...state.filledGaps],
    lostColumns: [...state.lostColumns],
    extraSlotCount: state.extraSlotCount,
    lostExtraSlots: [...state.lostExtraSlots],
    disabledCells: [...state.disabledCells],
    cyclic: state.cyclic
  };
  const commit = next => {
    current = next;
    onSave?.(current);
    render();
  };

  let hoveredCellId = null;

  // 「使えない」印（シノビガミの変調「マヒ」）を付けるための一発モード。ボタンを押している
  // 間だけ立ち、マスを1つ選ぶと降りて判定モードへ戻る。押しっぱなしで判定が飛ばなくなる
  // 事故を防ぐため、モードを切り替えたときも必ず降ろす。
  let armedDisable = false;
  const disableLabel = hasCellDisable(spec) ? spec.cellDisable.label : '';

  // 修正値（シノビガミのAdB等）はコマのパラメータそのもの。ダイアログの中だけの状態は
  // 持たず、読むのも書くのも常にコマ側で、閉じても残る。
  const readToken = () => (getToken ? getToken() : null);
  const canChangeModifiers = typeof onParameterChange === 'function';

  // パラメータの基礎値（手で入れた分）と、バフを含めた実効値。バフの分は入力欄では
  // 直せないので、差分を欄の下に出して「なぜ入力値と違う目で振られるのか」を見せる。
  const readModifier = (paramId) => {
    const token = readToken();
    const base = Number(token?.parameters?.[paramId]?.value) || 0;
    const effective = getEffectiveParameterValue
      ? (Number(getEffectiveParameterValue(token, paramId)) || 0)
      : base;
    return { base, buff: effective - base };
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
      button.addEventListener('click', () => {
        mode = value;
        hoveredCellId = null;
        armedDisable = false;
        render();
      });
      modeButtons[value] = button;
      modeRow.appendChild(button);
    });
    form.appendChild(modeRow);
  }

  // 「使えない」印のボタン（シノビガミの「マヒ」）。押すと次に選んだ特技1つへ印を付け外し
  // するだけで、判定は送らない。印は保存される状態なので canEdit のときだけ出す。
  // 判定モードでしか意味を持たないので、出す・出さないは render() で切り替える。
  const markRow = document.createElement('div');
  markRow.className = 'sf-skill-table-marks';
  let markBtn = null;
  if (canCheck && canEdit && hasCellDisable(spec)) {
    markBtn = document.createElement('button');
    markBtn.type = 'button';
    markBtn.className = 'sf-skill-table-mark-btn';
    markBtn.textContent = disableLabel;
    markBtn.title = `${disableLabel}：特技を1つ選んで「習得していない」扱いにします。`
      + `同じ操作をもう一度行うと戻ります。`;
    markBtn.addEventListener('click', () => {
      armedDisable = !armedDisable;
      hoveredCellId = null;
      render();
    });
    markRow.appendChild(markBtn);
    form.appendChild(markRow);
  }

  // 判定の修正値。spec.check.modifiers の1件ごとに数値入力欄を並べ、値はコマの
  // パラメータへ直接書き戻す（このダイアログの中だけの一時的な指定ではない）。
  // 項目の意味（ダイス数なのか目標値なのか）はここでは解釈せず、判定への効かせ方は
  // spec.check.resolve が決める。
  const optionRow = document.createElement('div');
  optionRow.className = 'sf-skill-table-check-options';
  const modifierFields = [];
  if (canCheck && checkModifiers(spec).length > 0) {
    const optionLabel = document.createElement('span');
    optionLabel.className = 'sf-skill-table-check-options-title';
    optionLabel.textContent = '判定の修正値';
    optionRow.appendChild(optionLabel);

    checkModifiers(spec).forEach(modifier => {
      const field = document.createElement('label');
      field.className = 'sf-skill-table-check-option';

      const caption = document.createElement('span');
      caption.textContent = modifier.label;

      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(modifier.min);
      input.max = String(modifier.max);
      input.disabled = !canChangeModifiers;
      // 書き込みは change（欄を離れた／Enterを押した時）にする。1文字打つたびに
      // 送ると、"-2" の途中の "-"（空欄扱い）で0が一度コマへ流れてしまう。
      input.addEventListener('change', () => {
        const raw = Math.round(Number(input.value));
        const value = Number.isFinite(raw)
          ? Math.min(Math.max(raw, modifier.min), modifier.max)
          : 0;
        onParameterChange(modifier.paramId, value);
        syncModifiers();
        refreshStatus();
      });

      // バフの分。0なら行ごと隠す（毎回「バフ 0」が並ぶと読みにくいだけのため）。
      const buffText = document.createElement('span');
      buffText.className = 'sf-skill-table-check-buff';

      field.appendChild(caption);
      field.appendChild(input);
      field.appendChild(buffText);
      optionRow.appendChild(field);
      modifierFields.push({ modifier, field, input, buffText });
    });

    if (canChangeModifiers) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'sf-skill-table-check-reset';
      resetBtn.textContent = '修正を0に戻す';
      resetBtn.title = '入力した修正値をすべて0にします（バフの分は消えません）。';
      resetBtn.addEventListener('click', () => {
        modifierFields.forEach(({ modifier }) => onParameterChange(modifier.paramId, 0));
        syncModifiers();
        refreshStatus();
      });
      optionRow.appendChild(resetBtn);
    }

    form.appendChild(optionRow);
  }

  // 入力欄とバフ表示を今のコマの値へ揃える。書き換えた直後と、開いた時に呼ぶ。
  function syncModifiers() {
    modifierFields.forEach(({ modifier, field, input, buffText }) => {
      const { base, buff } = readModifier(modifier.paramId);
      input.value = String(base);
      buffText.textContent = buff === 0 ? '' : `バフ ${buff > 0 ? '+' : ''}${buff}`;
      buffText.style.display = buff === 0 ? 'none' : '';
      field.title = `${modifier.label}：入力${base}`
        + (buff === 0 ? '' : ` ＋ バフ${buff > 0 ? '+' : ''}${buff}`)
        + ` ＝ ${base + buff}`
        + (canChangeModifiers ? `（入力できる範囲は${modifier.min}〜${modifier.max}）` : '（表示のみ）');
    });
  }

  // 追加枠（シノビガミの追加生命力）の行。個数はキャラクターごとなので、ここで増減させる。
  // 枠そのもののチェックは render() の中で組み直す（個数が変わると数も変わるため）。
  const extraRow = document.createElement('div');
  extraRow.className = 'sf-skill-slot-extra-row';
  let extraBoxes = null;
  let extraCountInput = null;
  if (hasExtraSlots(spec)) {
    const caption = document.createElement('span');
    caption.className = 'sf-skill-slot-extra-title';
    caption.textContent = spec.slots.extra.label;
    extraRow.appendChild(caption);

    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.className = 'sf-skill-slot-extra-count';
    countInput.min = '0';
    countInput.max = String(extraSlotMax(spec));
    countInput.title = `${spec.slots.extra.label}の数（0〜${extraSlotMax(spec)}）`;
    countInput.addEventListener('input', () => {
      // 入力途中の空欄・範囲外はsetExtraSlotCountが0〜maxへ丸める
      commit(setExtraSlotCount(spec, current, countInput.value));
    });
    countInput.addEventListener('blur', () => { countInput.value = String(current.extraSlotCount); });
    extraRow.appendChild(countInput);
    extraCountInput = countInput;

    extraBoxes = document.createElement('span');
    extraBoxes.className = 'sf-skill-slot-extra-boxes';
    extraRow.appendChild(extraBoxes);

    form.appendChild(extraRow);
  }

  const grid = document.createElement('div');
  grid.className = 'sf-skill-table-grid';
  // 先頭は出目のラベル列。以降は［ギャップ／分野］の繰り返し。
  grid.style.gridTemplateColumns = `auto repeat(${spec.columns.length}, 14px minmax(0, 1fr))`;
  form.appendChild(grid);

  // 左右を繋ぐかはキャラクターごとの設定。切り替えると距離＝目標値が変わるので、
  // 表のすぐ下に置いて今どちらなのかが分かるようにする。
  const cyclicRow = document.createElement('label');
  cyclicRow.className = 'sf-skill-table-cyclic';
  const cyclicBox = document.createElement('input');
  cyclicBox.type = 'checkbox';
  cyclicBox.addEventListener('change', () => commit(toggleCyclic(current)));
  cyclicRow.appendChild(cyclicBox);
  const cyclicText = document.createElement('span');
  cyclicRow.appendChild(cyclicText);
  form.appendChild(cyclicRow);

  const note = document.createElement('div');
  note.className = 'sf-skill-table-note';
  form.appendChild(note);

  const status = document.createElement('div');
  status.className = 'sf-skill-table-status';
  form.appendChild(status);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';

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

  /**
   * 失われうる枠のチェックボックス1つ。チェック＝失った。
   * 枠の付け外しは「取得の編集」と同じ性質の変更なので、canEdit のときだけ触れるようにする
   * （判定モードのままでも押せる。判定の途中で生命力が減るのが普通の流れのため）。
   */
  function buildSlotCheckbox(lost, label, onToggle) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'sf-skill-slot-box';
    box.checked = lost;
    box.disabled = !canEdit;
    box.title = canEdit
      ? `${label}${lost ? '（失っています。クリックで戻す）' : '（クリックで失う）'}`
      : `${label}${lost ? '：失っています' : ''}`;
    if (canEdit) box.addEventListener('change', onToggle);
    return box;
  }

  // カーソルが乗っているマスがあればその判定内容、無ければモードごとの操作説明を出す。
  // オプションを変えた時もここを呼び直して、投げるコマンドの表示を追従させる。
  function refreshStatus() {
    // 「使えない」印を待っている間は、判定のプレビューではなく印の付け外しを説明する
    // （このままマスを押しても判定は飛ばないため）。
    if (mode === 'check' && armedDisable) {
      const hovered = hoveredCellId ? getCell(spec, hoveredCellId) : null;
      if (hovered) {
        const name = spec.cells[hovered.columnIndex][hovered.rowIndex] || '―';
        if (!isAcquired(current, hoveredCellId)) {
          setStatus(`${name}：取得していない特技は${disableLabel}にできません。`);
        } else if (isCellDisabled(current, hoveredCellId)) {
          setStatus(`クリックで ${name} の${disableLabel}を解除します。`);
        } else {
          setStatus(`クリックで ${name} を${disableLabel}にします（習得していないものとして扱われます）。`);
        }
        return;
      }
      setStatus(`${disableLabel}にする特技のマスをクリックしてください（「${disableLabel}」をもう一度押すとやめます）。`);
      return;
    }

    if (mode === 'check' && hoveredCellId) {
      const resolution = resolveSkillCheck(spec, current, hoveredCellId);
      if (resolution) {
        // 実際に振るとき（runSkillCheck）と同じ手順で修正を反映してから見せる。
        // ここだけ素の値を出すと、プレビューとログの目標値が食い違う。
        const adjusted = resolveCheckAdjustments(spec, {
          targetNumber: resolution.targetNumber,
          token: readToken(),
          getEffectiveParameterValue
        });
        const heading = describeSkillCheck({ ...resolution, targetNumber: adjusted.targetNumber });
        const notes = adjusted.notes.length > 0 ? `［${adjusted.notes.join('、')}］` : '';
        // 代用できる特技が無い＝振れないので、コマンドは出さない
        const command = resolution.usedCell
          ? ` → ${buildCheckCommand(spec, adjusted.targetNumber, adjusted.options)}`
          : '';
        setStatus(`${heading}${notes}${command}`);
        return;
      }
    }

    if (!canEdit && !canCheck) {
      // 他人のコマを表示だけしている時（js/character-dialog.jsのcanEdit）。
      // どのマスも押せないので、操作の説明を出すとかえって迷わせる。
      setStatus('表示のみです。取得している特技を確認できます。');
    } else if (mode === 'edit') {
      setStatus(spec.gapFillable
        ? 'マスをクリックで取得／解除、ギャップ（細い縦帯）をクリックで塗りつぶし。変更は即座に保存されます。'
        : 'マスをクリックで取得／解除。変更は即座に保存されます。');
    } else {
      setStatus('判定したい特技のマスをクリックしてください（カーソルを乗せると目標値が出ます）。');
    }
  }

  function render() {
    // 枠を持つ表では残数も見出しに出す（生命力 5/6 のように、減ったことがすぐ分かるように）。
    // 列の枠を持たず追加枠だけの表（シノビガミのエネミー）でも出す：そちらは追加枠が
    // 生命力そのものなので、ここに出ないと残りが読めない。呼び名は持っているほうの枠から取る。
    const slots = countRemainingSlots(spec, current);
    const slotLabel = spec.slots?.column?.label ?? spec.slots?.extra?.label ?? '';
    const slotCapacity = (hasColumnSlots(spec) ? spec.columns.length : 0) + current.extraSlotCount;
    const slotText = slotLabel
      ? `・${slotLabel} ${slots.total}/${slotCapacity}`
      : '';
    // 「使えない」印は付いている時だけ出す（0件の行が常に並ぶと読みにくいだけのため）
    const markText = (hasCellDisable(spec) && current.disabledCells.length > 0)
      ? `・${disableLabel} ${current.disabledCells.length}件`
      : '';
    titleEl.textContent = `${title}（取得 ${current.acquired.length}件${slotText}${markText}）`;

    // --- 追加枠の行 ---
    if (extraBoxes) {
      // 入力中に値を書き戻すとカーソルが飛ぶので、触っていない時だけ揃える
      if (document.activeElement !== extraCountInput) {
        extraCountInput.value = String(current.extraSlotCount);
      }
      extraCountInput.disabled = !canEdit;

      extraBoxes.innerHTML = '';
      for (let index = 0; index < current.extraSlotCount; index++) {
        extraBoxes.appendChild(buildSlotCheckbox(
          isExtraSlotLost(current, index),
          `${spec.slots.extra.label}${index + 1}`,
          () => commit(toggleExtraSlot(current, index))
        ));
      }
      if (current.extraSlotCount === 0) {
        const none = document.createElement('span');
        none.className = 'sf-skill-slot-extra-none';
        none.textContent = 'なし';
        extraBoxes.appendChild(none);
      }
    }

    Object.entries(modeButtons).forEach(([value, button]) => {
      button.classList.toggle('is-active', mode === value);
    });

    if (markBtn) {
      markRow.style.display = mode === 'check' ? '' : 'none';
      markBtn.classList.toggle('is-active', armedDisable);
    }

    grid.innerHTML = '';
    grid.classList.toggle('is-check-mode', mode === 'check');

    // --- 左右を繋ぐかの切り替え ---
    const first = spec.columns[0].label;
    const last = spec.columns[spec.columns.length - 1].label;
    cyclicBox.checked = current.cyclic;
    cyclicBox.disabled = !canEdit;
    cyclicText.textContent = `表の左右を繋ぐ（${last} の右隣を ${first} にする）`;
    cyclicRow.title = canEdit
      ? '切り替えると分野間の距離＝目標値が変わります'
      : '表示のみです';
    note.textContent = current.cyclic
      ? `左右は繋がっています。左端のギャップが ${last} と ${first} の境目です。`
      : `左右は繋がっていません。${first} と ${last} は表の端から端まで数えます。`;

    // 見出し行：左上は空欄、以降は分野名
    const corner = document.createElement('div');
    corner.className = 'sf-skill-table-corner';
    corner.style.gridColumn = '1';
    corner.style.gridRow = '1';
    grid.appendChild(corner);

    spec.columns.forEach((column, colIndex) => {
      const header = document.createElement('div');
      header.className = 'sf-skill-table-header';
      header.style.gridColumn = String(3 + colIndex * 2);
      header.style.gridRow = '1';

      // 分野の枠（生命力）のチェックは分野名の上に置く
      if (hasColumnSlots(spec)) {
        const lost = isColumnLost(current, column.key);
        header.classList.toggle('is-lost', lost);
        header.appendChild(buildSlotCheckbox(
          lost,
          `${column.label}の${spec.slots.column.label}`,
          () => commit(toggleColumnSlot(current, column.key))
        ));
      }

      const name = document.createElement('span');
      name.className = 'sf-skill-table-header-label';
      name.textContent = column.label;
      header.appendChild(name);

      grid.appendChild(header);
    });

    // ギャップ：全行をまたぐ1本の縦帯にして、どこを押しても同じギャップをトグルできるようにする。
    // gap[i] は「列iの左」。円環でない表では gap[0]（＝表の左端）は存在しないので出さない。
    spec.columns.forEach((_column, gapIndex) => {
      if (gapIndex === 0 && !current.cyclic) return;
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
        // 枠を失った分野。判定の目標にはできるので押せるままにし、
        // 「取得していても代用元にならない」ことだけを見た目で伝える。
        const disabled = isColumnDisabled(spec, current, colIndex);
        // 「使えない」印（マヒ）。こちらは判定モードを離れても赤いままにして、
        // どの特技が潰れているかが取得の編集中にも読めるようにする。
        const marked = isCellDisabled(current, cellId);
        const cell = document.createElement('div');
        cell.className = `sf-skill-cell${acquired ? ' is-acquired' : ''}${disabled ? ' is-slot-lost' : ''}`
          + `${marked ? ' is-cell-disabled' : ''}`;
        cell.textContent = spec.cells[colIndex][rowIndex] || '―';
        cell.style.gridColumn = String(3 + colIndex * 2);
        cell.style.gridRow = String(2 + rowIndex);
        if (disabled && acquired) {
          cell.title = `取得していますが、${spec.columns[colIndex].label}の${spec.slots.column.label}を失っているため代用元に使えません`;
        }
        if (marked) {
          cell.title = `${disableLabel}：習得していないものとして扱われます（代用元に使えません）`;
        }

        if (mode === 'edit' && canEdit) {
          cell.classList.add('is-clickable');
          cell.title = acquired ? 'クリックで取得を解除' : 'クリックで取得';
          cell.addEventListener('click', () => commit(toggleAcquired(current, cellId)));
        } else if (mode === 'check' && armedDisable) {
          // 一発モード：判定は送らず、印を1つ付け外しして通常状態へ戻る。
          cell.classList.add('is-clickable');
          cell.addEventListener('mouseenter', () => { hoveredCellId = cellId; refreshStatus(); });
          cell.addEventListener('mouseleave', () => { hoveredCellId = null; refreshStatus(); });
          cell.addEventListener('click', () => {
            // 印は取得済みの特技にしか乗らない。押し間違いで一発モードを降ろさず、
            // そのまま選び直せるようにする。
            if (!acquired) {
              setStatus(`取得していない特技は${disableLabel}にできません。`);
              return;
            }
            armedDisable = false;
            hoveredCellId = null;
            commit(toggleCellDisabled(current, cellId));
          });
        } else if (mode === 'check' && canCheck) {
          cell.classList.add('is-clickable');
          cell.addEventListener('mouseenter', () => { hoveredCellId = cellId; refreshStatus(); });
          cell.addEventListener('mouseleave', () => { hoveredCellId = null; refreshStatus(); });
          cell.addEventListener('click', () => {
            dialog.close();
            onCheck(cellId);
          });
        }

        grid.appendChild(cell);
      });
    });

    // 修正値は判定モードのときだけ意味を持つ
    optionRow.style.display = (mode === 'check' && optionRow.childElementCount > 0) ? '' : 'none';
    syncModifiers();

    refreshStatus();
  }

  render();
  dialog.showModal();
}
