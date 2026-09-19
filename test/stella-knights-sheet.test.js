// test/stella-knights-sheet.test.js
// 銀剣のステラナイツの「Webキャラクターシートの取り込み」を固定するテスト。
//
// シートは騎士の種別がエンブレイス/エクリプスだと、ステータスと隠したスキルを公開JSONから外し、
// 閲覧パスワードの奥（openSecret）へ移す。サーバーはそれを json.secret に付けて返すので、
// 取り込みがどちらを読むかを取り違えると「ただ値が入らない」だけで気付きにくい。
//
// importStellaKnightsCharacterJson は DOM に触らないので node --test でそのまま動く
// （stella-knights.js 自体もサーバーから import されるため Node で読める）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  importStellaKnightsCharacterJson,
  STELLA_KNIGHTS_SHEET_SOURCE
} from '../js/parameters/stella-knights.js';

const SKILL_KEY = 'stellaKnightsSkills';

// 実物のシート（エンブレイス、パスワード未設定）から、取り込みが読む欄だけを写したもの。
// 公開JSON（display?ajax=1）には status が無い。
const skillRows = [
  { name: '騎士のたしなみ', type: 'アタック／ムーヴ', timing: 'あなたのターン', effect: '効果1' },
  { name: 'まだ終わらない、私がいる限り', type: 'アタック/ギャンビット', timing: 'あなたのターン', effect: '効果2' },
  { name: '先へ、まだ先へ、歩みを止めず', type: 'ムーヴ/アタック', timing: 'あなたのターン', effect: '効果3' },
  { name: '見上げよ空、輝く彗星', type: 'ギャンビット', timing: 'あなたのターン', effect: '効果4' },
  { name: '創世神話・空の堕ちた日', type: 'アタック/ムーヴ', timing: 'あなたのターン', effect: '効果5' },
  { name: '†もう少しだけ、相手をしてあげる†\n', type: 'エネミー専用/ギャンビット', timing: 'あなたの耐久力が０になった直後', effect: '効果6' }
];

const PUBLIC_SHEET = {
  base: { name: 'エンブレイズ仮', knight: { type: 'エンブレイス' } },
  sheath: { wish: null },
  skills: skillRows,
  skillshead: { allhidden: null }
};

// openSecret の応答（pass はサーバーが落としてから付ける）
const SECRET = {
  status: { charge: '3', defense: '3', hp: '45', medal: null, resonance: null },
  skills: skillRows
};

const skillsOf = (result) => result.components[SKILL_KEY];

test('秘匿欄のステータスが耐久力・防御力・チャージダイス数へ入る', () => {
  const result = importStellaKnightsCharacterJson({ ...PUBLIC_SHEET, secret: SECRET });

  assert.equal(result.name, 'エンブレイズ仮');
  assert.deepEqual(result.valueOverrides, {
    'core:hp': 45,
    'STELLA_KNIGHTS:defense': 3,
    'STELLA_KNIGHTS:charge': 3
  });
  assert.equal(result.labelOverrides['core:hp'], '耐久力');
});

test('ステラナイト（公開JSONに status がある）はそのまま読む', () => {
  const result = importStellaKnightsCharacterJson({
    ...PUBLIC_SHEET,
    status: { hp: '30', defense: '2', charge: '4' }
  });

  assert.deepEqual(result.valueOverrides, {
    'core:hp': 30,
    'STELLA_KNIGHTS:defense': 2,
    'STELLA_KNIGHTS:charge': 4
  });
});

// 歪みの取り込み元はシートの「歪みの共鳴」（status.resonance）。
// シートに「歪み」という名前の欄は無いので、ここを取り違えると値が入らないまま気付けない。
test('歪みはシートの「歪みの共鳴」から入る', () => {
  const result = importStellaKnightsCharacterJson({
    ...PUBLIC_SHEET,
    status: { hp: '30', defense: '2', charge: '4', resonance: '5' }
  });

  assert.equal(result.valueOverrides['STELLA_KNIGHTS:distortion'], 5);
});

test('歪みの共鳴は秘匿欄からも入る', () => {
  const result = importStellaKnightsCharacterJson({
    ...PUBLIC_SHEET,
    secret: { ...SECRET, status: { ...SECRET.status, resonance: '2' } }
  });

  assert.equal(result.valueOverrides['STELLA_KNIGHTS:distortion'], 2);
});

// 歪みの共鳴は自由記入の欄なので、数字とはかぎらない。読めない値で0を上書きしない
test('歪みの共鳴が空欄・数字以外なら、歪みは既定値のまま', () => {
  for (const resonance of [null, '', '○', undefined]) {
    const result = importStellaKnightsCharacterJson({
      ...PUBLIC_SHEET,
      status: { hp: '30', resonance }
    });

    assert.equal('STELLA_KNIGHTS:distortion' in result.valueOverrides, false,
      `${JSON.stringify(resonance)}: 読めない値が入った`);
  }
});

test('秘匿欄が取れなかったシートも、名前とスキルは入る', () => {
  const result = importStellaKnightsCharacterJson({ ...PUBLIC_SHEET, secretMissing: true });

  assert.equal(result.name, 'エンブレイズ仮');
  assert.deepEqual(result.valueOverrides, {});
  assert.equal(skillsOf(result).length, 6);
});

test('スキルの対応する数字は行の位置で1〜6になる', () => {
  const skills = skillsOf(importStellaKnightsCharacterJson({ ...PUBLIC_SHEET, secret: SECRET }));

  assert.deepEqual(skills.map(skill => skill.fields.number), ['1', '2', '3', '4', '5', '6']);
  assert.equal(skills[0].name, '騎士のたしなみ');
  assert.equal(skills[0].note, '効果1');
  assert.equal(skills[0].fields.type, 'アタック／ムーヴ');
});

test('7行目以降のスキルは「0/7」になる', () => {
  const rows = [...skillRows, { name: '七つ目', type: '', timing: '', effect: '' }];
  const skills = skillsOf(importStellaKnightsCharacterJson({ ...PUBLIC_SHEET, skills: rows, status: {} }));

  assert.equal(skills.length, 7);
  assert.equal(skills[6].fields.number, '0/7');
});

test('途中に空の行があっても、後ろの行の数字は繰り上がらない', () => {
  // 公開側では隠したスキルが {} に置き換わる
  const rows = [skillRows[0], {}, skillRows[2]];
  const skills = skillsOf(importStellaKnightsCharacterJson({ ...PUBLIC_SHEET, skills: rows, status: {} }));

  assert.deepEqual(skills.map(skill => [skill.name, skill.fields.number]), [
    ['騎士のたしなみ', '1'],
    ['先へ、まだ先へ、歩みを止めず', '3']
  ]);
});

test('秘匿欄のスキルがあれば、隠したスキルもそちらから入る', () => {
  const publicRows = [skillRows[0], {}];
  const secretRows = [skillRows[0], skillRows[1]];
  const skills = skillsOf(importStellaKnightsCharacterJson({
    ...PUBLIC_SHEET,
    skills: publicRows,
    secret: { status: SECRET.status, skills: secretRows }
  }));

  assert.deepEqual(skills.map(skill => skill.name), ['騎士のたしなみ', 'まだ終わらない、私がいる限り']);
});

test('秘匿欄を取りに行くのは、公開JSONに status が無いときだけ', () => {
  const { secret } = STELLA_KNIGHTS_SHEET_SOURCE;

  assert.equal(secret.fetchPath, '/stellar/openSecret');
  assert.equal(secret.isNeeded(PUBLIC_SHEET), true);
  assert.equal(secret.isNeeded({ ...PUBLIC_SHEET, status: { hp: '30' } }), false);
  assert.ok(secret.missingNotice.length > 0);
});
