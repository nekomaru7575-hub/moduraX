// js/stamp-panel.js
// 「スタンプ送信」：使えるスタンプを画像で並べ、押すとその場で送る浮動パネル。
// 既定は非表示で、盤外の右クリックメニューから出す（情報パネルと同じ構え）。
//
// 送るのはIDだけで、画像URLはこちらが組み立てる（js/stamp-registry.js）。並べる顔ぶれは
// 部屋に適用中のプラグインで変わるので、システムを切り替えたら組み直す。
//
// 【押せない時間を出すこと】
// サーバーは連打よけの上限を超えたスタンプを黙って捨てる（server/index.jsのallowStamp）。
// チャットコマンドなら打ち間違いを疑えるが、画像を押すだけのパネルで無反応だと
// 「壊れている」としか見えない。そこで同じ上限（STAMP_RATE_LIMIT）を画面側でも数えて、
// 押せない間はボタンを止めて残り秒数を出す。判定の権威はあくまでサーバー側で、
// ここは案内のための写し。
//
// net-sync.js/round-panel.js/info-panel.jsと同様にinitStampPanel()をexportし、
// main.jsの初期化から1回だけ呼ぶ。

import { store, setStampPanelController } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { createFloatingPanel } from './floating-panel.js';
import { requestStamp } from './stamp-layer.js';
import { listStamps } from './stamp-registry.js';
import { STAMP_RATE_LIMIT } from './stamp-catalog.js';
import { getCurrentParticipantId } from './local-identity.js';

const NO_NAME_REASON = 'スタンプを送るには、参加者設定で名前を決めてください。';

// 残り秒数の表示を更新する間隔。1秒ぴったりだと表示が飛ぶことがあるので少し細かく見る。
const COOLDOWN_TICK_MS = 200;

export function initStampPanel() {
  const panel = createFloatingPanel({
    title: 'スタンプ送信',
    storageKey: 'stampPanelRect',
    defaultRect: { x: 24, y: 120, w: 280, h: 300 },
    // 盤面を隠してしまうので、出すかどうかは各自に決めてもらう（情報パネルと同じ）
    defaultVisible: false
  });

  const notice = document.createElement('div');
  notice.className = 'stamp-send-notice';
  notice.hidden = true;
  panel.body.appendChild(notice);

  const grid = document.createElement('div');
  grid.className = 'stamp-send-grid';
  panel.body.appendChild(grid);

  // 自分が送った時刻。サーバーと同じ窓で数えるための控え。
  let sentTimes = [];
  let cooldownTimer = null;
  let renderedPluginId = null;
  let buttons = [];

  // 今この瞬間から何ミリ秒待てば1枚送れるか。0なら送れる。
  function cooldownRemainingMs() {
    const now = Date.now();
    sentTimes = sentTimes.filter(time => now - time < STAMP_RATE_LIMIT.windowMs);
    if (sentTimes.length < STAMP_RATE_LIMIT.max) return 0;

    // 一番古い1枚が窓から出れば1枚空く
    return STAMP_RATE_LIMIT.windowMs - (now - sentTimes[0]);
  }

  function applyAvailability() {
    const remainingMs = cooldownRemainingMs();
    // 名前を名乗っていない人のスタンプはサーバーが捨てる（送り主の名前を出せないため）。
    // 押してから無視されるより、押せないことと理由を先に見せる。
    const named = !!getCurrentParticipantId();

    const disabled = !named || remainingMs > 0;
    buttons.forEach(button => { button.disabled = disabled; });

    if (!named) {
      notice.textContent = NO_NAME_REASON;
      notice.hidden = false;
    } else if (remainingMs > 0) {
      notice.textContent = `続けて送れる上限です（あと${Math.ceil(remainingMs / 1000)}秒）`;
      notice.hidden = false;
    } else {
      notice.textContent = '';
      notice.hidden = true;
    }

    // 上限に達している間だけ、残り秒数を刻んで自動で戻す
    if (remainingMs > 0 && cooldownTimer === null) {
      cooldownTimer = setInterval(() => {
        if (cooldownRemainingMs() === 0) {
          clearInterval(cooldownTimer);
          cooldownTimer = null;
        }
        applyAvailability();
      }, COOLDOWN_TICK_MS);
    }
  }

  function send(stampId) {
    if (cooldownRemainingMs() > 0 || !getCurrentParticipantId()) return;

    sentTimes.push(Date.now());
    requestStamp(stampId);
    applyAvailability();
  }

  // ボタン1つ。画像とその下に名前（チャットコマンド「スタンプ(名前)」でも撃てるため、
  // 名前は隠さず出す）。名前は表の値だが、必ずtextContentで入れる。
  function buildButton(stamp) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stamp-send-btn';
    button.title = stamp.label;

    const image = document.createElement('img');
    image.className = 'stamp-send-image';
    image.alt = '';
    image.src = stamp.url;
    // 画像がまだ置かれていない場合でも押せるようにする（js/stamp-layer.jsと同じ逃げ道）
    image.addEventListener('error', () => {
      image.remove();
      const fallback = document.createElement('div');
      fallback.className = 'stamp-send-fallback';
      fallback.textContent = stamp.label;
      button.prepend(fallback);
    });
    button.appendChild(image);

    const labelEl = document.createElement('div');
    labelEl.className = 'stamp-send-label';
    labelEl.textContent = stamp.label;
    button.appendChild(labelEl);

    button.addEventListener('click', () => send(stamp.id));
    return button;
  }

  function renderGrid(pluginId) {
    renderedPluginId = pluginId;
    grid.innerHTML = '';
    buttons = listStamps(pluginId).map(stamp => {
      const button = buildButton(stamp);
      grid.appendChild(button);
      return button;
    });
    applyAvailability();
  }

  // 顔ぶれが変わるのは適用プラグインが変わったときだけなので、そのときだけ組み直す
  EventBus.subscribe('STATE_CHANGED', (state) => {
    const pluginId = state.room?.activePlugin ?? null;
    if (pluginId !== renderedPluginId) renderGrid(pluginId);
  });

  // 名乗ると押せるようになる（その逆も）
  EventBus.subscribe('IDENTITY_CHANGED', () => applyAvailability());

  renderGrid(store.state.room?.activePlugin ?? null);

  // 盤外の右クリックメニューから表示/非表示を切り替えられるようにする
  setStampPanelController(panel);

  return panel;
}
