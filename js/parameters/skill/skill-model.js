// js/parameters/skill/skill-model.js
// 「キャラが選んで取得するタイプの能力」＝スキルの、システムに依存しないデータモデル。
// DX3のエフェクト、シノビガミの忍法のように、システムごとに名前も付随する値も違うものを
// 同じ形で扱えるようにする。
//
// システム固有の知識（名称・フィールド・回数制限の期間・修正値の対象パラメータ）は
// 一切持たず、すべてプラグインからcreateSkillSpec()で渡してもらう
// （js/parameters/saikoro-fiction/skill-table.jsのcreateSkillTableSpecと同じ構え）。
//
// 【一覧としても使える】使用・回数制限・修正値を1つも持たない「名前・（システム固有の欄）・
// 内容」だけの一覧（ドラクルージュの逸話、シノビガミの背景）も、同じモデルとボックスで書く。
// 入口は createListSpec（createSkillSpecのすぐ下）。
//
// 【注意】このファイルの「スキル」は、サイコロ・フィクションの「特技表」
// （js/parameters/saikoro-fiction/skill-table.js）とは別物。あちらは判定の目標値を決める
// 表で、こちらは取得して使用する能力。同じ英単語だが役割が違う。
//
// スキル1件の形：
//   {
//     name,                                   スキル名（DX3のエフェクト名等）
//     note,                                   効果の説明文
//     fields: { <fieldKey>: value },          システム固有の値（DX3ならtiming/level/encroach）
//     expirePhase,                            付与するバフの効果時間。''なら使用側の既定に従う
//     limits: {
//       counts: { <periodKey>: {current, max} },  maxは式文字列（{EB}等）かnull＝無制限
//       conditions: [ {left, comparator, right} ] 全て満たさないと使用できない
//     },
//     mods: [ {paramId, formula, target, extra} ]  使用時に与える修正（原則自身へのバフ）
//   }
//
// このファイルはDOMに触れない（server/index.jsがgame-store.js経由でプラグインをimportする
// ため、Node環境でも読み込める必要がある）。UIはskill-box.js、使用処理はskill-use.js。

import { analyzeFormula, normalizeFormula, evaluateCondition } from './skill-formula.js';

// バフの効果時間の選択肢。値はjs/game-store.jsのBUFF_PHASE_LABELS／PHASE_HIERARCHYと
// 揃えてある。game-store.jsからimportすると
// game-store.js → registry.js → プラグイン → このファイル という循環importになるため、
// 直接importせず同じ内容をここに置いている（js/parameters/dx3-combo-box.js冒頭と同じ理由）。
// 変えるときは両方を揃えること。
export const EXPIRE_PHASE_CHOICES = [
  { key: '', label: '（使用時の既定）' },
  { key: 'manual', label: '手動で外すまで' },
  { key: 'check', label: '判定終了まで' },
  { key: 'process', label: 'プロセス終了まで' },
  { key: 'round', label: 'ラウンド終了まで' },
  { key: 'scene', label: 'シーン終了まで' },
  { key: 'scenario', label: 'シナリオ終了まで' }
];

const EXPIRE_PHASE_KEYS = new Set(EXPIRE_PHASE_CHOICES.map(c => c.key));

/**
 * スキルのexpirePhase（保存値）を、ADD_BUFFへ渡す値へ変換する。
 * ''（未設定）はfallbackへ委ね、'manual'はnull（手動で外すまで）になる。
 * @param {string} stored スキルに保存された効果時間
 * @param {string|null} fallback 使用経路ごとの既定（単体使用ならnull、コンボならprocess等）
 * @returns {string|null}
 */
export function resolveExpirePhase(stored, fallback = null) {
  if (stored === 'manual') return null;
  if (stored && EXPIRE_PHASE_KEYS.has(stored)) return stored;
  return fallback ?? null;
}

/**
 * @param {{
 *   id: string,
 *   noun: string,              このシステムでのスキルの呼び名（DX3なら'エフェクト'）。
 *                              ボックスの見出し・チャットコマンド・メッセージの生成に使う。
 *   componentKey: string,      token.componentsのどのキーに保存するか。
 *   fields?: Array<{
 *     key: string, label: string,
 *     type?: 'text'|'number'|'select'|'toggle'|'checkbox',
 *                             'toggle'は押すたびに選択肢を順に回すボタン（シノビガミの
 *                             背景の「長所／短所」）。2択に限らず、選択肢の数だけ回る。
 *                             選ぶだけの欄で、<select>を開かせるほどでもないものに使う。
 *                             'checkbox'は真偽値（シノビガミの人物の「居所」「秘密」「奥義」）。
 *     options?: Array<{value:string, label:string, group?:string}>,
 *                             type:'select'/'toggle'のときの選択肢。先頭が既定値になる。
 *                             groupを付けると、その名前でまとめて（optgroupで）並ぶ
 *                             （'toggle'では使わない）。
 *     filterOptions?: (option, fields) => boolean
 *                             選択肢のうち画面に出すものを、同じ行の他の欄の値で絞る
 *                             （シノビガミの人物：属性が＋なら感情もプラス側の6つだけ）。
 *                             **保存値の検証には効かない**（normalizeSkillは宣言された
 *                             全選択肢を見る）：絞り込みを検証にも効かせると、属性を
 *                             切り替えた瞬間に保存済みの感情が既定へ落ちてしまう。
 *     placeholder?: string,
 *     className?: string,      入力欄に付けるCSSクラス（既存のレイアウトを流用するため）
 *     formulaName?: string,    式から{名前}で参照できるようにする（DX3のlevel → 'Lv'）
 *     availableWhen?: (fields: Record<string, any>) => boolean
 *                             この欄がそのスキルで意味を持つ条件（シノビガミの「間合は
 *                             攻撃忍法だけ」）。偽なら入力させず、表示・式・ログでも無視する。
 *                             ただし保存値は捨てない（条件が戻ったときに入れ直させないため）。
 *     newRow?: boolean,       この欄から次の段へ送る（アリアンロッドのコスト一式を
 *                             タイミング・SL・対象とは別の行にまとめている）。
 *     hideWhenUnavailable?: boolean,
 *                             availableWhenが偽のとき、薄く出したままにせず欄ごと隠す
 *                             （アリアンロッドの追加コスト。使う人のほうが少ない欄向け）。
 *                             既定はfalse＝薄く出したまま押せなくする。
 *     onUse?: { addToParamId?: string, paramIdFromField?: string, sign?: 1|-1 }
 *                             使用時に、この欄の数値を指定パラメータの基礎値へ加算する
 *                             （DX3の上昇侵蝕率 → DX3:corruption）。
 *                             支払い先が行ごとに変わるなら、addToParamIdの代わりに
 *                             paramIdFromFieldへ「paramIdが入っている別の欄のkey」を書く
 *                             （アリアンロッドのコスト種別。選択肢のラベルがログの呼び名になる）。
 *                             sign:-1で、入力された正の数を減算として払う（MPの消費）。
 *                             支払いはSET_PARAMETERを通るので、対象はeditable:trueの
 *                             パラメータに限ること（editable:falseは弾かれる）。
 *   }>,
 *   periods?: Array<{key:string, label:string, fixedMax?:number|string}>,
 *                              回数制限の期間。keyはフェーズ終了のリセット
 *                              （resetSkillUsageOnPhaseEnd）で渡される名前と一致させる。
 *                              fixedMaxを付けると上限がシステム側で決まり、利用者は直せない
 *                              （ドラクルージュの行いは全て「ラウンド1回」）。保存済みの値も
 *                              読み出しのたびにこの値へ揃うので、手でJSONを書き換えられても
 *                              上限は緩まない。
 *   allowMods?: boolean,       既定true。falseにすると「使用時の修正」を扱わない。
 *                              modTargetsを空にするだけでは、ボックスの「その他のパラメータ」
 *                              から全パラメータが選べてしまうため、そういうシステムはこちらで切る。
 *   allowExpirePhase?: boolean, 既定true。falseにすると「効果時間」を扱わない。
 *                              修正を持たないスキルには意味が無い欄なので隠せるようにしてある。
 *   allowNote?: boolean,       既定true。falseにするとメモ欄（note）を出さない。
 *                              行数が多くて1行を低く保ちたい一覧（シノビガミの人物）向け。
 *                              保存する形は変えない（noteは空文字で残る）。
 *   footerNote?: ({skills, parameters}) => {text:string, warning?:boolean}|null,
 *                              一覧の下に出す1行（アリアンロッドの「携帯重量／重量上限」）。
 *                              **画面の今の値**（保存待ちの編集も反映済み）で毎回呼ばれる。
 *                              warning:trueで赤字になる。ボックスは中身を解釈しない。
 *   rowActions?: Array<{
 *     key: string, label: string,
 *     availableWhen?: (fields) => boolean,   欄と同じ規則で有効/無効が決まる
 *     run: ({skill, spec, context}) => void
 *   }>,                        行ごとに置く任意のボタン（シノビガミの人物の「感情修正」）。
 *                              **ボックスは中身を知らない**：宣言したプラグインがrunを書く。
 *                              contextはshowSkillBoxが受け取ったstore操作一式。
 *   allowConditions?: boolean, 既定true。falseにすると「使用条件」を扱わない。
 *                              使用という概念を持たない一覧（ドラクルージュの逸話）のためのもの。
 *                              falseのときは保存時にも条件を書かない（空配列になる）。
 *   hasUseCommand?: boolean,   既定false。trueにすると一覧の下に「使用コマンドをコピー」
 *                              ボタンが出て、登録済みの名前から「（呼び名）使用（名前）」を
 *                              まとめてコピーできる（チャットパレットに貼る用）。
 *                              buildSkillUseCommandPatternで実際にそのコマンドを受け付けて
 *                              いる一覧だけをtrueにすること（宣言しただけでは押せる見た目に
 *                              なるだけで、実際にチャットへ送れるかはプラグイン側の実装次第）。
 *   logNote?: boolean,         既定false。trueにすると使用ログに効果（note）を載せ、
 *                              「修正値バフはありません」の断り書きを出さない。
 *                              修正値をほとんど使わないシステム（ステラナイツのスキル、
 *                              ドラクルージュの行い・逸話）向けで、卓が読みたいのは
 *                              付かなかった修正よりその能力が何をするかのため。
 *   defaultSkills?: Array<object>,
 *                              まだ1件も登録が無いコマに配る初期の一覧（ステラナイツの
 *                              出目1〜6）。「枠が最初から決まっていて、利用者は中身を
 *                              埋めるだけ」というシステムのためのもの。
 *                              **nameは必ず入れること**：空名は一覧から落とされるうえ、
 *                              ダイスドラフトはスキル名をキーに置き場を持つため、
 *                              名無しが複数あると区別できない。
 *   modTargets?: Array<{
 *     paramId: string, label: string,
 *     extra?: { key:string, label:string, metaKey:string, hint?:string }
 *                             その対象にだけ付けられる追加の数値（DX3のクリティカル値下限）。
 *                             保存はmod.extra[key]、バフへはmeta[metaKey]として載る。
 *   }>,
 *   defaultExpirePhase?: string|null,
 *   legacyModMap?: Record<string, string>
 *                              旧データ（DX3のeffect.combo）のキー → paramIdの対応表。
 * }} definition
 */
// 個数の宣言の既定。上限を置いているのは、青天井にすると保存データも見た目も破綻するため
// （js/parameters/dice-draft/dice-draft-pool.js の MAX_FACE_VALUE と同じ考え方）。
// 下限0は「持っていない」を表す：0のアイテムは使えない（item-use.jsのrunItemUse）。
const QUANTITY_DEFAULTS = { label: '個数', min: 0, max: 999 };

/** 個数を宣言の範囲へ丸める。非数値・空欄は下限へ落とす。 */
export function clampQuantity(spec, value) {
  if (!spec.quantity) return 0;
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return spec.quantity.min;
  return Math.min(Math.max(number, spec.quantity.min), spec.quantity.max);
}

export function createSkillSpec(definition) {
  const {
    id,
    noun,
    componentKey,
    fields = [],
    periods = [],
    modTargets = [],
    defaultExpirePhase = null,
    legacyModMap = {},
    allowMods = true,
    allowExpirePhase = true,
    allowConditions = true,
    logNote = false,
    defaultSkills = [],
    quantity = null,
    allowNote = true,
    rowActions = [],
    footerNote = null,
    hasUseCommand = false
  } = definition;

  if (!id) throw new Error('[skill] idが必要です');
  if (!noun) throw new Error(`[skill] ${id}: nounが必要です`);
  if (!componentKey) throw new Error(`[skill] ${id}: componentKeyが必要です`);

  const modTargetByParamId = new Map(modTargets.map(target => [target.paramId, target]));

  return Object.freeze({
    id,
    noun,
    componentKey,
    fields: Object.freeze(fields.map(field => Object.freeze({
      type: 'text',
      ...field,
      options: Object.freeze((field.options ?? []).map(option => Object.freeze({ ...option })))
    }))),
    periods: Object.freeze(periods.map(period => Object.freeze({ ...period }))),
    modTargets: Object.freeze(modTargets.map(target => Object.freeze({ ...target }))),
    defaultExpirePhase,
    allowMods,
    allowExpirePhase,
    allowConditions,
    logNote,
    allowNote,
    // アイテムかどうかの唯一の判定。宣言があればボックスは個数と使用ボタンを出し、
    // item.use / item.gain の対象になる（createItemSpec）。
    quantity: quantity ? Object.freeze({ ...QUANTITY_DEFAULTS, ...quantity }) : null,
    rowActions: Object.freeze(rowActions.map(action => Object.freeze({ ...action }))),
    // 一覧の下に出す1行（アリアンロッドの「携帯重量／重量上限」）。ボックスは中身を
    // 解釈せず、返ってきた文字列と警告の有無を描くだけ。
    footerNote,
    defaultSkills: Object.freeze(defaultSkills.map(skill => Object.freeze({ ...skill }))),
    legacyModMap: Object.freeze({ ...legacyModMap }),
    // trueにすると一覧の下に「使用コマンドをコピー」ボタンが出る。宣言したプラグインが
    // buildSkillUseCommandPatternで「◯◯使用(名前)」を実際にチャットコマンドとして
    // 受け付けている一覧だけをtrueにすること（アイテムはitem.use形式で別物、
    // 背景・人物・絆のような使用の概念が無い一覧はそもそも押せても送れる先が無い）。
    hasUseCommand,
    // paramIdから修正対象の宣言を引く。追加欄（extra）の有無・meta化の仕方を知るために使う。
    findModTarget: (paramId) => modTargetByParamId.get(paramId) ?? null
  });
}

/**
 * 「名前・（システム固有の欄）・内容」だけを並べる一覧の宣言。
 *
 * 使う・振る・修正が乗るといった概念を持たない一覧（ドラクルージュの逸話、シノビガミの
 * 背景）のためのもの。createSkillSpec と同じデータモデル・同じボックス（showSkillBox）を
 * そのまま使い、使わない節（回数制限・使用条件・使用時の修正・効果時間）を落とすだけ。
 * 保存される形も createSkillSpec と同一なので、既にある一覧を後からこちらへ移しても
 * データは変わらない。
 *
 * 【逆に、こちらでは書けないもの】入れ子（シノビガミの奥義改造）や、1件ごとの公開先。
 * normalizeSkill が返す形が決まっているため、そういう一覧は専用のボックスを書くこと
 * （js/parameters/shinobigami-ougi-box.js）。
 *
 * @param {{id:string, noun:string, componentKey:string, fields?:Array<object>,
 *          defaultSkills?:Array<object>}} definition
 */
export function createListSpec(definition) {
  return createSkillSpec({
    // quantity は素通しする。アイテム（createItemSpec）がこの関数を通って宣言されるため。
    ...definition,
    periods: [],
    allowMods: false,
    allowExpirePhase: false,
    allowConditions: false,
    // 一覧そのものに使用の概念は無いが、プラグインが「◯◯使用(名前)」を生やした場合に
    // 名前だけのログにならないようにしておく（ドラクルージュの逸話がその形）。
    logNote: true
  });
}

/**
 * 「名前・（システム固有の欄）・効果・個数」を持つアイテムの宣言。
 *
 * 消費して減る持ち物（シノビガミの忍具）のためのもの。createListSpec と同じく使う・振る・
 * 修正が乗るといった節を持たず、そこへ**個数**と**使用**だけを足す。ボックスには
 * 「− 個数 ＋」と使用ボタンが出て、宣言したプラグインには item.use / item.gain が
 * 自動で生える（js/parameters/registry.js の handlePluginChatCommand。ダイスドラフトの
 * dice.change / dice.add と同じ配り方で、プラグイン側に書くことは何も無い）。
 *
 * defaultSkills を渡すと、まだ1件も登録が無いコマにその枠が並ぶ（シノビガミの忍具は
 * 兵糧丸・神通丸・遁甲符の3つに決まっているので、最初から並べて個数だけ埋めてもらう）。
 *
 * @param {{id:string, noun:string, componentKey:string, fields?:Array<object>,
 *          defaultSkills?:Array<object>, quantity?:{label?:string, min?:number, max?:number}}} definition
 */
export function createItemSpec(definition) {
  return createListSpec({ quantity: {}, ...definition });
}

// 「その欄がこのスキルで意味を持つか」の判定は skill-formula.js にある（式の評価でも
// 同じ規則が要るのに、skill-formula.js はこのファイルをimportできない＝循環するため、
// 最下層のあちらに定義してある）。使う側がここだけ見れば済むよう、そのまま再公開する。
export { isFieldAvailable } from './skill-formula.js';

/**
 * 選択肢から選ぶ欄か（'select' と 'toggle'）。見た目は違うが、保存できる値が選択肢に
 * 限られる点は同じなので、正規化も保存も同じ規則で扱う。
 */
export function isChoiceField(field) {
  return field.type === 'select' || field.type === 'toggle';
}

/** その欄で選べる値の既定（選択肢の先頭）。選択肢が無ければ空文字。 */
function defaultSelectValue(field) {
  return field.options?.[0]?.value ?? '';
}

// 正規表現のメタ文字をそのままの文字として扱わせる。nounは日本語なので今のところ
// 該当しないが、記号を含む呼び名を付けたシステムが来ても壊れないようにしておく。
function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * チャットコマンドの書式「（呼び名）使用（スキル名）」。呼び名はシステムごとに変わるので
 * specから組み立てる（DX3なら「エフェクト使用(火炎放射)」、シノビガミなら「忍法使用(...)」）。
 */
export function buildSkillUseCommandPattern(spec) {
  return new RegExp(`^${escapeRegExp(spec.noun)}使用\\((.+)\\)$`);
}

export function buildSkillUseCommand(spec, skillName) {
  return `${spec.noun}使用(${skillName})`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// 上限（max）は「{EB}回まで」のような式を書けるので、数値へ丸めず文字列のまま保つ。
// 空欄・null・undefinedは「無制限」を意味するnullへ揃える。
function normalizeLimitMax(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return text === '' ? null : text;
}

// 旧データ（DX3のeffect.combo = 固定5枠）を、可変長のmods配列へ読み替える。
// 破壊的な一括移行はせず、読むたびにこの変換を通す（保存時に新形式で書き戻される）。
function modsFromLegacyCombo(spec, combo) {
  if (!combo || typeof combo !== 'object') return [];

  return Object.entries(spec.legacyModMap)
    .map(([legacyKey, paramId]) => {
      const legacyMod = combo[legacyKey];
      if (!legacyMod) return null;

      const formula = normalizeFormula(legacyMod).trim();
      const target = spec.findModTarget(paramId);

      // 追加欄（DX3のクリティカル値下限）は旧データでも同じキー名で持っていた
      const extra = {};
      if (target?.extra) {
        const value = legacyMod[target.extra.key];
        if (Number.isFinite(value)) extra[target.extra.key] = value;
      }

      // 式も追加欄も無い枠は、旧UIが常に全枠を書き出していたためのただの空欄。落とす。
      if (formula === '' && Object.keys(extra).length === 0) return null;

      return { paramId, formula, target: 'self', extra };
    })
    .filter(Boolean);
}

function normalizeMod(spec, raw) {
  const paramId = typeof raw?.paramId === 'string' ? raw.paramId : '';
  if (!paramId) return null;

  const modTarget = spec.findModTarget(paramId);
  const extra = {};
  if (modTarget?.extra) {
    const value = raw?.extra?.[modTarget.extra.key];
    if (Number.isFinite(value)) extra[modTarget.extra.key] = value;
  }

  return {
    paramId,
    formula: normalizeFormula(raw?.formula).trim(),
    // 「原則自身にバフを与える」ため既定はself。他者対象を将来足してもデータ移行が
    // 要らないよう、値としては持たせておく。
    target: raw?.target === 'other' ? 'other' : 'self',
    extra
  };
}

function normalizeCondition(raw) {
  return {
    left: normalizeFormula(raw?.left).trim(),
    comparator: typeof raw?.comparator === 'string' ? raw.comparator : 'lte',
    right: normalizeFormula(raw?.right).trim()
  };
}

/**
 * 保存済みの1件を、欠けたフィールドを補った正規形へ揃える。
 * 新形式・旧形式（DX3のエフェクト）のどちらも受け取れるよう、部分ごとに両方の置き場を見る。
 * @param {object} spec
 * @param {any} raw
 * @returns {object}
 */
export function normalizeSkill(spec, raw) {
  const fields = {};
  spec.fields.forEach(field => {
    // 新形式はfields配下、旧形式はトップレベル（effect.timing等）に置かれていた
    const value = raw?.fields?.[field.key] ?? raw?.[field.key];
    if (field.type === 'number') {
      fields[field.key] = toNumber(value);
    } else if (field.type === 'checkbox') {
      // 旧データや手書きJSONの 'on' / 'true' / 1 も真として拾う（チェック欄の値は
      // ブラウザやツールによって書き方が揺れるため）。
      fields[field.key] = value === true || value === 1 || value === 'on' || value === 'true';
    } else if (isChoiceField(field)) {
      // 選択肢から消えた値（表の特技名を整理した後など）は既定へ落とす。
      // 存在しない値のまま持っていると、UIでは先頭が選ばれて見えるのに保存値は別物、
      // というずれ方をするため。
      const text = value === null || value === undefined ? '' : String(value);
      fields[field.key] = field.options.some(option => option.value === text)
        ? text
        : defaultSelectValue(field);
    } else {
      fields[field.key] = value === null || value === undefined ? '' : String(value);
    }
  });

  // 新形式はlimits.counts、旧形式はlimits直下に期間キーが並んでいた
  const rawCounts = raw?.limits?.counts ?? raw?.limits ?? {};
  const counts = {};
  spec.periods.forEach(period => {
    const limit = rawCounts?.[period.key];
    counts[period.key] = {
      current: Math.max(0, Math.round(toNumber(limit?.current))),
      // fixedMaxを宣言した期間は保存値を読まずに宣言値へ揃える。読み出しのたびに直すので、
      // 保存済みデータや手で書き換えられたJSONでも上限が緩まない。
      max: period.fixedMax !== undefined && period.fixedMax !== null
        ? normalizeLimitMax(period.fixedMax)
        : normalizeLimitMax(limit?.max)
    };
  });

  // 使用条件を扱わないシステムでは、保存済みの条件が残っていても捨てる（modsと同じ理由）。
  // 残したままだとcheckSkillUsableが画面に出ていない条件で使用を止めてしまう。
  const conditions = spec.allowConditions && Array.isArray(raw?.limits?.conditions)
    ? raw.limits.conditions.map(normalizeCondition).filter(c => c.left !== '' || c.right !== '')
    : [];

  // 修正を扱わないシステムでは、保存済みのmodsが残っていても捨てる。残したままだと
  // runSkillUseが画面に出ていない修正でバフを撒いてしまう。
  const mods = !spec.allowMods
    ? []
    : (Array.isArray(raw?.mods)
      ? raw.mods.map(mod => normalizeMod(spec, mod)).filter(Boolean)
      : modsFromLegacyCombo(spec, raw?.combo));

  const storedExpirePhase = typeof raw?.expirePhase === 'string' && EXPIRE_PHASE_KEYS.has(raw.expirePhase)
    ? raw.expirePhase
    : '';

  const normalized = {
    name: typeof raw?.name === 'string' ? raw.name : '',
    // メモ欄を扱わないシステムでは、保存済みの文章が残っていても捨てる（modsと同じ理由）。
    // 画面に出ていない文章を持ち回らないため。キー自体は残す（保存する形を変えない）。
    note: spec.allowNote && typeof raw?.note === 'string' ? raw.note : '',
    fields,
    expirePhase: spec.allowExpirePhase ? storedExpirePhase : '',
    limits: { counts, conditions },
    mods
  };

  // 個数はアイテム（spec.quantity を宣言したもの）だけが持つ。宣言していないシステムに
  // キーを生やさないのは、保存済みデータの形を変えないため。
  if (spec.quantity) normalized.quantity = clampQuantity(spec, raw?.quantity);

  return normalized;
}

/**
 * componentsに保存された一覧を正規形の配列にする。名前が空のものは落とす
 * （旧UIも保存時に同じ条件で捨てていた）。
 *
 * 1件も残らなかった場合は spec.defaultSkills を配る（ステラナイツの出目1〜6のように、
 * 枠が最初から決まっているシステム）。保存前のコマにも最初から枠が並ぶ。
 * 全部消すと既定へ戻るが、それが「標準で備える」枠の意味なのでそのままにしてある。
 */
export function normalizeSkillList(spec, rawList) {
  const list = Array.isArray(rawList)
    ? rawList.map(raw => normalizeSkill(spec, raw)).filter(skill => skill.name !== '')
    : [];

  if (list.length > 0 || spec.defaultSkills.length === 0) return list;
  return spec.defaultSkills.map(raw => normalizeSkill(spec, raw));
}

/** 一覧から名前（完全一致）で1件引く。チャットコマンドの引数解決に使う。 */
export function findSkillByName(skills, name) {
  return skills.find(skill => skill.name === name) ?? null;
}

/**
 * 修正1件の解析結果（値＋なぜその値になったか）。
 * @returns {{value:number, formula:string, unresolvedNames:string[], invalidSyntax:boolean, empty:boolean}}
 */
export function analyzeMod(spec, skill, mod, { token, getEffectiveParameterValue }) {
  return analyzeFormula(mod.formula, { spec, skill, token, getEffectiveParameterValue });
}

/**
 * 複数の修正のうち、追加欄の値が最も小さいもの（DX3のクリティカル値下限は
 * 一番低い＝一番緩いものを適用する）を1つのmetaにまとめる。
 */
export function buildLowestModMeta(spec, paramId, mods) {
  const modTarget = spec.findModTarget(paramId);
  if (!modTarget?.extra) return null;

  const values = mods
    .map(mod => mod.extra?.[modTarget.extra.key])
    .filter(value => Number.isFinite(value));
  if (values.length === 0) return null;

  return { [modTarget.extra.metaKey]: Math.min(...values) };
}

/**
 * このスキルを今使えるか。回数制限と使用条件の両方を見る。
 * 式が評価できなかった場合は使用を止めず、警告（problems）として返す
 * （「上限が読めないので無制限として扱う」という既存の方針に揃えている）。
 * @returns {{usable:boolean, blockedReasons:string[], problems:string[]}}
 */
export function checkSkillUsable(spec, skill, context) {
  const { token, getEffectiveParameterValue } = context;
  const formulaContext = { spec, skill, token, getEffectiveParameterValue };
  const blockedReasons = [];
  const problems = [];

  spec.periods.forEach(period => {
    const limit = skill.limits.counts[period.key];
    if (!limit || limit.max === null) return;

    const analysis = analyzeFormula(limit.max, formulaContext);
    if (analysis.unresolvedNames.length > 0 || analysis.invalidSyntax) {
      problems.push(`${skill.name}／使用制限「${limit.max}」: 式を評価できず、上限なしとして扱いました`);
      return;
    }
    if (limit.current >= analysis.value) {
      blockedReasons.push(`${period.label}の使用回数が上限（${limit.current}/${analysis.value}）に達しています`);
    }
  });

  skill.limits.conditions.forEach(condition => {
    const { satisfied, problem, text } = evaluateCondition(condition, formulaContext);
    if (problem) {
      problems.push(`${skill.name}／使用条件: ${problem}。条件を満たしたものとして扱いました`);
      return;
    }
    if (!satisfied) blockedReasons.push(`使用条件を満たしていません（${text}）`);
  });

  return { usable: blockedReasons.length === 0, blockedReasons, problems };
}

/**
 * 修正値の式のうち、評価できず0になったものの説明。使用時のログへ添えて、
 * 「入力したのにバフが付かない」という無反応を避ける。
 */
export function collectModProblems(spec, skills, context) {
  const problems = [];

  skills.forEach(skill => {
    skill.mods.forEach(mod => {
      const { formula, unresolvedNames, invalidSyntax, empty } = analyzeMod(spec, skill, mod, context);
      if (empty) return;
      const label = spec.findModTarget(mod.paramId)?.label ?? mod.paramId;

      if (unresolvedNames.length > 0) {
        problems.push(`${skill.name}／${label}「${formula}」: 「${unresolvedNames.join('」「')}」を解決できませんでした`);
      } else if (invalidSyntax) {
        problems.push(`${skill.name}／${label}「${formula}」: 式として読めませんでした`);
      }
    });
  });

  return problems;
}

/**
 * 指定スキルの使用回数を全期間+1した新しい一覧を返す（上限が無い期間も記録だけはしておく）。
 * 一覧側の要素は正規形である前提。
 */
export function bumpSkillUsage(spec, skills, skillNames) {
  const targets = new Set(skillNames);
  if (targets.size === 0) return skills;

  return skills.map(skill => {
    if (!targets.has(skill.name)) return skill;
    const counts = {};
    spec.periods.forEach(period => {
      const limit = skill.limits.counts[period.key] ?? { current: 0, max: null };
      counts[period.key] = { ...limit, current: limit.current + 1 };
    });
    return { ...skill, limits: { ...skill.limits, counts } };
  });
}

/**
 * フェーズ終了で、その期間の使用回数を0へ戻す。該当する期間を持たないフェーズ
 * （判定終了・プロセス終了など）では何もしない。
 * 変化が無ければ同一参照を返す（game-store.js側の差分検知に合わせるため）。
 */
export function resetSkillUsageOnPhaseEnd(spec, rawList, phase) {
  if (!spec.periods.some(period => period.key === phase)) return rawList;
  if (!Array.isArray(rawList) || rawList.length === 0) return rawList;

  let changed = false;
  const next = rawList.map(raw => {
    // 旧形式のまま保存されているコマもあるため、置き場は両方見る
    const counts = raw?.limits?.counts ?? raw?.limits;
    const limit = counts?.[phase];
    if (!limit || (limit.current || 0) === 0) return raw;
    changed = true;

    const nextLimit = { ...limit, current: 0 };
    return raw?.limits?.counts
      ? { ...raw, limits: { ...raw.limits, counts: { ...raw.limits.counts, [phase]: nextLimit } } }
      : { ...raw, limits: { ...raw.limits, [phase]: nextLimit } };
  });

  return changed ? next : rawList;
}
