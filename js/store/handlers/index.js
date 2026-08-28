// js/store/handlers/index.js
// アクション名 → ハンドラの一枚の表。ImmutableStore.dispatch はここを引くだけ。
//
// 【ハンドラの約束】
// - 受け取るのは dispatch が用意した文脈だけ:
//     prevState        今の状態（読むだけ）
//     payload          アクションの引数
//     activePlugin     この部屋に適用中のプラグインID
//     nextTokensState  コマの作業用コピー。書き換えてから commit に渡す
//     commit(patch)    変えたスライスだけを渡して次の状態を確定する
//   実際に使うものだけを分割代入で受け取る（その case が何を材料にするかが読めるように）。
// - commit を呼ぶのは高々1回。何もしないなら commit を呼ばずに抜ける。
//   状態を作り直さない＝無駄な再描画・同期・保存を起こさない、という約束なので、
//   「変化なし」の判定を面倒がって commit を呼ぶことはしない。
// - commit の後に EventBus へ流す通知がある場合は、その場で emit する（順序が意味を持つ）。
// - 戻り値は見ない。
//
// 【表の引き方】
// プロトタイプ由来の名前（'constructor' 等）を引かないよう、この表は Object.create(null)
// の上に作る。素のオブジェクトリテラルだと action:'constructor' が Object そのものを返し、
// payload の全キーがそのまま通ってしまう（js/store/patch.js の fieldPatchFor に、
// 同じ罠を実際に踏んだときの顛末が書いてある）。

import { AUDIO_HANDLERS } from './audio.js';
import { BOARD_HANDLERS } from './board.js';
import { BUFFS_HANDLERS } from './buffs.js';
import { CHARACTERS_HANDLERS } from './characters.js';
import { CHAT_HANDLERS } from './chat.js';
import { INFO_HANDLERS } from './info.js';
import { PARTICIPANTS_HANDLERS } from './participants.js';
import { ROOM_HANDLERS } from './room.js';
import { ROUND_HANDLERS } from './round.js';
import { SCENES_HANDLERS } from './scenes.js';

const TABLES = [
  CHARACTERS_HANDLERS,   // コマそのものとパラメータ
  BUFFS_HANDLERS,        // バフ/デバフ
  ROUND_HANDLERS,        // ラウンド進行
  ROOM_HANDLERS,         // 部屋の設定・ルーム変数・オリジナル表
  PARTICIPANTS_HANDLERS, // 参加者とスタンプの集計
  SCENES_HANDLERS,       // シーン
  AUDIO_HANDLERS,        // 音楽
  CHAT_HANDLERS,         // チャットのタブとログ
  BOARD_HANDLERS,        // パネル・カード・デッキ
  INFO_HANDLERS          // 情報
];

export const ACTION_HANDLERS = Object.assign(Object.create(null), ...TABLES);

// アクション名が2つの表に跨っていないことを、読み込んだ時点で確かめる。
// 重なっていると後勝ちで静かに片方が死ぬ（アクション名はネットワーク同期の識別子でもあり、
// 気づくのはサーバーと画面で挙動がずれてからになる）。
const declared = TABLES.reduce((sum, table) => sum + Object.keys(table).length, 0);
if (Object.keys(ACTION_HANDLERS).length !== declared) {
  throw new Error('[ACTION_HANDLERS] アクション名が2つ以上の表に重複しています');
}
