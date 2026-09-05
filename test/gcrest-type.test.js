// test/gcrest-type.test.js
// グランクレストの「属性（PC/NPC/国/モブ）ごとに何を持つか」の対応表を固定するテスト。
//
// この差は5つの表（一覧に出す／手入力の行／パネルへ直接出す群／能力ボックスの戦闘・移動／
// 出すボックス）に分かれていて、
// どれか1つだけ直しても画面はそれらしく動いてしまう（例：モブの一覧にリアクションは出るのに、
// 入力する場所がどこにも無い）。表どうしの食い違いはここで止める。
//
// パネルの描画そのものはDOMに触るのでここでは見ない。見るのは宣言だけで、
// gcrest.js はサーバーからも import されるため node --test でそのまま読める。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GCREST_CHAR_TYPES,
  GCREST_TYPE_VISIBLE_PARAM_IDS,
  GCREST_TYPE_INPUT_PARAM_IDS,
  GCREST_TYPE_READONLY_GROUPS,
  GCREST_TYPE_READONLY_PARAM_IDS,
  GCREST_TYPE_BOXES,
  buildGcrestCharacterParameters,
  readGcrestCharType
} from '../js/parameters/gcrest.js';

const MP = 'GCREST:MP';
const LUCK = 'GCREST:luck';
const MOVE = 'GCREST:move';
const REACTION = 'GCREST:reaction';
const DEFENCES = ['GCREST:defWeapon', 'GCREST:defHeat', 'GCREST:defImpact', 'GCREST:defInner'];

// --- 属性そのもの ---

test('選べる属性は3つで、モブの内部表記は ENEMY のまま', () => {
  // 表示名だけを「簡易エネミー」から改めてある。値を変えると、その名前で保存された
  // 既存のコマの属性が読めなくなる。
  // 「国」は分類が決まるまで選択肢から外してある（対応表の行は残っている）。
  assert.deepEqual(GCREST_CHAR_TYPES, [
    { value: 'PC', label: 'PC' },
    { value: 'NPC', label: 'NPC' },
    { value: 'ENEMY', label: 'モブ' }
  ]);
});

test('知らない属性はPCへ落ちる', () => {
  assert.equal(readGcrestCharType({ 'GCREST:charType': { value: 'NPC' } }), 'NPC');
  assert.equal(readGcrestCharType({ 'GCREST:charType': { value: 'MOB' } }), 'PC');
  assert.equal(readGcrestCharType({}), 'PC');
  assert.equal(readGcrestCharType(null), 'PC');
});

// --- リアクション ---

test('リアクションは locked / 手入力できない / 宣言時は非表示', () => {
  const parameters = buildGcrestCharacterParameters();
  const reaction = parameters[REACTION];

  assert.ok(reaction, 'リアクションのパラメータが無い');
  assert.equal(reaction.label, 'リアクション');
  // lockedでないと、既存のコマへ後から補完されない（registry.jsのwithMissingPluginParameters）
  assert.equal(reaction.locked, true);
  // 手入力させないのは能力・防御力と同じ扱い（入力口はコマ作成ツールのみ）
  assert.equal(reaction.editable, false);
  // 新規コマの既定はPCなので、宣言時に出してしまうとPCの一覧にも並ぶ
  assert.equal(reaction.visible, false);
});

// --- 属性ごとの対応表 ---

test('キャラクター一覧へ出すパラメータ', () => {
  assert.deepEqual(GCREST_TYPE_VISIBLE_PARAM_IDS, {
    PC: [MP, LUCK],
    NPC: [MP],
    COUNTRY: [],
    ENEMY: [MP, REACTION]
  });
});

test('パネルの手入力の行（天運はPCだけ）', () => {
  assert.deepEqual(GCREST_TYPE_INPUT_PARAM_IDS, {
    PC: [MP, LUCK],
    NPC: [MP],
    COUNTRY: [],
    ENEMY: [MP]
  });
});

test('モブは移動力・防御力4種・リアクションをパネルへ直接出す', () => {
  assert.deepEqual(GCREST_TYPE_READONLY_PARAM_IDS.ENEMY, [MOVE, REACTION, ...DEFENCES]);
  // 能力ボックスを持つ属性は、これらをボックスの「戦闘・移動」で出すので二重に並べない
  ['PC', 'NPC', 'COUNTRY'].forEach(type => {
    assert.deepEqual(GCREST_TYPE_READONLY_PARAM_IDS[type], [], type);
  });
});

test('モブの防御力4種は、能力ボックスと同じ横一列の群になっている', () => {
  // 縦に4行並べると「防御力（武器）」を4回前置することになり、PC・NPCが能力ボックスで
  // 見ている形と食い違う。見出し1つ＋短い名前の横一列に畳むのはあちらと同じ扱い。
  assert.deepEqual(GCREST_TYPE_READONLY_GROUPS.ENEMY, [
    { rows: [MOVE, REACTION] },
    { label: '防御力', layout: 'flow', rows: DEFENCES }
  ]);
});

test('平らにした表は、群の宣言から導かれている', () => {
  Object.entries(GCREST_TYPE_READONLY_GROUPS).forEach(([type, groups]) => {
    assert.deepEqual(
      GCREST_TYPE_READONLY_PARAM_IDS[type],
      groups.flatMap(group => group.rows),
      type
    );
  });
});

test('属性ごとに出すボックス', () => {
  assert.deepEqual(GCREST_TYPE_BOXES.NPC, {
    ability: true, arts: true, equipment: false, items: false, unit: false, bonds: false
  });
  assert.deepEqual(GCREST_TYPE_BOXES.ENEMY, {
    ability: false, arts: true, equipment: false, items: false, unit: false, bonds: false
  });
  // 国はまだ中身がこれからなので、PCと同じまま残してある
  assert.deepEqual(GCREST_TYPE_BOXES.COUNTRY, GCREST_TYPE_BOXES.PC);
});

// --- 表どうしの食い違い ---

test('選べる属性は、どの表にも行がある', () => {
  // どれか1つの表で足し忘れると、その属性でだけ値やボックスが黙って消える。
  // 逆に、選択肢から外してある「国」の行が表に残っているのは構わない（戻すときのため）。
  const values = GCREST_CHAR_TYPES.map(type => type.value);
  Object.entries({
    GCREST_TYPE_VISIBLE_PARAM_IDS,
    GCREST_TYPE_INPUT_PARAM_IDS,
    GCREST_TYPE_READONLY_GROUPS,
    GCREST_TYPE_READONLY_PARAM_IDS,
    GCREST_TYPE_BOXES
  }).forEach(([name, table]) => {
    values.forEach(value => assert.ok(value in table, `${name} に ${value} の行が無い`));
  });
});

test('能力ボックスを持たない属性には、パネル側の入力口がある', () => {
  // ボックスも無く行も無い＝画面のどこからも数値を入れられない属性を作らないための歯止め。
  GCREST_CHAR_TYPES.forEach(({ value }) => {
    if (GCREST_TYPE_BOXES[value].ability) return;
    assert.ok(
      GCREST_TYPE_READONLY_PARAM_IDS[value].length > 0,
      `${value}に数値の入力口が無い`
    );
  });
});

test('パネルへ出す行は、プラグインが実際に持つパラメータだけ', () => {
  const parameters = buildGcrestCharacterParameters();
  Object.entries(GCREST_TYPE_INPUT_PARAM_IDS).forEach(([type, ids]) => {
    ids.forEach(id => {
      assert.ok(parameters[id], `${type}: ${id} が無い`);
      // 手入力の行はSET_PARAMETERを通るので、editable:falseのものを置いてはいけない
      assert.equal(parameters[id].editable, true, `${type}: ${id} は手入力できない`);
    });
  });
  Object.entries(GCREST_TYPE_READONLY_PARAM_IDS).forEach(([type, ids]) => {
    ids.forEach(id => {
      assert.ok(parameters[id], `${type}: ${id} が無い`);
      // こちらはIMPORT_CHARACTER_DATA経由で書く行。editable:trueなら手入力の表へ置くこと
      assert.equal(parameters[id].editable, false, `${type}: ${id} は手入力できてしまう`);
    });
  });
});

test('一覧へ出すパラメータは、パネルに入力口を持つ', () => {
  // 一覧に数字だけ並んで、どこからも直せない状態にならないようにする。
  Object.entries(GCREST_TYPE_VISIBLE_PARAM_IDS).forEach(([type, ids]) => {
    ids.forEach(id => {
      const shown = [...GCREST_TYPE_INPUT_PARAM_IDS[type], ...GCREST_TYPE_READONLY_PARAM_IDS[type]];
      assert.ok(shown.includes(id), `${type}: ${id} の入力口が無い`);
    });
  });
});
