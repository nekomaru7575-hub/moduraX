// test/gcrest-sheet.test.js
// グランクレストの「ゆとシートJSONの取り込み」の対応表を固定するテスト。
//
// 取り込みは、シートの綴り（sttPerCheckTotal・armorTotalDefFire・force1Str）と
// このプラグインの綴り（GCREST:SEN・GCREST:defHeat・mods.STR）が**どこも一致していない**
// 対応表なので、読み違えても画面上は「ただ値が入らない」だけで気付きにくい。
// ここで1件ずつ突き合わせておく。
//
// importGcrestCharacterJson は DOM に触らないので node --test でそのまま動く
// （gcrest.js 自体もサーバーから import されるため Node で読める）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  importGcrestCharacterJson,
  sumGcrestItemWeight
} from '../js/parameters/gcrest.js';

// 実物のシート（ゆとシート ytsheet/gc、302キー）から、取り込みが読む欄だけを写したもの。
// 値は実物のまま変えていない。
const SHEET = {
  characterName: '剣の君主＋部隊（テスト）',
  // 取り込まない欄（クラス等）も、混ざっていて害が無いことを見るために残してある
  class: 'ロード', style: 'セイバー', works: '騎士A', level: '1', playerName: 'TALE',

  // 副能力
  sttHpTotal: '40', sttMpTotal: '33', sttFateTotal: '3',
  sttInitTotal: '6', sttMoveTotal: '2', sttMaxWeight: '26',

  // 能力判定値（Total は能力値そのもので、取り込むのは CheckTotal のほう）
  sttStrTotal: '13', sttStrCheckTotal: '6',
  sttRefTotal: '12', sttRefCheckTotal: '6',
  sttPerTotal: '9', sttPerCheckTotal: '4',
  sttIntTotal: '9', sttIntCheckTotal: '3',
  sttMndTotal: '12', sttMndCheckTotal: '5',
  sttEmpTotal: '10', sttEmpCheckTotal: '3',

  // 技能。専門知識と芸術はコロンの後ろが空＝未使用の枠
  skillStr1Label: '格闘', skillStr1Lv: '2',
  skillStr3Label: '重武器', skillStr3Lv: '3',
  skillRef5Label: '騎乗', skillRef5Lv: '3',
  skillInt5Label: '専門知識:', skillInt5Lv: '2',
  skillEmp4Label: '芸術:', skillEmp4Lv: '2',

  // 防具の合計（防御力のパラメータはここから取る）
  armorTotalDefWeapon: '4', armorTotalDefFire: '10',
  armorTotalDefShock: '5', armorTotalDefInternal: '6',

  // 天恵。Num は枠の数で、埋まっている数とは限らない
  classAbilityNum: '4',
  classAbility1Name: '光炎の印', classAbility1Lv: '1', classAbility1Timing: 'セットアップ',
  classAbility1Target: '自身', classAbility1Range: '―', classAbility1Cost: '8',
  classAbility1MC: '○', classAbility1Check: '自動成功', classAbility1Dfclty: '―',
  classAbility1Type: '天恵（強化／BS）',
  classAbility1Note: '1ラウンド中、武器のダメージ属性に&lt;炎熱&gt;を追加',
  classAbility2Name: '疾風剣の印', classAbility2Lv: '2', classAbility2MC: 'FW',
  classAbility2Cost: '5', classAbility2Check: '白兵技能', classAbility2Dfclty: '対決',
  classAbility4Name: '閃光刃の印', classAbility4Lv: '1', classAbility4MC: '○',
  classAbility4Cost: '天運', classAbility4Note: 'ダメージ+［消費天運（最大5）×10］。シナリオ1回',

  // ワークス特技。MC欄を持たない
  worksAbilityNum: '3',
  worksAbility1Name: '武器熟練：重武器', worksAbility1Lv: '1', worksAbility1Cost: '―',
  worksAbility1Timing: '常時', worksAbility1Type: '戦闘',

  // アイテム
  itemNum: '3',
  item1Name: '治療キット', item1Note: '〈治療〉達成値分HP回復', item1Quantity: '1', item1Weight: '2',
  item2Name: '気付け薬', item2Note: '2DMP回復', item2Quantity: '3', item2Weight: '2',

  // 武器（Sub は無い）。Total は合計欄なので取り込まない
  weaponMainName: 'グレートソード', weaponMainType: '重武器（大剣）', weaponMainSkill: '〈重武器〉',
  weaponMainAcc: '-1', weaponMainAtk: '12+3D', weaponMainGuard: '6', weaponMainRange: '0Sq',
  weaponMainInit: '0', weaponMainMove: '-3', weaponMainWeight: '10',
  weaponTotalName: '合計であって装備ではない', weaponTotalAtk: '12+3D', weaponTotalWeight: '10',

  // 防具（Main と Sub）
  armorMainName: 'サーコートメイル', armorMainType: '鎧／金属',
  armorMainDefWeapon: '4', armorMainDefFire: '9', armorMainDefShock: '4', armorMainDefInternal: '6',
  armorMainEva: '-2', armorMainInit: '-3', armorMainMove: '-3', armorMainWeight: '7',
  armorSubName: 'マント', armorSubType: '外套／革',
  armorSubDefWeapon: '0', armorSubDefFire: '1', armorSubDefShock: '1', armorSubDefInternal: '0',
  armorSubEva: '0', armorSubInit: '0', armorSubMove: '-1', armorSubWeight: '1',

  // 乗騎
  vehicle1Name: 'ウォーホース', vehicle1Acc: '-1', vehicle1Atk: '0',
  vehicle1DefWeapon: '0', vehicle1DefFire: '0', vehicle1DefShock: '0', vehicle1DefInternal: '0',
  vehicle1Eva: '0', vehicle1Init: '0', vehicle1Move: '5', vehicle1Note: '同乗人数1人',

  // 部隊
  forceNum: '1',
  force1Type: '歩兵', force1Lv: '1', force1Morale: '5',
  force1Str: '1', force1Ref: '1', force1Per: '1', force1Int: '1', force1Mnd: '1', force1Emp: '0',
  force1Hp: '20', force1Init: '1', force1Move: '0', force1Atk: '3',
  force1DefWeapon: '3', force1DefFire: '2', force1DefShock: '2', force1DefInternal: '0'
};

const imported = () => importGcrestCharacterJson(SHEET);

// --- 入口 ---

test('グランクレストのシートでないものは取り込まない', () => {
  // 他システムのシートを読ませたときに、黙って空のコマを作らないこと
  assert.equal(importGcrestCharacterJson(null), null);
  assert.equal(importGcrestCharacterJson({}), null);
  assert.equal(importGcrestCharacterJson({ characterName: '誰か', maxHpTotal: '30' }), null);
});

test('キャラクター名と、行動値への改称が返る', () => {
  const result = imported();
  assert.equal(result.name, '剣の君主＋部隊（テスト）');
  assert.deepEqual(result.labelOverrides, { 'core:initiative': '行動値' });
});

// --- パラメータ ---

test('副能力がパラメータへ入る', () => {
  const { valueOverrides } = imported();
  assert.equal(valueOverrides['core:hp'], 40);
  assert.equal(valueOverrides['core:initiative'], 6);
  assert.equal(valueOverrides['GCREST:MP'], 33);
  assert.equal(valueOverrides['GCREST:luck'], 3);
  assert.equal(valueOverrides['GCREST:move'], 2);
  assert.equal(valueOverrides['GCREST:loadMax'], 26);
  assert.equal(valueOverrides['GCREST:morale'], 5);
});

test('能力は「判定値」のほうを取る（能力値そのものは取らない）', () => {
  const { valueOverrides } = imported();
  assert.equal(valueOverrides['GCREST:STR'], 6);   // sttStrCheckTotal。sttStrTotal は13
  assert.equal(valueOverrides['GCREST:REF'], 6);
  assert.equal(valueOverrides['GCREST:SEN'], 4);   // シートの綴りは Per
  assert.equal(valueOverrides['GCREST:INT'], 3);
  assert.equal(valueOverrides['GCREST:MND'], 5);
  assert.equal(valueOverrides['GCREST:EMP'], 3);
});

test('防御力は装備込みの合計欄から取る', () => {
  const { valueOverrides } = imported();
  assert.equal(valueOverrides['GCREST:defWeapon'], 4);
  assert.equal(valueOverrides['GCREST:defHeat'], 10);    // シートは Fire
  assert.equal(valueOverrides['GCREST:defImpact'], 5);   // シートは Shock
  assert.equal(valueOverrides['GCREST:defInner'], 6);    // シートは Internal
});

test('攻撃力はパラメータへ入れない（ダイス式で数値に収まらない）', () => {
  const { valueOverrides } = imported();
  assert.equal('GCREST:atk' in valueOverrides, false);
  // 数値でない値が紛れ込んでいないこと
  Object.values(valueOverrides).forEach(value => {
    assert.equal(typeof value, 'number');
    assert.equal(Number.isFinite(value), true);
  });
});

test('技能はラベル一致で引く', () => {
  const { valueOverrides } = imported();
  assert.equal(valueOverrides['GCREST:sklMelee'], 2);   // 格闘
  assert.equal(valueOverrides['GCREST:sklHeavy'], 3);   // 重武器
  assert.equal(valueOverrides['GCREST:sklRide'], 3);    // 騎乗
});

test('名前が空の自由記述枠（専門知識: / 芸術:）は拾わない', () => {
  const { newParameters } = imported();
  assert.deepEqual(Object.keys(newParameters), []);
});

test('名前のある自由記述枠はパラメータとして足す', () => {
  const result = importGcrestCharacterJson({
    ...SHEET,
    skillInt5Label: '専門知識:考古学', skillInt5Lv: '3',
    skillInt6Label: '専門知識:紋章学', skillInt6Lv: '2',
    skillEmp4Label: '芸術:詩', skillEmp4Lv: '4'
  });
  const added = result.newParameters;
  assert.deepEqual(Object.keys(added).sort(), [
    'GCREST:freeArt1', 'GCREST:freeExpert1', 'GCREST:freeExpert2'
  ]);
  assert.equal(added['GCREST:freeExpert1'].label, '専門知識：考古学');
  assert.equal(added['GCREST:freeExpert1'].value, 3);
  assert.equal(added['GCREST:freeArt1'].label, '芸術：詩');
  // 消せて、手入力はさせず、一覧には出さない
  assert.equal(added['GCREST:freeExpert1'].locked, false);
  assert.equal(added['GCREST:freeExpert1'].editable, false);
  assert.equal(added['GCREST:freeExpert1'].visible, false);
});

// --- 特技 ---

test('天恵とワークス特技が1つの一覧に入る', () => {
  const arts = imported().components.arts;
  assert.deepEqual(arts.map(art => art.name), [
    '光炎の印', '疾風剣の印', '閃光刃の印', '武器熟練：重武器'
  ]);
  arts.forEach(art => assert.equal(art.fields.kind, 'art'));
});

test('MC・判定・難易度がそのまま入る', () => {
  const [first, second] = imported().components.arts;
  assert.equal(first.fields.mc, '○');
  assert.equal(first.fields.check, '自動成功');
  assert.equal(first.fields.targetValue, '―');
  assert.equal(second.fields.mc, 'FW');
  assert.equal(second.fields.check, '白兵技能');
  assert.equal(second.fields.targetValue, '対決');
});

test('MC欄を持たないワークス特技は○になる', () => {
  const works = imported().components.arts.find(art => art.name === '武器熟練：重武器');
  assert.equal(works.fields.mc, '○');
});

test('コストは数値ならMP、「天運」なら天運、「―」ならコストなし', () => {
  const arts = imported().components.arts;
  const byName = (name) => arts.find(art => art.name === name).fields;

  assert.equal(byName('光炎の印').costType, 'GCREST:MP');
  assert.equal(byName('光炎の印').costValue, 8);

  // 「消費天運（最大5）」のように使うたび決めるので、値は0のままにする
  assert.equal(byName('閃光刃の印').costType, 'GCREST:luck');
  assert.equal(byName('閃光刃の印').costValue, 0);

  assert.equal(byName('武器熟練：重武器').costType, '');
  assert.equal(byName('武器熟練：重武器').costValue, 0);
});

test('効果のHTML実体参照が元の文字へ戻り、種別が先頭に付く', () => {
  const first = imported().components.arts[0];
  assert.equal(first.note, '天恵（強化／BS）／1ラウンド中、武器のダメージ属性に<炎熱>を追加');
});

// --- 装備 ---

test('武器・防具・乗騎が装備の一覧に入る（合計欄は読まない）', () => {
  const equipment = imported().components.equipment;
  assert.deepEqual(equipment.map(item => [item.fields.kind, item.name]), [
    ['weapon', 'グレートソード'],
    ['armor', 'サーコートメイル'],
    ['armor', 'マント'],
    ['vehicle', 'ウォーホース']
  ]);
});

test('武器のダイス式と単位付きの射程が文字列のまま残る', () => {
  const weapon = imported().components.equipment[0];
  assert.equal(weapon.fields.atk, '12+3D');   // number 欄にすると 0 へ潰れる
  assert.equal(weapon.fields.range, '0Sq');
  assert.equal(weapon.fields.skill, '〈重武器〉');
  assert.equal(weapon.fields.acc, -1);
  assert.equal(weapon.fields.guard, 6);
  assert.equal(weapon.fields.weight, 10);
});

test('防具の防御力4種が綴りどおり移る', () => {
  const armor = imported().components.equipment[1];
  assert.equal(armor.fields.defWeapon, 4);
  assert.equal(armor.fields.defHeat, 9);     // armorMainDefFire
  assert.equal(armor.fields.defImpact, 4);   // armorMainDefShock
  assert.equal(armor.fields.defInner, 6);    // armorMainDefInternal
  assert.equal(armor.fields.eva, -2);
});

test('乗騎の効果欄が内容へ入る', () => {
  const vehicle = imported().components.equipment[3];
  assert.equal(vehicle.note, '同乗人数1人');
  assert.equal(vehicle.fields.move, 5);
});

// --- アイテムと重量 ---

test('アイテムが個数つきで入る', () => {
  const items = imported().components.items;
  assert.deepEqual(items.map(item => [item.name, item.quantity, item.fields.weight]), [
    ['治療キット', 1, 2],
    ['気付け薬', 3, 2]
  ]);
});

test('アイテムと装備の重量の合計が、シートの totalWeight と一致する', () => {
  const { items, equipment } = imported().components;
  // シートの totalWeight は 26（アイテム8＋防具8＋武器10）
  assert.equal(sumGcrestItemWeight(items), 8);
  assert.equal(sumGcrestItemWeight(equipment), 18);
  assert.equal(sumGcrestItemWeight(items) + sumGcrestItemWeight(equipment), 26);
});

// --- 部隊 ---

test('部隊の修正値が14項目そろう', () => {
  const unit = imported().components.unit;
  assert.deepEqual(unit.mods, {
    STR: 1, REF: 1, SEN: 1, INT: 1, MND: 1, EMP: 0,
    hp: 20, initiative: 1, move: 0,
    atk: 3,
    defWeapon: 3, defHeat: 2, defImpact: 2, defInner: 0
  });
});

test('部隊はMCオフ・FWで取り込み、種別を名前に置く', () => {
  const unit = imported().components.unit;
  assert.equal(unit.mc, false);        // マスコンバットが始まったら卓で入れる
  assert.equal(unit.position, 'FW');
  assert.equal(unit.name, '歩兵');     // シートに部隊名の欄が無いため
});

test('部隊を持たないシートでは部隊を作らない', () => {
  const withoutForce = { ...SHEET };
  Object.keys(withoutForce)
    .filter(key => key.startsWith('force'))
    .forEach(key => delete withoutForce[key]);

  const result = importGcrestCharacterJson(withoutForce);
  assert.equal('unit' in result.components, false);
  assert.equal('GCREST:morale' in result.valueOverrides, false);
});
