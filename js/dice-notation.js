// js/dice-notation.js
// BCDice APIが返す出目の配列（rands）を、3Dダイス（vendor/dice-box-threejs）へ渡す
// ダイス記法へ変換する。表示だけを担当し、判定や合計には一切関わらない。
//
// dice-box-threejsは "2d6@3,5" の "@" 以降で出目を指定できる。これを使うことで、
// 画面のダイスが必ずBCDiceの結果と同じ面で止まる（物理演算の結果を採用してしまうと、
// ログには8・画面には5、という食い違いが常時起きる）。

// 一度に転がすダイスの上限。クトゥルフ7版のCC(45)のようなボーナス/ペナルティダイスは
// 実測で47個のrandsを返し、そのまま投げると物理演算が破綻する。演出なので割り切って打ち切る。
export const MAX_ANIMATED_DICE = 20;

// BCDiceの面数 → dice-box-threejsのダイス種別（src/const/dice.jsのプリセット名）。
// ここに無い面数（d66の構成要素や変則ダイス等）は3Dモデルが無いので演出しない。
const SIDES_TO_TYPE = {
  2: 'd2',
  3: 'd3',
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20'
};

// rand 1件を、画面に出すダイス（0個以上）へ展開する。
// dice-box-threejs側の値の決まりに合わせる点が2つある：
//   ・d10は1〜10で、10が「0」の面
//   ・d100（十の位ダイス）は10〜100で、100が「00」の面
function expandRand(rand) {
  const { kind, sides, value } = rand ?? {};
  if (!Number.isInteger(value)) return [];

  // クトゥルフ7版のボーナス/ペナルティダイスなど、十の位だけを振った場合。
  // BCDiceは0,10,…,90を返すので、0を「00」の面（=100）へ読み替える。
  if (kind === 'tens_d10') {
    return [{ type: 'd100', value: value === 0 ? 100 : value }];
  }

  // 1D100をrand 1件（0〜100）で返す形。画面上は十の位ダイスと一の位ダイスの2個で表す。
  if (sides === 100) {
    const tens = Math.floor(value / 10) * 10 || 100;
    const ones = value % 10 || 10;
    return [{ type: 'd100', value: tens }, { type: 'd10', value: ones }];
  }

  const type = SIDES_TO_TYPE[sides];
  if (!type) return [];
  return [{ type, value }];
}

// randsをダイス記法へ変換する。演出できるダイスが1個も無ければnull（＝何も出さない）。
//
// dice-box-threejsは同じ種別のセットをまとめ、ダイスを「セット順→セット内の個数順」で
// 生成する。一方で "@" の値は生成順に先頭から消費されるため、d6,d10,d6 のように混ざった
// 並びをそのまま書くと値と面がずれる。そこで種別ごと（初出順）にまとめてから組み立て、
// 値も同じ順で並べる。
export function randsToNotation(rands) {
  if (!Array.isArray(rands)) return null;

  const groups = new Map(); // type → 出目の配列（Mapは挿入順を保つ）
  let total = 0;

  for (const rand of rands) {
    const dice = expandRand(rand);
    // 1D100の展開（2個）が上限をまたぐ場合は、十の位だけ残すと誤解を招くので丸ごと諦める
    if (dice.length === 0 || total + dice.length > MAX_ANIMATED_DICE) continue;

    for (const { type, value } of dice) {
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type).push(value);
    }
    total += dice.length;
  }

  if (total === 0) return null;

  const sets = [...groups].map(([type, values]) => `${values.length}${type}`);
  const values = [...groups.values()].flat();
  return `${sets.join('+')}@${values.join(',')}`;
}
