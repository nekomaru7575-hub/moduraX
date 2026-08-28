// js/parameters/skill/skill-box.js
// スキル一覧を表示・編集するボックス（複数データをまとめて扱うUI）。
// 見出しも入力欄の構成もspec（js/parameters/skill/skill-model.jsのcreateSkillSpec /
// createListSpec）から組み立てるので、このファイルはどのシステムの何を編集しているかを
// 知らない。使わない節（効果時間・回数制限・使用条件・修正値）はspecの宣言に従って
// 丸ごと出さないので、名前と内容だけの一覧もこのボックスがそのまま描く。
// 保存すると即座にonSaveへ新しい配列を渡す。Core側はこの配列の中身を解釈しない。
//
// CSSクラスはエフェクトボックス時代の .effect-box-* をそのまま使っている
// （見た目を変えずに中身だけ汎用化するため。改名するなら別の変更として行う）。

import { lockFormControls } from '../../read-only-form.js';
import { analyzeFormula, listFormulaNames, COMPARATORS } from './skill-formula.js';
import {
  normalizeSkillList, EXPIRE_PHASE_CHOICES, isFieldAvailable, isChoiceField, clampQuantity,
  buildSkillUseCommand
} from './skill-model.js';
import { runItemUse, readItems } from './item-use.js';
import { createDialogHost } from '../../dialog-host.js';

/**
 * 入力欄に小さな見出しを付けて返す。見出し行に入力欄だけが並んでいると、
 * 何を入れる欄なのかがプレースホルダを消したあと分からなくなるため。
 *
 * **幅の指定（specのclassName）は枠のほうに付ける**：中の入力欄に残すと、縦並びの枠の
 * 中でflex-basisが「高さ」として効いてしまう。中の入力欄はCSSで幅100%にしてある。
 */
function wrapWithLabel(control, labelText, widthClass) {
  const wrapper = document.createElement('div');
  wrapper.className = 'effect-box-field';
  if (widthClass) wrapper.classList.add(widthClass);

  const label = document.createElement('span');
  label.className = 'effect-box-field-label';
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(control);
  return wrapper;
}

// 選択肢欄（type:'select'）を組む。optionにgroupがあれば、その名前でoptgroupにまとめる
// （シノビガミの指定特技は66件あるので、分野ごとに畳まないと選べない）。
function buildSelectField(field, value) {
  const select = document.createElement('select');
  const groups = new Map();

  field.options.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;

    if (!option.group) {
      select.appendChild(el);
      return;
    }
    let group = groups.get(option.group);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = option.group;
      groups.set(option.group, group);
      select.appendChild(group);
    }
    group.appendChild(el);
  });

  select.value = value;
  return select;
}

/**
 * 押すたびに選択肢を順に回すボタン（type:'toggle'）。2択に限らず選択肢の数だけ回る。
 * 見た目と操作感はDX3のロイス⇔タイタスのトグル（js/parameters/dx3-lois-box.js）に揃えてある。
 *
 * 値を <select> と同じく要素の value に持たせているのが肝で、こうしておけば保存も
 * availableWhen の引き直しも式の検証も、他の欄と同じ経路のまま動く
 * （ボックス側に「トグルだけの特別扱い」が要らない）。
 */
function buildToggleField(field, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'effect-box-toggle';
  button.title = `${field.label}（クリックで切り替え）`;

  const indexOf = (target) => {
    const index = field.options.findIndex(option => option.value === target);
    return index === -1 ? 0 : index;
  };

  const show = (target) => {
    const index = indexOf(target);
    const option = field.options[index];
    button.value = option?.value ?? '';
    button.textContent = option?.label ?? '';
    // 先頭以外を選んでいることを色でも示す（どちらなのかを読みに行かなくて済むように）。
    // 3択以上で選択肢ごとに色を変えたいsystem（シノビガミの人物の属性：＋は青、−は赤）の
    // ために、選んでいる番号もクラスへ載せる。specのclassNameと組み合わせて塗り分ける。
    button.classList.toggle('is-alt', index > 0);
    field.options.forEach((_option, i) => button.classList.toggle(`is-opt-${i}`, i === index));
  };

  button.addEventListener('click', () => {
    if (field.options.length === 0) return;
    show(field.options[(indexOf(button.value) + 1) % field.options.length].value);
    // 他の欄と同じ経路（availableWhenの引き直し・式の検証）を通すために自分で起こす
    button.dispatchEvent(new Event('change', { bubbles: true }));
  });

  show(value);
  return button;
}

/**
 * 欄1つの「今の値」。型ごとに置き場が違う（チェックはchecked、他はvalue）ので、
 * 読む場所を1か所にまとめてある。**3か所（有効/無効の引き直し・式の検証・保存）が
 * 同じ値を見る必要がある**：ずれると、画面では有効なのに保存では空、のような食い違いになる。
 */
function readFieldValue(field, input) {
  if (field.type === 'checkbox') return input.checked;
  if (field.type === 'number') return Number(input.value) || 0;
  return input.value;
}

/** 行1つ分の欄の値をまとめて読む（availableWhen / filterOptions / 式へ渡す形）。 */
function readRowFieldValues(spec, fieldInputs) {
  const values = {};
  spec.fields.forEach(field => { values[field.key] = readFieldValue(field, fieldInputs[field.key]); });
  return values;
}

/** チェック欄（type:'checkbox'）。ラベルと並べて見出し行へ置く。 */
function buildCheckboxField(field, value) {
  const wrap = document.createElement('label');
  wrap.className = 'effect-box-check';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!value;

  wrap.appendChild(input);
  wrap.appendChild(document.createTextNode(field.label));
  // 値を持つのはinput、行に並べるのはwrap。呼び出し側が両方を扱えるように返す。
  return { input, element: wrap };
}

/**
 * filterOptionsを宣言した<select>の選択肢を、同じ行の今の値で組み直す。
 * 今選ばれている値が絞り込みから外れたら、残った先頭へ寄せる（画面と保存値がずれないように）。
 * 絞り込みは**表示だけ**の話で、保存値の検証は宣言された全選択肢に対して行われる
 * （js/parameters/skill/skill-model.js の normalizeSkill）。
 */
function refreshSelectOptions(field, select, fieldValues) {
  const allowed = field.options.filter(option => field.filterOptions(option, fieldValues));
  const current = select.value;

  select.innerHTML = '';
  const groups = new Map();
  allowed.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    if (!option.group) {
      select.appendChild(el);
      return;
    }
    let group = groups.get(option.group);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = option.group;
      groups.set(option.group, group);
      select.appendChild(group);
    }
    group.appendChild(el);
  });

  select.value = allowed.some(option => option.value === current)
    ? current
    : (allowed[0]?.value ?? '');
}

const ensureDialog = createDialogHost('effect-box-dialog');

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * @param {{
 *   spec: object,                createSkillSpecの戻り値
 *   skills: Array<object>,       保存済みの一覧（旧形式でもよい。ここで正規化して表示する）
 *   parameters?: Record<string, {label?:string, key?:string, value?:number}>,
 *     修正の対象に選べるパラメータと、式に書ける{名前}の検証・提示に使う。
 *   readOnly?: boolean           他人のコマを表示だけしている時（js/character-dialog.jsのcanEdit）
 *   onSave: (skills: Array<object>) => void
 *   getToken?: () => object|null,  アイテム（spec.quantityを宣言したspec）の使用に使う。
 *   dispatch?: Function            同上。使用はチャットへログを流すため、この2つが要る。
 *                                  渡さなければ使用ボタンは出ない（個数の増減だけできる）。
 *   generateBuffId?: Function,     行ごとの任意ボタン（spec.rowActions）へそのまま渡す。
 *   findTokenByName?: (name) => object|null
 *                                  同上。他のコマを名前で引く口（シノビガミの感情修正）。
 *                                  部屋の外（コマ作成ツール）では渡ってこないので、
 *                                  runの側で「部屋の中で実行してください」と断ること。
 * }} options
 */
export function showSkillBox({
  spec, skills = [], parameters = {}, readOnly = false, onSave,
  getToken = null, dispatch = null, generateBuffId = null, findTokenByName = null
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  // 式に書ける名前（specが宣言したフィールド＋このコマのパラメータのラベル）
  const formulaNamesHint = listFormulaNames(spec, parameters).join('、');

  // 入力中の式について、使用時に0になってしまう理由（未知の名前・読めない書式）を1行で返す。
  // 問題が無ければnull。値そのものは評価しない（使用者のバフ状況によって変わるため）。
  function describeFormulaProblem(rawFormula, skillFields) {
    const { unresolvedNames, invalidSyntax, empty } = analyzeFormula(rawFormula, {
      spec,
      skill: { fields: skillFields },
      token: { parameters },
      getEffectiveParameterValue: (token, paramId) => token.parameters[paramId]?.value ?? 0
    });

    if (empty) return null;
    if (unresolvedNames.length > 0) {
      return `「${unresolvedNames.join('」「')}」は式で使える名前ではありません（使える名前: ${formulaNamesHint}）`;
    }
    if (invalidSyntax) {
      return '式として読めません（数値・+ - * / ・( ) と {名前} だけが使えます）';
    }
    return null;
  }

  // 修正の対象に選べるパラメータ。specが宣言した対象を先に、それ以外をその後に並べる
  // （宣言分は「そのシステムで普通に使うもの」なので上に出したい）。
  const declaredParamIds = new Set(spec.modTargets.map(target => target.paramId));
  const otherParams = Object.entries(parameters)
    .filter(([paramId]) => !declaredParamIds.has(paramId))
    .map(([paramId, param]) => ({ paramId, label: param.label || paramId }));

  const form = document.createElement('form');
  form.appendChild(createElement('h3', null, `${spec.noun}一覧`));

  const listEl = createElement('div', 'effect-box-list');
  form.appendChild(listEl);

  const rows = [];

  // 一覧の下の1行（spec.footerNote）を引き直す。行の追加・削除・入力・個数の増減から
  // 呼ばれる。実体は行を全部作ってから下で差し替えるので、それまでは何もしない。
  let syncFooter = () => {};

  function addRow(skill) {
    const item = createElement('div', 'effect-box-item');

    // --- 見出し行：名前 ＋ システム固有のフィールド ---
    const headerRow = createElement('div', 'effect-box-header-row');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `${spec.noun}名`;
    nameInput.value = skill?.name ?? '';
    headerRow.appendChild(wrapWithLabel(nameInput, `${spec.noun}名`, 'effect-box-name'));

    const fieldInputs = {};
    // 無効化・タイトルの付け替えは「行に並べた要素」に対して行う（チェック欄は<label>）。
    const fieldElements = {};
    // 見出しラベルを付ける枠。無効な欄ではラベルも一緒に薄くする（チェック欄は自分で
    // ラベルを持つので枠に入れない＝ここに入らない）。
    const fieldWrappers = {};
    spec.fields.forEach(field => {
      const stored = skill?.fields?.[field.key];
      let input;
      // 行に並べる要素。チェック欄だけは<label>で包むので、値を持つinputとは別物になる。
      let element;
      if (field.type === 'checkbox') {
        const built = buildCheckboxField(field, stored);
        input = built.input;
        element = built.element;
      } else if (field.type === 'toggle') {
        input = buildToggleField(field, stored ?? field.options[0]?.value ?? '');
        element = input;
      } else if (field.type === 'select') {
        input = buildSelectField(field, stored ?? field.options[0]?.value ?? '');
        element = input;
      } else {
        input = document.createElement('input');
        input.type = field.type === 'number' ? 'number' : 'text';
        input.placeholder = field.placeholder || field.label;
        input.value = stored ?? (field.type === 'number' ? 0 : '');
        element = input;
      }
      element.title = field.type === 'toggle' ? `${field.label}（クリックで切り替え）` : field.label;

      // 欄をここから次の段へ送る（アリアンロッドのコスト一式）。幅いっぱいの高さ0の
      // 区切りを挟むだけ：見出し行はflex-wrapなので、これ以降が次の行から並ぶ。
      if (field.newRow) headerRow.appendChild(createElement('div', 'effect-box-row-break'));

      // チェック欄は文言そのものがラベルなので、そのまま行へ並べる（二重に名前が出ない）。
      // それ以外は小さな見出しを付けた枠へ入れる：入力欄だけが並んでいると、
      // どの欄が何なのかを開いた人が推測するしかない。
      // 幅の指定（specのclassName）は枠のほうへ移す。縦並びの枠の中に残すと、
      // flex-basisが「高さ」として効いてしまうため。
      if (field.type === 'checkbox') {
        if (field.className) element.classList.add(field.className);
        headerRow.appendChild(element);
      } else {
        // トグルは見た目と状態を自分のクラスに持つ（is-alt / is-opt-N）ので触らない。
        const wrapper = wrapWithLabel(element, field.label, field.className || 'effect-box-timing');
        headerRow.appendChild(wrapper);
        fieldWrappers[field.key] = wrapper;
      }
      fieldInputs[field.key] = input;
      fieldElements[field.key] = element;
    });

    // 条件付きの欄（シノビガミの「間合は攻撃忍法だけ」）の有効/無効を今の入力値で決め直す。
    // 無効でも値は消さない。条件が戻ったときに入れ直させないため（skill-model.jsのisFieldAvailable）。
    function syncFieldAvailability() {
      const values = readRowFieldValues(spec, fieldInputs);

      spec.fields.forEach(field => {
        const input = fieldInputs[field.key];
        const element = fieldElements[field.key];
        const available = isFieldAvailable(field, values);
        input.disabled = !available;
        element.classList.toggle('is-unavailable', !available);
        // 見出しも一緒に薄くする（欄だけ薄いと、どこまでが使えない欄なのか読めない）
        fieldWrappers[field.key]?.classList.toggle('is-unavailable', !available);

        // 既定は「薄く出したまま押せなくする」。使わないときは場所ごと消したい欄
        // （アリアンロッドの追加コスト）だけ、宣言で引っ込められるようにしてある。
        if (field.hideWhenUnavailable) {
          (fieldWrappers[field.key] ?? element).style.display = available ? '' : 'none';
        }

        // 選択肢を他の欄の値で絞る欄（シノビガミの人物の感情）は、ここで組み直す。
        // 今の値が絞り込みから外れたら、残った先頭へ寄せる（画面と保存値がずれないように）。
        if (typeof field.filterOptions === 'function' && field.type === 'select') {
          refreshSelectOptions(field, input, values);
        }

        if (available) {
          element.title = field.type === 'toggle'
            ? `${field.label}（クリックで切り替え）`
            : field.label;
          if (!isChoiceField(field) && field.type !== 'checkbox') {
            input.placeholder = field.placeholder || field.label;
          }
        } else {
          element.title = `${field.label}：この種類では使いません`;
          if (!isChoiceField(field) && field.type !== 'checkbox') input.placeholder = '-';
        }
      });

      syncRowActions(values);
    }

    // 条件の元になる欄（タイプ等）が変わったら組み直す。どの欄が条件を左右するかは
    // specしか知らないので、全部の欄の変化を見て一律に引き直す。
    spec.fields.forEach(field => {
      fieldInputs[field.key].addEventListener('change', syncFieldAvailability);
      fieldInputs[field.key].addEventListener('input', syncFieldAvailability);
    });

    // --- 行ごとの任意ボタン（シノビガミの人物の「感情修正」） ---
    // ボックスは何をするかを知らない。specが宣言したrunへ、その行の今の値と
    // store操作一式を渡すだけ。
    const actionButtons = [];
    if (spec.rowActions.length > 0) {
      spec.rowActions.forEach(action => {
        const btn = createElement('button', 'effect-box-row-action', action.label);
        btn.type = 'button';
        btn.addEventListener('click', () => {
          // 保存待ちの編集も反映した「今の行」を渡す（名前を直した直後に押しても、
          // 画面に見えているとおりの相手が対象になる）。
          const row = rows.find(entry => entry.item === item);
          if (!row) return;
          action.run({
            skill: collectRow(row),
            spec,
            context: { getToken, dispatch, generateBuffId, findTokenByName }
          });
        });
        headerRow.appendChild(btn);
        actionButtons.push({ action, btn });
      });
    }

    function syncRowActions(values) {
      actionButtons.forEach(({ action, btn }) => {
        const available = isFieldAvailable(action, values);
        btn.disabled = readOnly || !available;
        btn.title = available ? action.label : `${action.label}：今は使えません`;
      });
    }

    syncFieldAvailability();

    // --- 個数と使用（アイテム＝spec.quantityを宣言したspecだけ） ---
    // 個数はここだけが持つ状態にせず、増減も使用もその場でcomponentsへ書き戻す
    // （commitNow）。使用はチャットへログを流す＝取り消せない操作なので、画面と
    // 保存済みの個数がずれたまま次の操作を受けないようにするため。
    let quantityState = null;
    if (spec.quantity) {
      quantityState = { value: clampQuantity(spec, skill?.quantity) };

      const wrap = createElement('div', 'effect-box-qty');
      const valueEl = createElement('span', 'effect-box-qty-value');
      const useBtn = createElement('button', 'effect-box-use-btn', '使用');
      useBtn.type = 'button';

      const syncQuantity = () => {
        valueEl.textContent = String(quantityState.value);
        wrap.title = `${spec.quantity.label}（${spec.quantity.min}〜${spec.quantity.max}）`;
        // 在庫が無いものは使えない。押せてしまうと「押したのに何も起きない」になる。
        useBtn.disabled = readOnly || quantityState.value <= 0;
        useBtn.title = quantityState.value > 0
          ? `${spec.noun}を1つ使い、効果をチャットへ流します`
          : `${spec.noun}が残っていません`;
      };

      const step = (delta) => {
        const next = clampQuantity(spec, quantityState.value + delta);
        if (next === quantityState.value) return;
        quantityState.value = next;
        syncQuantity();
        syncFooter();
        commitNow();
      };

      [['−', -1], ['＋', 1]].forEach(([label, delta]) => {
        const btn = createElement('button', 'effect-box-qty-btn', label);
        btn.type = 'button';
        btn.title = `${spec.quantity.label}を${delta > 0 ? '1増やす' : '1減らす'}`;
        btn.addEventListener('click', () => step(delta));
        // −・数字・＋の順に並べる（数字は先に足しておき、＋は後ろへ）
        wrap.appendChild(btn);
        if (delta < 0) wrap.appendChild(valueEl);
      });

      // 使用はコマンド（item.use）と同じ道を通す。二重に処理を持つと、同じ操作が
      // 経路によって違う結果になる。
      useBtn.addEventListener('click', () => {
        if (!getToken || !dispatch) {
          alert('この画面では使用できません。部屋の中で実行してください。');
          return;
        }
        // 先に画面の編集を確定させる（名前を直した直後に使っても、保存済みの一覧と
        // チャットのログが食い違わないように）。**そのあとでコマを読み直すこと**：
        // 確定前のコマを持ち回すと、runItemUseがそれを元に書き戻して編集を巻き戻す。
        commitNow();
        const token = getToken();
        if (!token) {
          alert('この画面では使用できません。部屋の中で実行してください。');
          return;
        }
        const items = readItems(spec, token.components);
        const target = items.find(entry => entry.name === nameInput.value.trim());
        if (!target) {
          alert(`${spec.noun}名を入れてから使用してください。`);
          return;
        }
        if (!runItemUse({ spec, items, item: target, token, dispatch })) return;
        quantityState.value = clampQuantity(spec, quantityState.value - 1);
        syncQuantity();
        syncFooter();
      });

      wrap.appendChild(useBtn);
      syncQuantity();
      headerRow.appendChild(wrap);
    }

    const removeBtn = createElement('button', 'dialog-remove-row', '×');
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      item.remove();
      const index = rows.findIndex(row => row.item === item);
      if (index !== -1) rows.splice(index, 1);
      syncFooter();
    });
    // ×はその行全体を消すボタンなので、欄を段組みしたspecでも1段目の末尾に置く
    // （最後の段に混ざると、その段の欄を消すボタンに見える）。
    const firstBreak = headerRow.querySelector('.effect-box-row-break');
    if (firstBreak) headerRow.insertBefore(removeBtn, firstBreak);
    else headerRow.appendChild(removeBtn);
    item.appendChild(headerRow);

    // 式の検証に渡す「今この行に入力されているフィールド値」。{Lv}のように
    // スキル自身のフィールドを参照する式があるため、入力のたびに読み直す。
    const readFieldValues = () => readRowFieldValues(spec, fieldInputs);

    // メモ欄。行数が多くて1行を低く保ちたい一覧（シノビガミの人物）では出さない。
    let noteInput = null;
    if (spec.allowNote) {
      noteInput = createElement('textarea', 'effect-box-note');
      noteInput.placeholder = '効果';
      noteInput.rows = 2;
      noteInput.value = skill?.note ?? '';
      item.appendChild(noteInput);
    }

    // --- ここから下（効果時間・回数制限・使用条件・修正値）は畳んでおく ---
    // 1件あたりの背が高く、名前と効果を見比べたいだけの時に一覧が読めなくなるため。
    // 中身の入力欄はDOMには常にあるので、畳んだまま保存しても値は失われない。
    // <details>にしているのは、readOnly（他人のコマを見ているだけ）でも開けるようにするため：
    // lockFormControlsはbutton/input等を無効化するが、summaryは触らない。
    const advanced = document.createElement('details');
    advanced.className = 'effect-box-advanced';
    const advancedSummary = document.createElement('summary');
    advanced.appendChild(advancedSummary);

    // 畳んだときのラベルには、中に何があるかを並べる（システムによって節の有無が変わる）。
    const advancedSections = [];

    // --- 効果時間：このスキルが与えるバフがいつ切れるか ---
    // 修正を持たないシステム（allowExpirePhase:false）では意味を持たないので出さない。
    let expireSelect = null;
    if (spec.allowExpirePhase) {
      const expireField = createElement('div', 'effect-box-combo-field');
      expireField.appendChild(createElement('span', 'effect-box-combo-label', '効果時間'));
      expireSelect = document.createElement('select');
      EXPIRE_PHASE_CHOICES.forEach(choice => {
        const option = document.createElement('option');
        option.value = choice.key;
        option.textContent = choice.label;
        expireSelect.appendChild(option);
      });
      expireSelect.value = skill?.expirePhase ?? '';
      expireSelect.title = '「（使用時の既定）」は、単体で使うかコンボに組み込むかで自動的に決まります';
      expireField.appendChild(expireSelect);
      advanced.appendChild(expireField);
      advancedSections.push('効果時間');
    }

    // --- 使用制限：期間ごとの回数 ---
    const limitsWrap = createElement('div', 'effect-box-limits');
    const limitControls = {};
    spec.periods.forEach(period => {
      const limit = skill?.limits?.counts?.[period.key] ?? { current: 0, max: null };

      const limitRow = createElement('div', 'effect-box-limit-row');
      limitRow.appendChild(createElement('span', 'effect-box-limit-label', period.label));

      const currentInput = document.createElement('input');
      currentInput.type = 'number';
      currentInput.className = 'effect-box-limit-current';
      currentInput.min = '0';
      currentInput.value = limit.current ?? 0;
      limitRow.appendChild(currentInput);

      limitRow.appendChild(createElement('span', 'effect-box-limit-slash', '/'));

      // 上限がシステム側で決まっている期間（fixedMax）は入力欄を出さず、文字で見せる。
      // 使用済み回数（current）だけは数え間違いを直せるよう残す。
      let maxInput = null;
      if (period.fixedMax !== undefined && period.fixedMax !== null) {
        const fixed = createElement('span', 'effect-box-limit-fixed', String(period.fixedMax));
        fixed.title = 'このシステムでは上限が決まっています';
        limitRow.appendChild(fixed);
      } else {
        // 上限は「EB回まで」のようなスキルがあるため、数値ではなく式を書けるようにしてある
        maxInput = document.createElement('input');
        maxInput.type = 'text';
        maxInput.className = 'effect-box-limit-max';
        maxInput.placeholder = '無制限';
        maxInput.title = `空欄で無制限。数値のほか式も使える（使える名前: ${formulaNamesHint}）`;
        maxInput.value = limit.max ?? '';
        limitRow.appendChild(maxInput);
      }

      limitRow.appendChild(createElement('span', null, '回'));
      limitsWrap.appendChild(limitRow);
      limitControls[period.key] = { currentInput, maxInput };
    });
    // 期間を1つも宣言していないシステムでは中身が空になるので、節ごと出さない
    if (spec.periods.length > 0) {
      advanced.appendChild(limitsWrap);
      advancedSections.push('回数制限');
    }

    // --- 使用制限：条件（「〇〇が△以下」）。全て満たさないと使用できない ---
    const conditionsWrap = createElement('div', 'effect-box-limits');
    conditionsWrap.appendChild(createElement('div', 'effect-box-combo-title', '使用条件（すべて満たすと使用できる）'));
    const conditionListEl = createElement('div', 'effect-box-limits');
    conditionsWrap.appendChild(conditionListEl);

    const conditionRows = [];

    function addConditionRow(condition) {
      const row = createElement('div', 'effect-box-limit-row');

      const leftInput = document.createElement('input');
      leftInput.type = 'text';
      leftInput.className = 'effect-box-limit-max';
      leftInput.placeholder = '例: {HP}';
      leftInput.title = `使える名前: ${formulaNamesHint}`;
      leftInput.value = condition?.left ?? '';

      const comparatorSelect = document.createElement('select');
      COMPARATORS.forEach(comparator => {
        const option = document.createElement('option');
        option.value = comparator.key;
        option.textContent = comparator.label;
        comparatorSelect.appendChild(option);
      });
      comparatorSelect.value = condition?.comparator ?? 'lte';

      const rightInput = document.createElement('input');
      rightInput.type = 'text';
      rightInput.className = 'effect-box-limit-max';
      rightInput.placeholder = '例: 10';
      rightInput.title = `使える名前: ${formulaNamesHint}`;
      rightInput.value = condition?.right ?? '';

      const removeConditionBtn = createElement('button', 'dialog-remove-row', '×');
      removeConditionBtn.type = 'button';
      removeConditionBtn.addEventListener('click', () => {
        row.remove();
        const index = conditionRows.findIndex(entry => entry.row === row);
        if (index !== -1) conditionRows.splice(index, 1);
        validate();
      });

      row.appendChild(leftInput);
      row.appendChild(comparatorSelect);
      row.appendChild(rightInput);
      row.appendChild(removeConditionBtn);
      conditionListEl.appendChild(row);

      [leftInput, rightInput].forEach(input => input.addEventListener('input', validate));
      conditionRows.push({ row, leftInput, comparatorSelect, rightInput });
    }

    // 使用という概念が無い一覧（allowConditions:false）では節ごと出さない。
    // 行が1つも作られないので、保存時の条件も自動的に空になる。
    if (spec.allowConditions) {
      (skill?.limits?.conditions ?? []).forEach(addConditionRow);

      const addConditionBtn = createElement('button', 'dialog-add-row-btn', '+ 使用条件を追加');
      addConditionBtn.type = 'button';
      addConditionBtn.addEventListener('click', () => addConditionRow(null));
      conditionsWrap.appendChild(addConditionBtn);
      advanced.appendChild(conditionsWrap);
      advancedSections.push('使用条件');
    }

    // 評価できない式は使用時に黙って0として扱われる（＝バフが付かない）ため、入力した時点で
    // 理由を出す。保存自体はブロックしない（式を後から埋める運用を邪魔しないため）。
    // 修正欄を出さないシステムでも、上限と使用条件の式は検証するので常に置く。
    const errorEl = createElement('div', 'effect-box-combo-error');
    errorEl.style.display = 'none';

    // --- 使用時の修正：対象パラメータ＋式。何件でも持てる ---
    // 修正を扱わないシステム（allowMods:false）では節ごと出さない。modTargetsを空にする
    // だけでは、下の「その他のパラメータ」から全パラメータが選べてしまうため。
    const modRows = [];
    const modsWrap = createElement('div', 'effect-box-combo-mods');
    modsWrap.appendChild(createElement('div', 'effect-box-combo-title', '使用時の修正（自身に付与）'));
    const modListEl = createElement('div', 'effect-box-limits');
    modsWrap.appendChild(modListEl);

    function addModRow(mod) {
      const row = createElement('div', 'effect-box-limit-row');

      const targetSelect = document.createElement('select');
      const noneOption = document.createElement('option');
      noneOption.value = '';
      noneOption.textContent = '（対象なし）';
      targetSelect.appendChild(noneOption);

      const appendOptions = (groupLabel, entries) => {
        if (entries.length === 0) return;
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        entries.forEach(({ paramId, label }) => {
          const option = document.createElement('option');
          option.value = paramId;
          option.textContent = label;
          group.appendChild(option);
        });
        targetSelect.appendChild(group);
      };
      appendOptions(`${spec.noun}の修正値`, spec.modTargets.map(t => ({ paramId: t.paramId, label: t.label })));
      appendOptions('その他のパラメータ', otherParams);
      targetSelect.value = mod?.paramId ?? '';

      const formulaInput = document.createElement('input');
      formulaInput.type = 'text';
      formulaInput.className = 'effect-box-combo-formula';
      formulaInput.placeholder = '例: 3 / {Lv}*2';
      formulaInput.title = `使える名前: ${formulaNamesHint}`;
      formulaInput.value = mod?.formula ?? '';

      // 追加欄（DX3のクリティカル値下限）は、宣言のある対象を選んだときだけ出す
      const extraInput = document.createElement('input');
      extraInput.type = 'number';
      extraInput.className = 'effect-box-combo-input';

      const syncExtra = () => {
        const modTarget = spec.findModTarget(targetSelect.value);
        if (modTarget?.extra) {
          extraInput.style.display = '';
          extraInput.placeholder = modTarget.extra.label;
          extraInput.title = modTarget.extra.hint || modTarget.extra.label;
        } else {
          extraInput.style.display = 'none';
          // 対象を切り替えたときに、前の対象で入れた値が残って保存されないようにする
          extraInput.value = '';
        }
      };
      const initialTarget = spec.findModTarget(mod?.paramId ?? '');
      if (initialTarget?.extra) {
        const value = mod?.extra?.[initialTarget.extra.key];
        if (Number.isFinite(value)) extraInput.value = value;
      }
      syncExtra();

      const removeModBtn = createElement('button', 'dialog-remove-row', '×');
      removeModBtn.type = 'button';
      removeModBtn.addEventListener('click', () => {
        row.remove();
        const index = modRows.findIndex(entry => entry.row === row);
        if (index !== -1) modRows.splice(index, 1);
        validate();
      });

      row.appendChild(targetSelect);
      row.appendChild(formulaInput);
      row.appendChild(extraInput);
      row.appendChild(removeModBtn);
      modListEl.appendChild(row);

      targetSelect.addEventListener('change', syncExtra);
      formulaInput.addEventListener('input', validate);
      modRows.push({ row, targetSelect, formulaInput, extraInput });
    }

    if (spec.allowMods) {
      (skill?.mods ?? []).forEach(addModRow);

      const addModBtn = createElement('button', 'dialog-add-row-btn', '+ 修正を追加');
      addModBtn.type = 'button';
      addModBtn.addEventListener('click', () => addModRow(null));
      modsWrap.appendChild(addModBtn);

      advanced.appendChild(modsWrap);
      advancedSections.push('修正値');
    }

    // 中身が1つも無いシステム（節を全部offにした一覧）では、開くものが無いので出さない
    if (advancedSections.length > 0) {
      const syncAdvancedLabel = () => {
        advancedSummary.textContent = advanced.open
          ? '折りたたむ'
          : `展開（${advancedSections.join('・')}）`;
      };
      advanced.addEventListener('toggle', syncAdvancedLabel);
      syncAdvancedLabel();
      item.appendChild(advanced);
    }

    // 式の問題は畳んだ中身に対するものでも外に出す（畳んでいると気づけないため）
    item.appendChild(errorEl);

    function validate() {
      const fieldValues = readFieldValues();
      const problems = [];

      modRows.forEach(({ targetSelect, formulaInput }) => {
        const message = describeFormulaProblem(formulaInput.value, fieldValues);
        if (!message) return;
        const label = spec.findModTarget(targetSelect.value)?.label
          ?? parameters[targetSelect.value]?.label
          ?? '修正';
        problems.push(`${label}: ${message}`);
      });

      spec.periods.forEach(period => {
        // 上限が固定の期間は入力欄が無い（＝式も書けない）ので検証する対象が無い
        const maxInput = limitControls[period.key].maxInput;
        if (!maxInput) return;
        const message = describeFormulaProblem(maxInput.value, fieldValues);
        if (message) problems.push(`${period.label}の上限: ${message}`);
      });

      conditionRows.forEach(({ leftInput, rightInput }, index) => {
        [leftInput, rightInput].forEach(input => {
          const message = describeFormulaProblem(input.value, fieldValues);
          if (message) problems.push(`使用条件${index + 1}: ${message}`);
        });
      });

      errorEl.textContent = problems.join('\n');
      errorEl.style.display = problems.length > 0 ? '' : 'none';
    }

    spec.periods.forEach(period => {
      limitControls[period.key].maxInput?.addEventListener('input', validate);
    });
    // {Lv}のようにフィールドを参照する式があるため、フィールドを直したら検証し直す。
    // 合計の行（footerNote）も欄の値から決まるので、同じ入力で引き直す
    // （アリアンロッドの重量を直した瞬間に携帯重量が動く）。
    Object.values(fieldInputs).forEach(input => {
      input.addEventListener('input', validate);
      input.addEventListener('input', () => syncFooter());
    });
    validate();

    listEl.appendChild(item);
    rows.push({
      item, nameInput, fieldInputs, noteInput, expireSelect,
      limitControls, conditionRows, modRows, quantityState
    });
  }

  normalizeSkillList(spec, skills).forEach(addRow);

  const addBtn = createElement('button', 'dialog-add-row-btn', `+ ${spec.noun}を追加`);
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => { addRow(null); syncFooter(); });
  form.appendChild(addBtn);

  // 一覧の下の1行。何を出すかはspecが決め、ボックスは文字列と警告の有無を描くだけ
  // （アリアンロッドの「携帯重量／重量上限」。上限を超えたら赤字）。
  if (typeof spec.footerNote === 'function') {
    const footerEl = createElement('div', 'effect-box-footer');
    form.appendChild(footerEl);

    syncFooter = () => {
      // 保存待ちの編集も含めた「画面の今の値」で引く（保存するまで合計が動かないと、
      // 上限を超えたことに気付けるのが保存の後になってしまう）。
      const note = spec.footerNote({ skills: collectSkills(), parameters }) ?? null;
      footerEl.textContent = note?.text ?? '';
      footerEl.classList.toggle('is-over', !!note?.warning);
      footerEl.style.display = note?.text ? '' : 'none';
    };
    syncFooter();
  }

  // 使用コマンドをまとめてコピー（チャットパレット用）。spec.hasUseCommandを宣言した
  // 一覧だけに出す（アイテムのitem.use、使用の概念が無い一覧では実際に送れるコマンドが
  // 無いため）。保存待ちの編集も含めた画面の今の値から組む（保存前でも名前を確かめて
  // すぐコピーできるように）。
  let copyBtn = null;
  if (spec.hasUseCommand) {
    copyBtn = createElement('button', 'dialog-add-row-btn', '使用コマンドをコピー');
    copyBtn.type = 'button';
    copyBtn.title = `登録した${spec.noun}の「${spec.noun}使用(名前)」をまとめてコピーします。チャットパレットに貼り付けて使えます。`;
    copyBtn.addEventListener('click', async () => {
      const lines = collectSkills().map(skill => buildSkillUseCommand(spec, skill.name));
      if (lines.length === 0) {
        alert(`登録されている${spec.noun}がありません。`);
        return;
      }
      const originalLabel = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(lines.join('\n'));
        copyBtn.textContent = 'コピーしました';
      } catch (error) {
        alert(`クリップボードへのコピーに失敗しました: ${error.message}`);
        return;
      }
      setTimeout(() => { copyBtn.textContent = originalLabel; }, 1500);
    });
    form.appendChild(copyBtn);
  }

  const btnRow = createElement('div', 'dialog-button-row');
  const cancelBtn = createElement('button', null, 'キャンセル');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => dialog.close());

  const saveBtn = createElement('button', 'dialog-confirm-btn', '保存');
  saveBtn.type = 'submit';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  if (readOnly) {
    addBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    cancelBtn.textContent = '閉じる';
    // コピーは状態を変えないので、他人の一覧を表示だけしている時も押せたままにする。
    lockFormControls(form, { keep: [cancelBtn, copyBtn] });
  }

  // 画面の行を、componentsへ保存する配列にする。保存ボタン（submit）と、
  // 個数の増減・使用（アイテムのときだけ出るボタン）の即時保存の両方から呼ぶ。
  // 行1つを、componentsへ保存する形にする。保存ボタンと、行ごとの任意ボタン
  // （rowActionsのrunへ渡す「今の行」）の両方から使う。
  function collectRow(row) {
    const fields = {};
    spec.fields.forEach(field => {
      const value = readFieldValue(field, row.fieldInputs[field.key]);
      fields[field.key] = typeof value === 'string' ? value.trim() : value;
    });

    const counts = {};
    spec.periods.forEach(period => {
      const { currentInput, maxInput } = row.limitControls[period.key];
      // 上限が固定の期間は入力欄が無いので宣言値をそのまま書く
      // （読み出し側のnormalizeSkillも同じ値へ揃えるので、どちらから来ても一致する）
      const rawMax = maxInput ? maxInput.value.trim() : String(period.fixedMax);
      counts[period.key] = {
        current: Number(currentInput.value) || 0,
        // 式のまま保存し、使用時に解決する（数値へ丸めると{EB}等が失われるため）
        max: rawMax === '' ? null : rawMax
      };
    });

    const conditions = row.conditionRows
      .map(({ leftInput, comparatorSelect, rightInput }) => ({
        left: leftInput.value.trim(),
        comparator: comparatorSelect.value,
        right: rightInput.value.trim()
      }))
      .filter(condition => condition.left !== '' || condition.right !== '');

    const mods = row.modRows
      .filter(({ targetSelect }) => targetSelect.value !== '')
      .map(({ targetSelect, formulaInput, extraInput }) => {
        const paramId = targetSelect.value;
        const mod = { paramId, formula: formulaInput.value.trim(), target: 'self', extra: {} };
        const modTarget = spec.findModTarget(paramId);
        if (modTarget?.extra) {
          const rawExtra = extraInput.value.trim();
          if (rawExtra !== '') mod.extra[modTarget.extra.key] = Number(rawExtra) || 0;
        }
        return mod;
      });

    return {
      name: row.nameInput.value.trim(),
      // メモ欄を出さないシステムでは入力欄そのものが無い（allowNote:false）
      note: row.noteInput ? row.noteInput.value : '',
      fields,
      // 効果時間を扱わないシステムでは選択欄そのものが無い
      expirePhase: row.expireSelect ? row.expireSelect.value : '',
      limits: { counts, conditions },
      mods,
      // 個数を持たないシステムではキーごと出さない（保存形を変えないため）
      ...(row.quantityState ? { quantity: row.quantityState.value } : {})
    };
  }

  // 画面の行を、componentsへ保存する配列にする。保存ボタン（submit）と、
  // 個数の増減・使用（アイテムのときだけ出るボタン）の即時保存の両方から呼ぶ。
  // 名前が空の行は落とす（旧UIも保存時に同じ条件で捨てていた）。
  function collectSkills() {
    return rows.map(collectRow).filter(skill => skill.name !== '');
  }

  // ダイアログを閉じずにその場で保存する。個数の増減と使用だけが通る道で、
  // 名前や効果の編集は今までどおり保存ボタンまで溜める（打ちかけの値を撒かないため）。
  function commitNow() {
    onSave(collectSkills());
  }

  if (!readOnly) form.addEventListener('submit', (event) => {
    event.preventDefault();
    dialog.close();
    onSave(collectSkills());
  });

  dialog.appendChild(form);
  dialog.showModal();
}
