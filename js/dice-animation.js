// js/dice-animation.js
// 盤面の上で3Dダイスを転がす演出（UIは持たない。js/audio-player.jsと同じ構え）。
// game-store.jsのROLL_DICE_ANIMATIONが流すDICE_ROLLEDを購読し、BCDiceが返した出目そのままの
// 面で止まるようダイスを投げる。判定や合計には一切関わらない、見た目と音だけの機能。
//
// ダイス本体はvendor/dice-box-threejs（@3d-dice/dice-box-threejs のdistをそのまま置いたもの）。
// three.jsを含む700KB近いバンドルなので、最初のロールが来るまで読み込まない。

import { EventBus } from './EventBus.js';
import { randsToNotation } from './dice-notation.js';
import { getChannelVolume, isMuted } from './audio-player.js';

// 演出するのはMainタブのロールだけ（他のチャットタブは関知しない）。
// js/main.jsのMAIN_TAB_IDと同じ値。
const MAIN_TAB_ID = 'main';

const STAGE_ID = 'dice-stage';
const VISIBLE_CLASS = 'is-rolling';

// ダイスが止まってから自動的に消えるまで。結果はチャットログに残るので、
// 眺め続ける必要はない。クリックすればこれを待たずに消せる。
const AUTO_HIDE_MS = 3000;

const LIBRARY_URL = '/vendor/dice-box-threejs/dice-box-threejs.es.js';

// ダイスの見た目と物理の設定。後日の素材差し替え（色・テクスチャ）はここだけを変えればよい。
// theme_textureはvendor/dice-box-threejs/assets/textures/ のファイル名（拡張子なし）に対応する。
const DICE_CONFIG = {
  assetPath: '/vendor/dice-box-threejs/assets/',
  theme_surface: 'green-felt',
  theme_colorset: 'white',
  theme_texture: '',
  theme_material: 'glass',
  sound_dieMaterial: 'plastic',
  gravity_multiplier: 400,
  light_intensity: 0.9,
  strength: 1,
  shadows: true,
  // 音源（mp3）はinitialize()の時だけ読み込まれる。あとから鳴らしたくなった時に読み直す
  // 手段が無いので、ここは常にtrueにしておき、実際に鳴らすかはvolume/soundsで都度切り替える。
  sounds: true
};

// 初期化中／初期化済みのDiceBox。多重初期化を防ぐためPromiseのまま持ち回す。
let boxPromise = null;
let hideTimer = null;

function getStage() {
  return document.getElementById(STAGE_ID);
}

// 効果音の音量は「聴く側の好み」なので、部屋では同期せず、音楽（js/audio-player.js）の
// 効果音チャンネルの設定にそのまま相乗りする。ミュート中は鳴らさない。
// dice-box側のvolumeは0〜100。
function applyVolume(box) {
  const volume = getChannelVolume('se') * 100;
  box.volume = volume;
  box.sounds = !isMuted() && volume > 0;
}

// 盤面の大きさはペインのリサイズ（js/resizable-stack.js）や画面の分割で変わる。
// ライブラリのresizeWorld()はwindowのresizeしか見ていないため、要素の大きさ自体を監視する。
function observeStageResize(box, stage) {
  const observer = new ResizeObserver(() => {
    if (stage.clientWidth === 0 || stage.clientHeight === 0) return;
    // setDimensionsが見るのはxとyだけなので、THREE.Vector2でなくてよい
    box.setDimensions({ x: stage.clientWidth, y: stage.clientHeight });
  });
  observer.observe(stage);
}

async function getBox() {
  if (boxPromise) return boxPromise;

  boxPromise = (async () => {
    const stage = getStage();
    if (!stage) throw new Error(`#${STAGE_ID} が見つかりません`);

    const { default: DiceBox } = await import(LIBRARY_URL);
    const box = new DiceBox(`#${STAGE_ID}`, DICE_CONFIG);
    await box.initialize();
    observeStageResize(box, stage);
    return box;
  })().catch(error => {
    // 失敗を覚えたままにすると二度と演出できなくなるので、次のロールでやり直せるようにする
    boxPromise = null;
    throw error;
  });

  return boxPromise;
}

function hide() {
  clearTimeout(hideTimer);
  hideTimer = null;
  getStage()?.classList.remove(VISIBLE_CLASS);
  // 消えるアニメーション（CSSのtransition）が終わってから盤上のダイスを片付ける
  boxPromise?.then(box => setTimeout(() => box.clearDice(), 300)).catch(() => {});
}

async function roll(dice) {
  const notation = randsToNotation(dice);
  // 3Dモデルの無いダイス（d66の構成要素など）しか含まないロールは、演出せず素通りする
  if (!notation) return;

  const stage = getStage();
  if (!stage || stage.clientWidth === 0 || stage.clientHeight === 0) return;

  // 前のロールが残っていても、新しいロールで差し替える（自動消滅の予約は取り消す）
  clearTimeout(hideTimer);
  hideTimer = null;
  stage.classList.add(VISIBLE_CLASS);

  const box = await getBox();
  applyVolume(box);

  // roll()は内部で前のダイスを片付けてから投げ直す
  await box.roll(notation);

  hideTimer = setTimeout(hide, AUTO_HIDE_MS);
}

export function initDiceAnimation() {
  const stage = getStage();
  // ダイスをクリックしたら即終了する（止まるのを待たずに消せる）
  stage?.addEventListener('click', hide);

  EventBus.subscribe('DICE_ROLLED', ({ tabId, dice }) => {
    if (tabId !== MAIN_TAB_ID) return;

    roll(dice).catch(error => {
      // 演出が出ないだけで、ロール自体（チャットログ）は成立している。
      // アラートで進行を止める価値は無いので記録だけ残す。
      console.warn('[dice] ダイスの演出に失敗しました:', error);
      hide();
    });
  });
}
