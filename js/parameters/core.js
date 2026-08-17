// js/parameters/core.js
import { buildParameters } from './paramFactory.js';

export const CORE_DEFAULT_PARAMETERS = [
  { key: 'hp', label: 'HP', value: 0 },
  { key: 'initiative', label: 'イニシアチブ', value: 0, locked: true, visible: false },
];

export function buildDefaultParameters() {
  return buildParameters('core', CORE_DEFAULT_PARAMETERS);
}

// どのシステムでも共通のルーム変数。プラグインのルーム変数（ステラナイツのブーケ合計等）と
// 同じ棚に並び、ダイス式などから {現在のラウンド} で参照できる。
// 値はラウンド進行の状態から自動で決まる（進行していなければ0）ので、手で書き換えられない
// ようeditable:false、消せないようlocked:trueにしてある（js/game-store.jsのwithCoreRoomParameters）。
export const CORE_DEFAULT_ROOM_PARAMETERS = [
  { key: 'round', label: '現在のラウンド', value: 0, locked: true, editable: false },
];

export function buildDefaultRoomParameters() {
  return buildParameters('core', CORE_DEFAULT_ROOM_PARAMETERS);
}