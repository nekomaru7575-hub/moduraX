// js/parameters/gcrest.js（例）
import { buildParameters } from './paramFactory.js';

export const GCREST_ROOM_PARAMETERS = [
  { key: "chaosLevel", label: "混沌レベル", value: 0 }
];

export function buildGcrestRoomParameters() {
  return buildParameters("GCREST", GCREST_ROOM_PARAMETERS);
}

export const GCREST_PLUGIN = {
  id: 'GCREST',
  label: 'グランクレスト',
  buildCharacterParameters: () => ({}), // キャラクター側は今回省略
  buildRoomParameters: buildGcrestRoomParameters,

  // このシステム用のスタンプ（docs/plugin-guide.md 3.9）。宣言するのはデータだけで、
  // 画像URLはCoreが image/stamps/gcrest/<file> として組み立てる。
  // 公開IDは 'GCREST:chaos' になるので、Coreの表のIDとぶつかることはない。
  stamps: [
    { id: 'chaos', label: '混沌', file: 'chaos.png' }
  ]
};