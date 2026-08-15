// js/parameters/dracurouge.js
// ドラクルージュのプラグイン記述子。
//
// このシステム特有の事情が3つあり、それぞれCoreを改造せずに扱っている。
//
// 1. HPを使わない
//    core:hpはコマ作成時に必ず配られ（js/game-store.jsのADD_CHARACTER）、プラグイン側から
//    配布を止める手段が無い。そこで削除ではなく「存在点」へ改称して流用する。
//    改称はIMPORT_CHARACTER_DATAのlabelOverridesで行う（renameHpToExistence）。
//
// 2. PCとNPCで能力値が異なる
//    buildCharacterParametersは引数を受け取れないので、種別ごとにパラメータ集合を
//    変えることはできない。PC用・NPC用の両方を最初から配っておき、キャラクター一覧へ
//    出すかどうか（visible）の出し分けで種別を表現する。切り替えはSET_PARAMETER_VISIBILITYで、
//    このアクションは値を変えないためsourceもeditableも見ない（js/game-store.js:981-996）。
//
// 3. 絆が5つ溜まると潤い／渇きが増える
//    潤い・渇きは利用者が手でも増減させる値なので、computeDerivedParametersで毎回
//    計算し直すと手入力が効かなくなる。そこで「新たに5つ揃った絆の数」だけを
//    絆ボックスから受け取り、その分をSET_PARAMETERで加算する（applyAward）。
//    二重加算しない根拠は絆データ側のsealedフラグ（dracurouge-bond-box.js）。

import { buildParameters } from './paramFactory.js';
import { lockFormControls } from '../read-only-form.js';
import { BOND_COMPONENT_KEY, normalizeBondList, showBondBox } from './dracurouge-bond-box.js';
import { createDiceDraftSpec } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';

const PLUGIN_ID = 'DRACUROUGE';

// BCDice側のシステムID。ルーム設定でこのプラグインを選ぶと、ダイスコマンドの解釈規則も
// これに合わせて切り替わる（js/main.jsのプラグイン選択。stampsと同じく宣言するだけ）。
export const DRACUROUGE_BCDICE_SYSTEM = 'Dracurouge';

// core:hpの改称後のラベル。改称済みかどうかの判定にも使う。
const HP_PARAM_ID = 'core:hp';
const HP_DEFAULT_LABEL = 'HP';
const EXISTENCE_LABEL = '存在点';

const CHAR_TYPE_PC = 'PC';
const CHAR_TYPE_NPC = 'NPC';

// 種別。キャラクター一覧には出さない（visible:false）が、パネルから書き換えるので
// editable:trueが要る（editable:falseだとSET_PARAMETERがガードに弾かれる）。
const CHAR_TYPE_PARAMETER = {
  key: 'charType', label: '種別', value: CHAR_TYPE_PC,
  locked: true, editable: true, visible: false
};

// fieldはこのファイル内でのUIの出し分けにだけ使う目印。buildParametersは
// key/label/value/locked/editable/visible/roundOnly以外を読まないので、混ぜても害は無い。
const PC_PARAMETERS = [
  { key: 'moisture', label: '潤い', value: 0, locked: true, editable: true, visible: true, field: 'number' },
  { key: 'thirst', label: '渇き', value: 0, locked: true, editable: true, visible: true, field: 'number' },
  { key: 'applause', label: '喝采点', value: 0, locked: true, editable: true, visible: true, field: 'number' },
  { key: 'path', label: '道', value: '', locked: true, editable: true, visible: true, field: 'path' }
];

// NPCの能力値は未確定。確定したらこの配列へ足すだけで、パネルの描画・visibleの同期・
// 既存コマへの補完（locked:true）がそのまま動く。
// 宣言時のvisibleはfalseにすること：新規コマの既定はPCなので、NPC用は最初は隠しておき、
// 種別を切り替えたときにsyncTypeVisibilityが出す。
const NPC_PARAMETERS = [];

// 道の選択肢（仮）。ここに無い値（旧リストの値）も、保存されていればその行の選択肢として
// 一時的に追加される（buildPathSelect）。
const PATH_OPTIONS = ['野獣', '狩人', '遍歴', '近衛', '領主', '賢者'];

const paramIdOf = (definition) => `${PLUGIN_ID}:${definition.key}`;

const CHAR_TYPE_PARAM_ID = paramIdOf(CHAR_TYPE_PARAMETER);
const MOISTURE_PARAM_ID = `${PLUGIN_ID}:moisture`;
const THIRST_PARAM_ID = `${PLUGIN_ID}:thirst`;

const PC_PARAM_IDS = PC_PARAMETERS.map(paramIdOf);
const NPC_PARAM_IDS = NPC_PARAMETERS.map(paramIdOf);
// 種別によって一覧への出し入れが切り替わるパラメータ全部（種別そのものは常に非表示）
const TYPED_PARAM_IDS = [...PC_PARAM_IDS, ...NPC_PARAM_IDS];

function buildDracurougeCharacterParameters() {
  return buildParameters(PLUGIN_ID, [CHAR_TYPE_PARAMETER, ...PC_PARAMETERS, ...NPC_PARAMETERS]);
}

function readCharType(parameters) {
  return parameters?.[CHAR_TYPE_PARAM_ID]?.value === CHAR_TYPE_NPC ? CHAR_TYPE_NPC : CHAR_TYPE_PC;
}

function definitionsFor(charType) {
  return charType === CHAR_TYPE_NPC ? NPC_PARAMETERS : PC_PARAMETERS;
}

// 道のドロップダウン。選択肢（仮）に無い値でも、現在の値であれば選択肢として足しておく
// （選択肢を差し替える前に保存した値が消えないようにするため）。
function buildPathSelect(currentValue) {
  const select = document.createElement('select');

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '（未設定）';
  select.appendChild(blank);

  const values = PATH_OPTIONS.includes(currentValue) || !currentValue
    ? PATH_OPTIONS
    : [...PATH_OPTIONS, currentValue];

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = currentValue || '';
  return select;
}

function buildTypeSelect(charType) {
  const select = document.createElement('select');
  [
    { value: CHAR_TYPE_PC, label: 'PC' },
    { value: CHAR_TYPE_NPC, label: 'NPC' }
  ].forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = charType;
  return select;
}

function renderDracurougeCharacterPanel({
  container, mode, canEdit = true, parameters = {}, components,
  onComponentChange, getComponents, dispatch, getToken, tokenId
}) {
  container.innerHTML = '';

  const isEditing = mode === 'edit';
  // 既存のコマに対して、この人が状態を変えてよいか。ここがtrueのときだけdispatchする。
  const canWrite = isEditing && canEdit && typeof dispatch === 'function' && !!tokenId;
  // ダイアログを開いたまま複数回編集しても巻き戻らないよう、都度最新を読む
  // （js/parameters/stella-knights.jsのreadComponentsと同じ理由）。
  const readParameters = () => getToken?.()?.parameters ?? parameters;

  const title = document.createElement('h4');
  title.textContent = 'ドラクルージュ';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#fff';
  container.appendChild(title);

  if (canWrite) renameHpToExistence({ readParameters, dispatch, tokenId });

  // --- 種別（PC / NPC）---
  let charType = readCharType(readParameters());

  const typeRow = document.createElement('div');
  typeRow.className = 'dialog-custom-row';
  const typeLabel = document.createElement('label');
  typeLabel.className = 'dialog-param-label';
  typeLabel.textContent = '種別';
  typeLabel.style.alignSelf = 'center';
  typeLabel.style.color = '#ccc';
  typeLabel.style.fontSize = '0.85rem';
  const typeSelect = buildTypeSelect(charType);
  typeSelect.disabled = !canEdit;
  typeRow.appendChild(typeLabel);
  typeRow.appendChild(typeSelect);
  container.appendChild(typeRow);

  const list = document.createElement('div');
  list.className = 'dialog-custom-list';
  container.appendChild(list);

  // 種別に合う行だけを描く。getValues()も描かれている行しか返さないので、
  // 使っていない側のパラメータを0で潰してしまうことがない。
  let rows = [];
  function renderParamRows() {
    list.innerHTML = '';
    const current = readParameters();

    rows = definitionsFor(charType).map(definition => {
      const paramId = paramIdOf(definition);
      const value = current[paramId]?.value;

      const row = document.createElement('div');
      row.className = 'dialog-custom-row';

      const label = document.createElement('label');
      label.className = 'dialog-param-label';
      label.textContent = definition.label;
      label.style.alignSelf = 'center';
      label.style.color = '#ccc';
      label.style.fontSize = '0.85rem';

      let input;
      if (definition.field === 'path') {
        input = buildPathSelect(typeof value === 'string' ? value : '');
      } else {
        input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.value = Number(value) || 0;
      }
      input.disabled = !canEdit;

      row.appendChild(label);
      row.appendChild(input);
      list.appendChild(row);

      return { paramId, field: definition.field, input };
    });
  }
  renderParamRows();

  // 描いた直後に一度揃える。作成時に種別だけ選んだコマ（visibleはまだPCの形）を、
  // 最初に更新画面を開いた時点で正しい見え方にするため。
  if (canWrite) syncTypeVisibility();

  typeSelect.addEventListener('change', () => {
    charType = typeSelect.value === CHAR_TYPE_NPC ? CHAR_TYPE_NPC : CHAR_TYPE_PC;
    renderParamRows();
    // 種別の保存と見え方の切り替えは、ダイアログの「更新」を待たずここで済ませる。
    // 待つと、キャンセルしたときに見え方だけが変わって残ってしまう。
    if (canWrite) {
      dispatch('SET_PARAMETER', { characterId: tokenId, paramId: CHAR_TYPE_PARAM_ID, value: charType });
      syncTypeVisibility();
    }
  });

  // 現在の種別に合わせて、キャラクター一覧へ出すかどうかを揃える。
  // 実際に変わるものだけdispatchする（js/character-dialog.jsのapplyCharacterEditResultと同じ規約）。
  function syncTypeVisibility() {
    const current = readParameters();
    const shown = charType === CHAR_TYPE_NPC ? NPC_PARAM_IDS : PC_PARAM_IDS;

    TYPED_PARAM_IDS.forEach(paramId => {
      const param = current[paramId];
      if (!param) return; // このプラグインより前に作られたコマ。補完されるまでは触らない
      const shouldShow = shown.includes(paramId);
      if ((param.visible !== false) === shouldShow) return;
      dispatch('SET_PARAMETER_VISIBILITY', { characterId: tokenId, paramId, visible: shouldShow });
    });
  }

  // 絆が5つ揃った分を加算する。基礎値に足すこと（getEffectiveParameterValueの結果を
  // 書き戻すとバフが二重に効く。docs/plugin-guide.md 7章）。
  function applyAward(paramId, count) {
    if (!canWrite || count <= 0) return;

    const before = Number(readParameters()[paramId]?.value) || 0;
    const after = before + count;
    dispatch('SET_PARAMETER', { characterId: tokenId, paramId, value: after });

    // 開いたままの更新ダイアログの入力欄も直す。直さないと、続けて「更新」を押した瞬間に
    // getValues()が古い値を返して、いま足した分が消える。
    const row = rows.find(r => r.paramId === paramId);
    if (row) row.input.value = after;
  }

  // --- 絆一覧（ボックス）---
  // 既存キャラクターの更新時のみ開ける（新規作成時はまだcomponentsを持たないため対象外。
  // 既存プラグインのボックス系ボタンと同じ扱い）。
  let bondBtn = null;
  if (isEditing && onComponentChange) {
    const readComponents = () => (getComponents ? getComponents() : components) ?? {};
    const readBonds = () => normalizeBondList(readComponents()[BOND_COMPONENT_KEY]);

    bondBtn = document.createElement('button');
    bondBtn.type = 'button';
    bondBtn.className = 'dialog-add-row-btn';
    bondBtn.style.marginTop = '8px';

    const updateBondBtnLabel = () => {
      bondBtn.textContent = `絆一覧を開く（${readBonds().length}件）`;
    };
    updateBondBtnLabel();

    bondBtn.addEventListener('click', () => {
      showBondBox({
        bonds: readBonds(),
        readOnly: !canEdit,
        onSave: (nextBonds, { rougeSealed, noirSealed }) => {
          onComponentChange(BOND_COMPONENT_KEY, nextBonds);
          applyAward(MOISTURE_PARAM_ID, rougeSealed); // ルージュ → 潤い
          applyAward(THIRST_PARAM_ID, noirSealed);    // ノワール → 渇き
          updateBondBtnLabel();
        }
      });
    });
    container.appendChild(bondBtn);
  }

  // 表示だけの人には入力を固め、ボックスを開くボタンだけ残す
  // （ボックスの中身はreadOnlyで表示専用になる）。
  if (!canEdit) {
    lockFormControls(container, { keep: [bondBtn] });
  }

  return {
    getValues: () => {
      const values = { [CHAR_TYPE_PARAM_ID]: charType };
      rows.forEach(({ paramId, field, input }) => {
        values[paramId] = field === 'path'
          ? input.value
          : Math.max(0, Math.trunc(Number(input.value) || 0));
      });
      return values;
    }
  };
}

// このシステムはHPを使わず、代わりに「存在点」を持つ。core:hpは配布を止められないので、
// ラベルだけ差し替えて流用する。値の手入力・表示切り替え・公開先の指定は
// Coreの既定パラメータのまま使える。
//
// ラベルがまだ既定の「HP」のときだけ動くのが冪等性の要。これが無いと更新画面を開くたびに
// dispatchが飛ぶ。利用者が自分で別の名前に変えた場合も、その名前を尊重して触らない。
//
// 【承知の上での割り切り】Coreは左カラム（Core既定パラメータの一覧）をプラグイン専用スペースより
// 先に組み立てるので、改称した瞬間に開いているダイアログの表示は「HP」のまま残る。
// 状態は正しく書き換わっているため、閉じて開き直せば「存在点」になる。
// ここで左カラムのDOMを書き換えれば見た目も揃うが、プラグインがCore側のDOMに手を伸ばすことに
// なる（しかも手がかりはラベルの文字列一致しかない）ので、1回だけの表示の遅れを受け入れている。
function renameHpToExistence({ readParameters, dispatch, tokenId }) {
  const hp = readParameters()[HP_PARAM_ID];
  if (!hp || hp.label !== HP_DEFAULT_LABEL) return;

  // ラベルの差し替え口はIMPORT_CHARACTER_DATAのlabelOverridesしかない
  // （SET_PARAMETERは値専用。js/parameters/dx3.jsが能力値の書き込みに使っているのと同じ経路）。
  dispatch('IMPORT_CHARACTER_DATA', {
    id: tokenId,
    labelOverrides: { [HP_PARAM_ID]: EXISTENCE_LABEL }
  });
}

// ダイスドラフト。treat(n) で振った目がプールへ溜まり、パネル（js/dice-draft-panel.js）で
// スキルへ割り当てる。
//
// このシステムのスキルは「合計が目標値以上で使用」＝ requirement の kind:'sum' になるが、
// ドラクルージュにはまだスキル一覧の仕組み自体が無いので skillSpec も requirement も未設定。
// パネルはプールだけを見せる。スキル一覧（createSkillSpecで目標値の欄を持つもの）を作ったら、
// ここへ skillSpec と requirement: { kind:'sum', targetField:'目標値の欄のkey' } を足すだけで
// 割り当てまで動く。
const DRACUROUGE_DRAFT_SPEC = createDiceDraftSpec({
  id: 'dracurouge-draft',
  label: '血の宴',
  diceSides: 6,
  bcdiceSystem: DRACUROUGE_BCDICE_SYSTEM
});

const TREAT_COMMAND_PATTERN = /^treat\((\d+)\)$/i;

function looksLikeDracurougeChatCommand(rawInput) {
  return TREAT_COMMAND_PATTERN.test(String(rawInput).trim());
}

// 個数の検証・コマ未選択・ダイスを振れない画面の案内は runDiceDraftRoll がまとめて行うので、
// ここは書式の判定だけをする。
function handleDracurougeChatCommand(rawInput, { token, dispatch, rollBCDice }) {
  const input = String(rawInput).trim();
  const match = input.match(TREAT_COMMAND_PATTERN);
  if (!match) return false;

  runDiceDraftRoll({
    spec: DRACUROUGE_DRAFT_SPEC,
    token,
    dispatch,
    rollBCDice,
    count: Number(match[1]),
    chatCommand: input
  });

  // 書式が合った時点で必ずtrueを返す（falseだとCoreがただのダイスコマンドとして再解釈する）
  return true;
}

export const DRACUROUGE_PLUGIN = {
  id: PLUGIN_ID,
  label: 'ドラクルージュ',
  buildCharacterParameters: buildDracurougeCharacterParameters,
  renderCharacterPanel: renderDracurougeCharacterPanel,
  handleChatCommand: handleDracurougeChatCommand,
  looksLikeOwnChatCommand: looksLikeDracurougeChatCommand,
  diceDraft: DRACUROUGE_DRAFT_SPEC,
  bcdiceSystem: DRACUROUGE_BCDICE_SYSTEM
  // computeDerivedParametersは実装しない。潤い・渇きは利用者が手でも増減させる値で、
  // 自動計算で毎回上書きすると手入力が効かなくなるため（加算はapplyAward）。
};
