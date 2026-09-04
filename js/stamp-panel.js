// js/stamp-panel.js
// 「スタンプ送信」：使えるスタンプを画像で並べ、押すとその場で送る浮動パネル。
// 既定は非表示で、盤外の右クリックメニューから出す（情報パネルと同じ構え）。
//
// 送るのはIDだけで、画像URLはこちらが組み立てる（js/stamp-registry.js）。並べる顔ぶれは
// 部屋に適用中のプラグインで変わるので、システムを切り替えたら組み直す。
//
// 【連打よけの上限との付き合い方】
// サーバーは上限を超えたスタンプを捨てる（server/index.jsのallowStamp）。以前はその間
// ボタンを止めていたが、それだと押した回数を数えられない。上限は「盤面がスタンプで
// 埋まらないための表示側の都合」であって、押した事実まで無かったことにしたいわけでは
// ないので、ボタンは常に押せるようにし、超えたぶんは盤面に出ないだけにしてある。
// 数（下の集計）は上限に関わらず必ず増える。
//
// 【集計】
// プラグインのスタンプ（ステラナイツのブーケ等）は、誰が何枚出したかを部屋の状態に
// 残して全員へ配る（js/game-store.jsのCOUNT_STAMP）。Coreのスタンプは相槌なので数えない。
//
// net-sync.js/round-panel.js/info-panel.jsと同様にinitStampPanel()をexportし、
// main.jsの初期化から1回だけ呼ぶ。

import { store, setStampPanelController } from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { createFloatingPanel } from './floating-panel.js';
import { requestStamp } from './stamp-layer.js';
import { listStamps } from './stamp-registry.js';
import { getCurrentParticipantId } from './local-identity.js';
import { canOperateAsGm, GM_ONLY_REASON } from './room-authority.js';

const NO_NAME_REASON = 'スタンプを送るには、参加者設定で名前を決めてください。';

// 参加者一覧から引けなかった参加者の表示。数を黙って消さないために行は残す
// （読み込んだ部屋データの集計や、退室後に消された参加者のぶん）。
const UNKNOWN_PARTICIPANT_LABEL = '(不明)';

export function initStampPanel() {
  const panel = createFloatingPanel({
    title: 'スタンプ送信',
    storageKey: 'stampPanelRect',
    defaultRect: { x: 24, y: 120, w: 280, h: 380 },
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

  // 集計（プラグインのスタンプが1枚も出ていなければ丸ごと隠す）
  const countsSection = document.createElement('div');
  countsSection.className = 'stamp-count-section';
  countsSection.hidden = true;

  const countsList = document.createElement('div');
  countsList.className = 'stamp-count-list';
  countsSection.appendChild(countsList);

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'stamp-count-reset';
  resetBtn.textContent = '集計をリセット';
  countsSection.appendChild(resetBtn);

  panel.body.appendChild(countsSection);

  let renderedPluginId = null;
  // 直前に描いたときの room.stamps の**参照**。中身の比較は要らない：#commitは
  // スライスを構造共有で凍結し、withMapEntry/withoutMapEntryは必ず新しいオブジェクトを
  // 返すので、参照が変わるのはこのマップが変わったときだけ。
  let renderedRoomStamps = null;
  let buttons = [];

  function applyAvailability() {
    // 名前を名乗っていない人のスタンプはサーバーが捨てる（送り主の名前を出せないため）。
    // 集計も参加者ごとなので数える先が無い。押してから無視されるより、押せないことと
    // 理由を先に見せる。上限による無効化はしない（冒頭参照）。
    const named = !!getCurrentParticipantId();
    buttons.forEach(button => { button.disabled = !named; });

    notice.textContent = named ? '' : NO_NAME_REASON;
    notice.hidden = named;
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

    button.addEventListener('click', () => {
      if (!getCurrentParticipantId()) return;
      requestStamp(stamp.id);
    });
    return button;
  }

  function renderGrid(room) {
    renderedPluginId = room?.activePlugin ?? null;
    renderedRoomStamps = room?.stamps ?? null;
    grid.innerHTML = '';
    // 絵の置き場が無い環境では、プラグインのスタンプは url が null になる
    // （js/asset-base.js）。押しても絵が出せないので、ボタン自体を出さない。
    // 一覧から落とすのはここだけ。IDが実在するかの判定（js/stamp-registry.jsの
    // isKnownStampId）まで落とすと、送っても捨てられる側になってしまう。
    buttons = listStamps(room).filter(stamp => stamp.url).map(stamp => {
      const button = buildButton(stamp);
      grid.appendChild(button);
      return button;
    });
    applyAvailability();
  }

  // 「ブーケ … なこまる ×5」の1行。名前は他人が決めた文字列なのでtextContentで入れる。
  function buildCountRow(nickname, count) {
    const row = document.createElement('div');
    row.className = 'stamp-count-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'stamp-count-name';
    nameEl.textContent = nickname;
    row.appendChild(nameEl);

    const countEl = document.createElement('span');
    countEl.className = 'stamp-count-value';
    countEl.textContent = `×${count}`;
    row.appendChild(countEl);

    return row;
  }

  function renderCounts(state) {
    const stampCounts = state.stampCounts || {};
    const participants = state.participants || {};
    // 並びはパネルのボタンと同じ（スタンプの宣言順）。集計側の都合で順番が入れ替わらない。
    const stamps = listStamps(state.room)
      .filter(stamp => Object.keys(stampCounts[stamp.id] || {}).length > 0);

    countsList.innerHTML = '';
    stamps.forEach(stamp => {
      const heading = document.createElement('div');
      heading.className = 'stamp-count-heading';
      heading.textContent = stamp.label;
      countsList.appendChild(heading);

      Object.entries(stampCounts[stamp.id])
        .sort((a, b) => b[1] - a[1])
        .forEach(([participantId, count]) => {
          const nickname = participants[participantId]?.nickname || UNKNOWN_PARTICIPANT_LABEL;
          countsList.appendChild(buildCountRow(nickname, count));
        });
    });

    countsSection.hidden = stamps.length === 0;

    // リセットは一度押すと戻せないのでGM限定（server/index.jsのGM_ONLY_ACTIONSでも弾く）。
    // 項目ごと消すと「なぜ出ないのか」が分からないので、押せないまま理由をtitleで示す
    // （盤外メニューの権限まわりと同じ見せ方）。
    const gm = canOperateAsGm();
    resetBtn.disabled = !gm;
    resetBtn.title = gm ? '' : GM_ONLY_REASON;
  }

  resetBtn.addEventListener('click', () => {
    if (!canOperateAsGm()) return;
    if (!confirm('スタンプの集計をすべて0に戻します。よろしいですか？')) return;
    store.dispatch('RESET_STAMP_COUNTS', {});
  });

  EventBus.subscribe('STATE_CHANGED', (state) => {
    // 顔ぶれが変わるのは、適用プラグインが変わったときと、部屋のスタンプが増減した
    // ときだけなので、そのときだけ組み直す
    if ((state.room?.activePlugin ?? null) !== renderedPluginId
      || (state.room?.stamps ?? null) !== renderedRoomStamps) {
      renderGrid(state.room);
    }

    renderCounts(state);
  });

  // 名乗ると押せるようになる（その逆も）。GMかどうかも名乗りで変わる
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    applyAvailability();
    renderCounts(store.state);
  });

  renderGrid(store.state.room);
  renderCounts(store.state);

  // 盤外の右クリックメニューから表示/非表示を切り替えられるようにする
  setStampPanelController(panel);

  return panel;
}
