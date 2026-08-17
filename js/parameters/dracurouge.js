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
//    消えざる絆だけはsealedにせず、最初の1つを残して積み直させる＝何度でも加算される
//    （二重加算にならないのは、加算と同時に枠が空くため）。

import { buildParameters } from './paramFactory.js';
import { lockFormControls } from '../read-only-form.js';
import {
  BOND_COMPONENT_KEY, normalizeBondList, settleFilledBonds, showBondBox
} from './dracurouge-bond-box.js';
import { createDie, createDiceDraftSpec, readTargetModifier } from './dice-draft/dice-draft-model.js';
import { runDiceDraftRoll } from './dice-draft/dice-draft-roll.js';
import { runDiceDraftUse } from './dice-draft/dice-draft-use.js';
import {
  buildSkillUseCommandPattern, createSkillSpec, normalizeSkillList, resetSkillUsageOnPhaseEnd
} from './skill/skill-model.js';
import { showSkillBox } from './skill/skill-box.js';

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

// 目標値修正。行いの目標値を全部まとめて増減させる（適用はevaluatePlacement）。
// 手では動かさずバフ/デバフだけが動かすので editable:false（DX3のAnB/AcBと同じ扱い）。
// 常に0の行がキャラクター一覧に増えても邪魔なだけなので visible:false。
//
// キーが短いのはバフ()コマンドの都合。ラベルに「(」を含むパラメータはキー名で指定する
// 仕様（js/main.jsのtryHandleBuffCommand）なので、TBにしておくと
// 「バフ(祝福,TB,-1,判定)」と書ける。ダイアログからは「目標値修正(TB)」の名前で選べる。
const TARGET_BONUS_PARAMETER = {
  key: 'TB', label: '目標値修正(TB)', value: 0,
  locked: true, editable: false, visible: false
};

// 手番順。道と種別から自動で決まる内部の数値で、手では動かさない（editable:false）。
// ラウンド進行がこの実効値の昇順で手番を回す（buildDracurougeRoundPhaseTemplateのturnOrder）。
// 常に0の行が一覧に増えても邪魔なだけなので visible:false。
const TURN_ORDER_PARAMETER = {
  key: 'turnOrder', label: '手番順', value: 1,
  locked: true, editable: false, visible: false
};

// 目標値の下限。どれだけ修正が乗っても、これより低い目標値にはならない。
const DEED_TARGET_FLOOR = 2;

// ラウンドの頭に戻る抗う力の値。
const RESIST_PER_ROUND = 2;

// fieldはこのファイル内でのUIの出し分けにだけ使う目印。buildParametersは
// key/label/value/locked/editable/visible/roundOnly以外を読まないので、混ぜても害は無い。
const PC_PARAMETERS = [
  { key: 'moisture', label: '潤い', value: 0, locked: true, editable: true, visible: true, field: 'number' },
  { key: 'thirst', label: '渇き', value: 0, locked: true, editable: true, visible: true, field: 'number' },
  { key: 'applause', label: '喝采点', value: 0, locked: true, editable: true, visible: true, field: 'number' },
  // ラウンドの頭に2へ戻り、使うと減る。手でも動かす値なので editable:true。
  // 戻すのは applyDracurougeRoundPhaseStart（ラウンド進行のセットアップの段）。
  { key: 'resist', label: '抗う力', value: RESIST_PER_ROUND, locked: true, editable: true, visible: true, field: 'number' },
  { key: 'path', label: '道', value: '', locked: true, editable: true, visible: true, field: 'path' }
];

// NPCの能力値は未確定。確定したらこの配列へ足すだけで、パネルの描画・visibleの同期・
// 既存コマへの補完（locked:true）がそのまま動く。
// 宣言時のvisibleはfalseにすること：新規コマの既定はPCなので、NPC用は最初は隠しておき、
// 種別を切り替えたときにsyncTypeVisibilityが出す。
const NPC_PARAMETERS = [];

// 道の選択肢（仮）。ここに無い値（旧リストの値）も、保存されていればその行の選択肢として
// 一時的に追加される（buildPathSelect）。
const PATH_OPTIONS = ['夜獣', '狩人', '遍歴', '近衛', '領主', '賢者',`将軍`,`僧正`,`空駆`,`船長`,`異端`,`星読`,`後見`];

// 道ごとの手番順。小さいほど先に動く（ラウンド進行のturnOrder）。
// ここに無い道と未設定は異端と同じ扱い＝先頭。同じ番号の道どうしはイニシアチブ降順で解ける
// （js/game-store.jsのsortForTurnOrder）ので、群にしたい道は同じ番号でよい。
const PATH_TURN_ORDER = {
  異端: 1,
  夜獣: 2,
  狩人: 3,
  遍歴: 4, 将軍: 4, 空駆: 4,
  近衛: 5,
  領主: 6, 船長: 6,
  賢者: 7, 僧正: 7, 星読: 7,
  後見: 8
};
const DEFAULT_TURN_ORDER = PATH_TURN_ORDER['異端'];

// NPCはPCが全員動いた後。PCの最大（後見の8）より必ず大きい値にすること。
// NPC同士の順番は同値のタイブレーク＝イニシアチブ降順で決まる。
const NPC_TURN_ORDER = 100;

const paramIdOf = (definition) => `${PLUGIN_ID}:${definition.key}`;

const CHAR_TYPE_PARAM_ID = paramIdOf(CHAR_TYPE_PARAMETER);
const TARGET_BONUS_PARAM_ID = paramIdOf(TARGET_BONUS_PARAMETER);
const TURN_ORDER_PARAM_ID = paramIdOf(TURN_ORDER_PARAMETER);
const MOISTURE_PARAM_ID = `${PLUGIN_ID}:moisture`;
const THIRST_PARAM_ID = `${PLUGIN_ID}:thirst`;
const APPLAUSE_PARAM_ID = `${PLUGIN_ID}:applause`;
const RESIST_PARAM_ID = `${PLUGIN_ID}:resist`;
const PATH_PARAM_ID = `${PLUGIN_ID}:path`;

const PC_PARAM_IDS = PC_PARAMETERS.map(paramIdOf);
const NPC_PARAM_IDS = NPC_PARAMETERS.map(paramIdOf);
// 種別によって一覧への出し入れが切り替わるパラメータ全部（種別そのものは常に非表示）
const TYPED_PARAM_IDS = [...PC_PARAM_IDS, ...NPC_PARAM_IDS];

// 行い。名称と効果は枠組みの組み込み欄（name / note）なので宣言しない。
// 目標値はダイスドラフト（合計型）の目標値になる：ここに書いた数値以上の目を積めば発動できる。
//
// 使用制限はこのシステムでは全て「ラウンド1回」なので、利用者に上限を触らせない
// （periodのfixedMax）。修正値も効果時間も持たないので、その欄ごと出さない
// （allowMods / allowExpirePhase）。modTargetsを空にするだけでは、ボックスの
// 「その他のパラメータ」から全パラメータが選べてしまう。
const DEED_COMPONENT_KEY = 'deeds';

const DEED_SPEC = createSkillSpec({
  id: 'dracurouge-deed',
  noun: '行い',
  componentKey: DEED_COMPONENT_KEY,
  fields: [
    {
      key: 'kind', label: '種別', type: 'select', className: 'effect-box-level',
      options: [{ value: '戦', label: '戦' }, { value: '常', label: '常' }]
    },
    // 目標値は数値ではなく文字列で持つ。《軽やかに剣舞う》の「3～12」のように、
    // 幅のある目標値（最小値の倍数から選ぶ）を書く行いがあるため（読み方はparseDeedTarget）。
    { key: 'target', label: '目標値', type: 'text', className: 'effect-box-level' },
    { key: 'range', label: '間合', type: 'text', className: 'effect-box-timing' },
    // 対象（「他の一体」「エリア」など）は文章なので数値にはしない。判定には使わず、
    // 行い一覧とチャットログで読むためだけの欄。キーをtargetにできないのは目標値が使っているため。
    { key: 'subject', label: '対象', type: 'text', className: 'effect-box-timing' }
  ],
  periods: [{ key: 'round', label: 'ラウンド', fixedMax: 1 }],
  allowMods: false,
  allowExpirePhase: false,
  // 修正値を持たないので、使用ログには効果（note）をそのまま出す
  logNote: true
});

// 逸話。名称と効果だけを持つ一覧で、使用回数も修正も使用条件も持たない。
// 固有の欄を1つも宣言していないのは、skill-modelの組み込み欄（name / note）が
// そのまま逸話の「名称」「効果」になるため。
const EPISODE_COMPONENT_KEY = 'episodes';

const EPISODE_SPEC = createSkillSpec({
  id: 'dracurouge-episode',
  noun: '逸話',
  componentKey: EPISODE_COMPONENT_KEY,
  periods: [],
  allowMods: false,
  allowExpirePhase: false,
  allowConditions: false,
  // 名称と効果しか持たない一覧なので、効果を出さないと使用ログが名前だけになる
  logNote: true
});

const DEED_USE_COMMAND_PATTERN = buildSkillUseCommandPattern(DEED_SPEC);

// componentsから正規形の行い一覧を取り出す（js/parameters/dx3.jsのreadDX3Effectsと同型）。
function readDracurougeDeeds(components) {
  return normalizeSkillList(DEED_SPEC, components?.[DEED_COMPONENT_KEY] ?? []);
}

function readDracurougeEpisodes(components) {
  return normalizeSkillList(EPISODE_SPEC, components?.[EPISODE_COMPONENT_KEY] ?? []);
}

// 種別・目標値修正・手番順は種別によらず常に持つので、PC/NPCのどちらの一覧にも入れない
// （TYPED_PARAM_IDSに入れると、種別の切り替えで一覧への出し入れの対象になってしまう）。
function buildDracurougeCharacterParameters() {
  return buildParameters(PLUGIN_ID, [
    CHAR_TYPE_PARAMETER, TARGET_BONUS_PARAMETER, TURN_ORDER_PARAMETER,
    ...PC_PARAMETERS, ...NPC_PARAMETERS
  ]);
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
  onComponentChange, getComponents, dispatch, getToken, getEffectiveParameterValue, tokenId
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

  // --- 目標値修正（表示だけ）---
  // 動かすのはバフ/デバフだけなので入力欄は出さない。それでも今いくつ乗っているかは
  // 見えないと困る（行いの目標値が変わった理由が分からなくなる）ので、実効値を文字で出す。
  const bonusRow = document.createElement('div');
  bonusRow.className = 'dialog-custom-row';

  const bonusLabel = document.createElement('label');
  bonusLabel.className = 'dialog-param-label';
  bonusLabel.textContent = TARGET_BONUS_PARAMETER.label;
  bonusLabel.style.alignSelf = 'center';
  bonusLabel.style.color = '#ccc';
  bonusLabel.style.fontSize = '0.85rem';

  const bonusValue = document.createElement('span');
  bonusValue.style.alignSelf = 'center';
  bonusValue.style.color = '#ddd';
  bonusValue.style.fontSize = '0.85rem';
  bonusValue.title = 'バフ/デバフで増減します。行いの目標値がこの分だけ動きます';

  const bonus = readTargetModifier(DRACUROUGE_DRAFT_SPEC, getToken?.() ?? null, getEffectiveParameterValue);
  bonusValue.textContent = bonus === 0
    ? '0（バフ/デバフで増減）'
    : `${bonus > 0 ? '+' : ''}${bonus}（下限 ${DEED_TARGET_FLOOR}）`;

  bonusRow.appendChild(bonusLabel);
  bonusRow.appendChild(bonusValue);
  container.appendChild(bonusRow);

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

  // --- 行い一覧・絆一覧（ボックス）---
  // 既存キャラクターの更新時のみ開ける（新規作成時はまだcomponentsを持たないため対象外。
  // 既存プラグインのボックス系ボタンと同じ扱い）。
  let deedBtn = null;
  let bondBtn = null;
  let episodeBtn = null;
  if (isEditing && onComponentChange) {
    const readComponents = () => (getComponents ? getComponents() : components) ?? {};
    const readBonds = () => normalizeBondList(readComponents()[BOND_COMPONENT_KEY]);
    const readDeeds = () => readDracurougeDeeds(readComponents());
    const readEpisodes = () => readDracurougeEpisodes(readComponents());

    deedBtn = document.createElement('button');
    deedBtn.type = 'button';
    deedBtn.className = 'dialog-add-row-btn';
    deedBtn.style.marginTop = '8px';

    const updateDeedBtnLabel = () => {
      deedBtn.textContent = `${DEED_SPEC.noun}一覧を開く（${readDeeds().length}件）`;
    };
    updateDeedBtnLabel();

    deedBtn.addEventListener('click', () => {
      showSkillBox({
        spec: DEED_SPEC,
        skills: readDeeds(),
        // 式に書ける{パラメータ名}の検証・提示に使う（修正は持たないので対象選択には使わない）
        parameters,
        readOnly: !canEdit,
        onSave: (nextDeeds) => {
          onComponentChange(DEED_COMPONENT_KEY, nextDeeds);
          updateDeedBtnLabel();
        }
      });
    });
    container.appendChild(deedBtn);

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

    episodeBtn = document.createElement('button');
    episodeBtn.type = 'button';
    episodeBtn.className = 'dialog-add-row-btn';
    episodeBtn.style.marginTop = '8px';

    const updateEpisodeBtnLabel = () => {
      episodeBtn.textContent = `${EPISODE_SPEC.noun}一覧を開く（${readEpisodes().length}件）`;
    };
    updateEpisodeBtnLabel();

    episodeBtn.addEventListener('click', () => {
      showSkillBox({
        spec: EPISODE_SPEC,
        skills: readEpisodes(),
        parameters,
        readOnly: !canEdit,
        onSave: (nextEpisodes) => {
          onComponentChange(EPISODE_COMPONENT_KEY, nextEpisodes);
          updateEpisodeBtnLabel();
        }
      });
    });
    container.appendChild(episodeBtn);
  }

  // 表示だけの人には入力を固め、ボックスを開くボタンだけ残す
  // （ボックスの中身はreadOnlyで表示専用になる）。
  if (!canEdit) {
    lockFormControls(container, { keep: [deedBtn, bondBtn, episodeBtn] });
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

// ------------------------------------------------------------------
// キャラクターシートの取り込み
// ------------------------------------------------------------------
// 対象はWebキャラクターシート（character-sheets.appspot.com）のドラクルージュ用シートが
// 返すJSON。ファイルから読ませる道（盤面の「JSONを読み込む」）と、URLから取る道
// （js/character-sheet-import.js）の両方がこの関数に合流する。
//
// シートにあってこのアプリが持っていない項目（血統・家門・紋章・原風景などの設定欄、
// 経歴メモ）は取り込まない。パラメータ化していないものを隠しパラメータとして持たせても、
// 画面のどこにも出ず、書き出したJSONだけが太るため。

// URLから取り込むときの受け付け先。**データだけを宣言する**。
// 画面（js/character-sheet-import.js）はこの宣言でURLを検査してキーだけを取り出し、
// サーバー（server/index.js）が同じ宣言から取得先を組み立てる。宣言に無いURLは
// どちらの側でも通らないので、「任意の宛先へ取りに行かせる」ことができない。
//
// edit.html / display.html はどちらも人が見るページなので、キーだけを取り出して
// JSONを返す口（display?ajax=1）へ付け替える。利用者はブラウザのURLをそのまま貼れる。
const DRACUROUGE_SHEET_SOURCE = {
  label: 'Webキャラクターシート（ドラクルージュ）',
  origin: 'https://character-sheets.appspot.com',
  pathPrefix: '/dracurouge/',
  keyParam: 'key',
  keyPattern: /^[A-Za-z0-9_-]{8,200}$/,
  fetchPath: (key) => `/dracurouge/display?ajax=1&key=${encodeURIComponent(key)}`,
  hint: 'character-sheets.appspot.com/dracurouge/edit.html?key=... の形のURL'
};

function sheetText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

// シートの数値欄は文字列（"0"）で、未入力はnull。数値として読めた場合だけ上書きする。
function assignSheetNumber(target, paramId, raw) {
  if (raw === null || raw === undefined || raw === '') return;
  const value = Number(raw);
  if (Number.isFinite(value)) target[paramId] = Math.trunc(value);
}

// 戦の行い（waractions）／常の行い（generalactions）を、種別だけ変えて同じ形に読む。
// シートの列と行いの欄は素直に1対1で対応する（対象＝subject、効果＝組み込みのnote）。
function importDeedsOfKind(rawList, kind) {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map(raw => ({
      name: sheetText(raw?.name),
      note: sheetText(raw?.effect),
      fields: {
        kind,
        target: sheetText(raw?.desiredvalue),
        range: sheetText(raw?.range),
        subject: sheetText(raw?.target)
      }
    }))
    .filter(deed => deed.name !== '');
}

function importDracurougeDeedsFromSheet(json) {
  return normalizeSkillList(DEED_SPEC, [
    ...importDeedsOfKind(json?.waractions, '戦'),
    ...importDeedsOfKind(json?.generalactions, '常')
  ]);
}

function importDracurougeEpisodesFromSheet(json) {
  const rawList = Array.isArray(json?.episodes) ? json.episodes : [];

  return normalizeSkillList(EPISODE_SPEC, rawList
    .map(raw => ({ name: sheetText(raw?.title), note: sheetText(raw?.effect) }))
    .filter(episode => episode.name !== ''));
}

// 絆の片側。シートは rouge1..rouge5 と rougeremmain（消えざる絆のチェック）に分かれている。
// 枠の値（憐・友…）はシート側の選択肢のほうが広い（異端用の記号を含む）が、絆ボックスは
// 選択肢に無い値も現在値として残すので、そのまま入れてよい（dracurouge-bond-box.js）。
function importBondSide(raw, side) {
  return {
    eternal: raw?.[`${side}remmain`] === 'on',
    slots: [1, 2, 3, 4, 5].map(index => sheetText(raw?.[`${side}${index}`])),
    sealed: false
  };
}

function importDracurougeBondsFromSheet(json) {
  const rawList = Array.isArray(json?.bonds) ? json.bonds : [];

  const bonds = rawList
    .map(raw => ({
      name: sheetText(raw?.name),
      rouge: importBondSide(raw, 'rouge'),
      noir: importBondSide(raw, 'noir')
    }))
    // シートは空の行を1つ持って返してくる。名前も枠も空の行は取り込まない
    .filter(bond => bond.name !== ''
      || bond.rouge.slots.some(slot => slot !== '')
      || bond.noir.slots.some(slot => slot !== ''));

  // 【要】5つ埋まっている側は封印済みとして取り込む。封印しないと、取り込んだ絆を
  // 絆ボックスで開いて保存した瞬間に「新たに5つ揃った」と数えられ、潤い／渇きが
  // もう一度加算される（シートから取り込んだ値には既に反映されている）。
  //
  // 消えざる絆も、ここでは積み直さずに封印する（recycleEternal:false）。積み直すと
  // シートに書かれている4つを黙って捨てることになるため。取り込んだ後で消えざる絆として
  // 回したい場合は、その行を作り直してもらう。
  return settleFilledBonds(normalizeBondList(bonds), { recycleEternal: false }).bonds;
}

// 道は文字列なので valueOverrides では入らない（Coreは数値しか受け付けない）。
// パラメータの定義ごと差し替える形で渡す。定義はPC_PARAMETERSのものを流用するので、
// ラベルも編集可否もこのプラグインの宣言と必ず一致する。
function importDracurougePath(json) {
  const path = sheetText(json?.base?.tao);
  if (path === '') return {};

  const definition = PC_PARAMETERS.find(entry => entry.key === 'path');
  return buildParameters(PLUGIN_ID, [{ ...definition, value: path }]);
}

/**
 * Webキャラクターシート（ドラクルージュ）のJSONを取り込む。
 * @param {any} json
 * @returns {{name?:string, valueOverrides:object, labelOverrides:object,
 *            newParameters:object, components:object} | null}
 */
function importDracurougeCharacterJson(json) {
  if (!json || typeof json !== 'object') return null;

  // ドラクルージュのシートらしさの確認。他システムのシートを黙って空のコマとして
  // 取り込んでしまわないよう、このシステム特有のキーが1つも無ければ断る。
  const looksLikeSheet = ['base', 'waractions', 'generalactions', 'bonds', 'episodes', 'thirstpoint']
    .some(key => json[key] !== undefined);
  if (!looksLikeSheet) return null;

  const valueOverrides = {};
  assignSheetNumber(valueOverrides, THIRST_PARAM_ID, json.thirstpoint);
  assignSheetNumber(valueOverrides, MOISTURE_PARAM_ID, json.mellifluouspoint);
  assignSheetNumber(valueOverrides, APPLAUSE_PARAM_ID, json.applausepoint);

  const name = sheetText(json?.base?.name);

  return {
    name: name === '' ? undefined : name,
    valueOverrides,
    labelOverrides: {},
    newParameters: importDracurougePath(json),
    components: {
      [DEED_COMPONENT_KEY]: importDracurougeDeedsFromSheet(json),
      [BOND_COMPONENT_KEY]: importDracurougeBondsFromSheet(json),
      [EPISODE_COMPONENT_KEY]: importDracurougeEpisodesFromSheet(json)
    }
  };
}

// ダイスドラフト。treat で振った目がプールへ溜まり、パネル（js/dice-draft-panel.js）で
// 行いへ割り当てる。行いの「目標値」がそのまま合計の目標になる（kind:'sum'）。
const DRACUROUGE_DRAFT_SPEC = createDiceDraftSpec({
  id: 'dracurouge-draft',
  label: '血の宴',
  diceSides: 6,
  bcdiceSystem: DRACUROUGE_BCDICE_SYSTEM,
  skillSpec: DEED_SPEC,
  requirement: {
    kind: 'sum',
    targetField: 'target',
    // 目標値修正(TB)の実効値を、段階のある目標値なら段階すべてに足す（下限はDEED_TARGET_FLOOR）
    modifierParamId: TARGET_BONUS_PARAM_ID,
    modifierLabel: 'TB',
    floor: DEED_TARGET_FLOOR
  },
  // 幕ごとに使える行いが違うので、パネルの一覧を切り替えられるようにする。
  // 「終」は終の幕＝戦の行いも常の行いも使えるので、絞り込みを書かない（＝すべて）。
  // 既定は先頭の「戦」。絞るのは見た目だけで、置いたダイスも発動の規則も変わらない。
  skillTabs: [
    { id: 'war', label: '戦', field: 'kind', value: '戦' },
    { id: 'common', label: '常', field: 'kind', value: '常' },
    { id: 'end', label: '終' }
  ],
  // 行いを発動したらそのコマの「判定終了で消滅」バフを剥がす。1回きりの目標値修正を
  // 表現するためのもので、発出するのはrunDiceDraftUse。
  //
  // treat（ダイスを振る側）では発出しない。振った時点で消すと、その修正を乗せたまま
  // 行いを使うことができなくなる。
  expiresCheckPhaseOnUse: true
});

// treat / treat() / treat(n)。個数を書かなければBCDice側の既定（4個）になる。
const TREAT_COMMAND_PATTERN = /^treat(?:\(\s*(\d*)\s*\))?$/i;

// 行い判定はこのシステム専用のコマンドで振る（BCDiceの DRx+y。x：ダイス数、y：渇き修正）。
// ただのバラ振り（nB6）にすると、渇き修正と栄光のダイスが乗らない。
//
// 渇きは判定のたびに変わるので、コマンドを組み立てる直前に実効値（バフ込み）を読む。
// BCDiceの書式は「+数字」しか受け付けないので、負や小数はここで0へ丸める。
function readThirstModifier(token, getEffectiveParameterValue) {
  const raw = typeof getEffectiveParameterValue === 'function'
    ? getEffectiveParameterValue(token, THIRST_PARAM_ID)
    : token?.parameters?.[THIRST_PARAM_ID]?.value;
  const value = Math.trunc(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// BCDiceのDRは、振った目そのもの（rands）と最終的な出目が食い違う。
//   ・1が2個ごと／6が2個ごとに「栄光のダイス」10が1個増える
//   ・渇き修正は、6以下でいちばん大きい目に足される
// randsには加工前の6面の目しか入らないので、結果テキストの最後の [ ... ] から拾い直す。
// 例）(DR6+2) ＞ 6D6+2 ＞ [ 1, 1, 2, 3, 3, 5+2, 10 ] ＞ [ 1, 1, 2, 3, 3, 7, 10 ]
// 拾えなかったときは生の出目へ落とす（書式が変わっても「振ったのに0個」にはしない）。
const DICE_LIST_PATTERN = /\[([^\]]*)\]/g;

function readTreatDice({ diceValues, resultText }) {
  const lists = String(resultText ?? '').match(DICE_LIST_PATTERN);
  const last = lists?.[lists.length - 1];
  if (last) {
    const values = last.slice(1, -1).split(',').map(text => Number(text.trim()));
    if (values.length > 0 && values.every(value => Number.isInteger(value) && value > 0)) {
      // 10（栄光のダイス）も渇き修正の乗った目も、面数はd6のまま扱う。
      // パネルは1〜6以外を数字で描くので、そのまま見分けがつく（js/dice-draft-panel.js）。
      return values.map(value => createDie(DRACUROUGE_DRAFT_SPEC.diceSides, value));
    }
  }
  return diceValues
    .filter(rand => Number.isInteger(rand?.value))
    .map(rand => createDie(rand.sides, rand.value));
}

// 「このコマンドは別システムのものです」の案内（js/main.jsのtryHandlePluginChatCommand）用。
// 括弧の無いただの treat は、他システムの部屋では普通の発言でありうるので拾わない
// （拾うと、英単語を1つ書いただけで発言できなくなる）。
const TREAT_LOOKALIKE_PATTERN = /^treat\(\s*\d*\s*\)$/i;

function looksLikeDracurougeChatCommand(rawInput) {
  const input = String(rawInput).trim();
  return TREAT_LOOKALIKE_PATTERN.test(input) || DEED_USE_COMMAND_PATTERN.test(input);
}

// 「行い使用(名前)」の中身を、行いの名前と目標値に分ける。
// 目標値に幅がある行い（《軽やかに剣舞う》の「3～12」）を、どれを狙うか決めて使うための
// 省略できる引数。書式は「行い使用(名前,9)」。
//
// 末尾の「,数字」だけを目標値として切り出す。共通のコマンド書式
// （buildSkillUseCommandPattern）は括弧の中を丸ごと1つの名前として渡してくるので、
// 分けるのはこのシステムの都合＝ここの仕事。名前に読点が入っていても、その後ろが
// 数字でなければ切らないので巻き添えにならない。
function splitDeedUseArgument(rawArgument) {
  const text = String(rawArgument).trim();
  const match = text.match(/^(.+?)\s*,\s*(\d+)$/);
  if (!match) return { skillName: text, targetValue: null };

  return { skillName: match[1].trim(), targetValue: Number(match[2]) };
}

// treat(n) … n個のダイスを振ってプールへ入れる（DRn+渇き）
// treat     … 個数を書かない形。BCDiceの既定である4個で振る（DR+渇き）
// 行い使用(名前) … 乗せたダイスで行いを発動する（パネルの「使用」ボタンと同じ経路）
// 行い使用(名前,目標値) … 目標値に幅がある行いで、狙う目標値を決めて使う
//
// 個数の検証・コマ未選択・ダイスを振れない画面の案内・使えない理由の説明は、それぞれ
// runDiceDraftRoll と runDiceDraftUse がまとめて行うので、ここは書式の判定と、
// このシステム固有のコマンドの組み立てだけをする。
function handleDracurougeChatCommand(rawInput, context) {
  const input = String(rawInput).trim();
  const { token, dispatch, rollBCDice, getEffectiveParameterValue, generateBuffId } = context;

  const treat = input.match(TREAT_COMMAND_PATTERN);
  if (treat) {
    const count = treat[1] ? Number(treat[1]) : null;

    // BCDiceのDRは末尾が0の個数を受け付けない（^DR(\d*[1-9])?(\+\d+)?$）。
    // そのまま送ると「コマンドとして認識されませんでした」としか出ず、理由が分からない。
    if (count !== null && count > 0 && count % 10 === 0) {
      alert('ダイスの個数に10の倍数は指定できません（BCDiceのDRコマンドが受け付けないため）。');
      return true;
    }

    const thirst = readThirstModifier(token, getEffectiveParameterValue);

    runDiceDraftRoll({
      spec: DRACUROUGE_DRAFT_SPEC,
      token,
      dispatch,
      rollBCDice,
      count,
      buildCommand: (diceCount) => `DR${diceCount ?? ''}+${thirst}`,
      readRolledDice: readTreatDice,
      knownSkillNames: readDracurougeDeeds(token?.components).map(deed => deed.name),
      chatCommand: input
    });
    // 書式が合った時点で必ずtrueを返す（falseだとCoreがただのダイスコマンドとして再解釈する）
    return true;
  }

  const use = input.match(DEED_USE_COMMAND_PATTERN);
  if (use) {
    const { skillName, targetValue } = splitDeedUseArgument(use[1]);

    runDiceDraftUse({
      spec: DRACUROUGE_DRAFT_SPEC,
      skillName,
      targetValue,
      token,
      dispatch,
      getEffectiveParameterValue,
      generateBuffId,
      chatCommand: input
    });
    return true;
  }

  return false;
}

// ラウンド終了で行いの使用回数（periods: round）を戻す
// （js/parameters/stella-knights.jsのresetStellaKnightsComponentsOnPhaseEndと同型）。
// 変化が無ければ同一参照のcomponentsを返す（game-store.js側の差分検知に合わせるため）。
function resetDracurougeComponentsOnPhaseEnd(components, phase) {
  const deeds = components?.[DEED_COMPONENT_KEY];
  const nextDeeds = resetSkillUsageOnPhaseEnd(DEED_SPEC, deeds, phase);

  return nextDeeds === deeds ? components : { ...components, [DEED_COMPONENT_KEY]: nextDeeds };
}

// --- ラウンド進行 ---------------------------------------------------
//
// 毎ラウンド セットアップ → 手番 → ラウンド終了 の3段。
//
// 手番はPCが道の順、続けてNPCがイニシアチブ順。段を2つに割らずに済むのは、手番順を
// 「PCは道の番号（1〜8）、NPCは100」という1つの数値へ落としているから
// （computeDracurougeDerivedParameters）。同値のタイブレークはCore側が
// イニシアチブ降順で持っているので、NPC同士がイニシアチブ順になるのは自動でついてくる。
const SETUP_PHASE_ID = 'setup';

function buildDracurougeRoundPhaseTemplate() {
  return [
    // ラベルが「セットアップ」なのはログが「ラウンドN - ○○開始。」の形だから
    // （「ラウンド開始」にすると「ラウンド開始開始」になる）。
    { id: SETUP_PHASE_ID, label: 'セットアップ', kind: 'once', expirePhaseOnComplete: null, preTurnStep: null },
    {
      id: 'action', label: '手番', kind: 'perCharacter',
      turnOrder: { paramId: TURN_ORDER_PARAM_ID, direction: 'asc' },
      // preTurnStepを置かない＝ルーム設定の「イニシアチブプロセスを挟む」はこのシステムでは
      // 効かない。手番順の根拠が道（手番の合間に動かない値）なので、直前に計算し直す段に
      // 意味が無いため（シノビガミがプロットで同じ判断をしている）。
      expirePhaseOnComplete: null, preTurnStep: null
    },
    { id: 'roundEnd', label: 'ラウンド終了', kind: 'once', expirePhaseOnComplete: 'round', preTurnStep: null }
  ];
}

// 手番順だけを自動計算する。潤い・渇き・喝采点には触れない（利用者が手でも増減させる値で、
// 毎回上書きすると手入力が効かなくなる。加算はapplyAward）。
function computeDracurougeDerivedParameters(parameters = {}) {
  const order = readCharType(parameters) === CHAR_TYPE_NPC
    ? NPC_TURN_ORDER
    : (PATH_TURN_ORDER[parameters[PATH_PARAM_ID]?.value] ?? DEFAULT_TURN_ORDER);

  return { [TURN_ORDER_PARAM_ID]: order };
}

// ラウンドの頭（セットアップの段）にPCへ配る手当て。
// 【基礎値を読んで基礎値を返す】実効値（バフ込み）を返すとバフの分が基礎値へ混入して
// 二重に効く（docs/plugin-guide.mdの7章）。Coreは返した値をそのまま書くだけ。
function applyDracurougeRoundPhaseStart(phase, { tokens = {}, participants = [] } = {}) {
  if (phase?.id !== SETUP_PHASE_ID) return null;

  const changes = [];
  const names = [];

  participants.forEach(tokenId => {
    const token = tokens[tokenId];
    // NPCは対象外（喝采点も抗う力もPCだけが持つ）
    if (!token || readCharType(token.parameters) === CHAR_TYPE_NPC) return;

    const applause = Number(token.parameters?.[APPLAUSE_PARAM_ID]?.value) || 0;
    changes.push({ tokenId, paramId: APPLAUSE_PARAM_ID, value: applause + 1 });
    changes.push({ tokenId, paramId: RESIST_PARAM_ID, value: RESIST_PER_ROUND });
    names.push(token.name || '');
  });

  // 対象が1人もいなければ黙る（NPCしかいない場面でログだけが増えないように）
  if (changes.length === 0) return null;

  return {
    changes,
    logText: `喝采点+1／抗う力を${RESIST_PER_ROUND}に戻しました（${names.join('、')}）。`
  };
}

export const DRACUROUGE_PLUGIN = {
  id: PLUGIN_ID,
  label: 'ドラクルージュ',
  buildCharacterParameters: buildDracurougeCharacterParameters,
  computeDerivedParameters: computeDracurougeDerivedParameters,
  buildRoundPhaseTemplate: buildDracurougeRoundPhaseTemplate,
  applyRoundPhaseStart: applyDracurougeRoundPhaseStart,
  renderCharacterPanel: renderDracurougeCharacterPanel,
  importCharacterJson: importDracurougeCharacterJson,
  characterSheetSource: DRACUROUGE_SHEET_SOURCE,
  handleChatCommand: handleDracurougeChatCommand,
  looksLikeOwnChatCommand: looksLikeDracurougeChatCommand,
  resetComponentsOnPhaseEnd: resetDracurougeComponentsOnPhaseEnd,
  diceDraft: DRACUROUGE_DRAFT_SPEC,
  bcdiceSystem: DRACUROUGE_BCDICE_SYSTEM
};
