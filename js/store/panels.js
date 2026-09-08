// js/store/panels.js
// パネルの「クリックしたときの振る舞い」（clickAction）の形と、その正規化。
//
// パネルは元々クリックしても何も起きない置物だった。ここに1つだけ振る舞いを持たせて、
// 「押すとシーンが変わるボタン」「押すとダイスを振るボタン」を部屋の中に置けるようにする。
//
// 【なぜ正規化がここに要るか】js/game-store.jsのhydrateは、cards・decks・stamps・infoEntriesを
// それぞれnormalizeで通しているのに、panelsだけは `newState.panels || {}` の素通しになっている。
// つまり**取り込んだ部屋データ（信用しないJSON）のパネルは形の検証を受けずに状態へ入る**。
// これまでは中身が座標と文字列だけだったので実害が小さかったが、clickActionは
// 「押すと何かが起きる」ので、細工された形がそのまま入ると押した人の側で動く。
// hydrateからここを通し、形の合わないものはすべてnullへ落とす。
//
// パネルの他の項目（cols/rows/stackOrder等）が検証を受けていないのは別の穴で、
// ここでは手を付けていない。足すときはこのファイルへ足すこと。

import { AUDIO_CHANNELS } from './audio.js';

/**
 * クリックオプションの種類。
 *
 * **Setで持ち、オブジェクトのキー参照で引かないこと。** 素の `TABLE[type]` にすると
 * 外から来た `'constructor'` や `'__proto__'` がプロトタイプ上の値を拾ってしまう
 * （js/store/patch.jsのfieldPatchForに同じ理由の長いコメントがある）。
 */
export const CLICK_ACTION_TYPES = Object.freeze(new Set(['chat', 'scene', 'audio', 'stamp']));

/**
 * 発言の文字列の上限。状態は全員へ配られて保存もされるので、青天井にはしない
 * （カードの説明が MAX_CARD_INFO_LENGTH=300 で切ってあるのと同じ考え方）。
 * チャット入力欄そのものに上限が無いため、ここだけで決まる。
 */
export const MAX_PANEL_CHAT_TEXT_LENGTH = 500;

const asId = (value) => (typeof value === 'string' && value !== '' ? value : null);

/**
 * clickActionを正規化する。形の合わないものはすべてnull（＝クリックしても何も起きない）。
 *
 * 参照先（シーン・音源・スタンプ）が実在するかは**見ない**。取り込みの途中でまだ
 * 読み込まれていないことも、後から消されることもあるため。実在の確認は押した瞬間に、
 * そのときの状態に対して行う（js/board-data-driven.jsのrunPanelClickAction）。
 *
 * @param {unknown} value
 * @returns {Readonly<object>|null}
 */
export function normalizeClickAction(value) {
  // 配列もtypeof 'object'なので明示的に弾く（[]を渡されて type===undefined で落ちるのを防ぐ）
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!CLICK_ACTION_TYPES.has(value.type)) return null;

  switch (value.type) {
    case 'chat': {
      // 前後の空白だけの設定は「何もしない」と同じなので落とす
      const text = typeof value.text === 'string' ? value.text.trim() : '';
      if (text === '') return null;
      return Object.freeze({ type: 'chat', text: text.slice(0, MAX_PANEL_CHAT_TEXT_LENGTH) });
    }

    case 'scene': {
      const sceneId = asId(value.sceneId);
      return sceneId ? Object.freeze({ type: 'scene', sceneId }) : null;
    }

    case 'audio': {
      // trackIdがnull＝そのチャンネルの演奏を止める。曲を指すのと止めるのを1つのtypeで
      // 表すのは、シーンのbgmTrackIdが「変えない/止める/この曲」を1フィールドで持つのと同じ。
      // channelは止めるときにSTOP_AUDIO_PLAYBACKが要求するので、鳴らす指定でも必ず持たせる。
      if (!AUDIO_CHANNELS.includes(value.channel)) return null;
      return Object.freeze({ type: 'audio', channel: value.channel, trackId: asId(value.trackId) });
    }

    case 'stamp': {
      const stampId = asId(value.stampId);
      return stampId ? Object.freeze({ type: 'stamp', stampId }) : null;
    }

    default:
      return null;
  }
}

/**
 * パネルのマップを、clickActionだけ正規化して返す。hydrateから通す。
 * 変わるものが1つも無ければ元の参照をそのまま返す（差分検知に使っているため）。
 */
export function normalizePanelClickActions(panels) {
  if (!panels || typeof panels !== 'object') return {};

  let changed = false;
  const next = {};
  for (const [id, panel] of Object.entries(panels)) {
    if (!panel || typeof panel !== 'object') {
      changed = true;
      continue; // 形になっていないパネルは落とす
    }
    const clickAction = normalizeClickAction(panel.clickAction);
    if (clickAction === panel.clickAction) {
      next[id] = panel;
      continue;
    }
    changed = true;
    next[id] = { ...panel, clickAction };
  }
  return changed ? next : panels;
}
