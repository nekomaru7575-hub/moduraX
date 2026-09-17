// js/room-extension-dialog.js
// 「拡張ルーム設定」ダイアログ（「⋯」ルームメニューから開く）。
//
// 部屋全体に掛かる、その部屋のシステム固有の設定・効果を並べる（銀剣のステラナイツの
// 「始まりの部屋」）。何を出すかはプラグインの roomExtensions が宣言し、中身の描画もその
// renderSection に任せる。ここは見出しを付けて並べることと、開いている間に部屋の状態が
// 変わったら描き直すことだけをする（誰でも発動・解除できるので、他の人の操作を映すため）。
//
// 操作は確定ボタンで溜めて送らず、その場で1件ずつ dispatch する（UPDATE_ROOM_EXTENSION）。
// 効果は発動した瞬間から卓に効くものなので、「キャンセル」で取り消せる形にしない。

import { createDialogHost } from './dialog-host.js';
import { canOperateAsGm } from './room-authority.js';
import { EventBus } from './EventBus.js';
import { listPluginRoomExtensions, readPluginRoomExtension } from './parameters/registry.js';

const ensureDialog = createDialogHost('room-extension-dialog');

// どの節を開いていたか（`${pluginId}:${key}` → true）。**既定は閉じた状態**で、
// 目的の節だけ開いて使う（節が増えると開いた瞬間に縦へ長く伸びるため）。
// このブラウザの画面だけの状態で、部屋には載せない
// （js/parameters/stella-knights-starting-room-section.js の lastChoice と同じ流儀）。
const openedSections = new Set();

// 開いている間だけ中身を持つ。閉じたらnull（STATE_CHANGEDの購読は1回だけ張って使い回す。
// EventBusに購読の解除が無いため）
let current = null;
let subscribed = false;

function render() {
  if (!current) return;
  const { dialog, body, store } = current;
  const state = store.state;
  const pluginId = state.room?.activePlugin ?? null;
  const extensions = state.room?.extensions ?? {};
  // GMになった／外れたときも描き直す（gmOnlyの節の出し入れが要るため）
  const isGm = canOperateAsGm();
  const signature = JSON.stringify([pluginId, extensions, !!state.round?.active, isGm]);
  // 関係の無い変化（コマが動いた等）では描き直さない。選びかけのプルダウンが戻ってしまうため
  if (signature === current.signature) return;
  current.signature = signature;

  body.innerHTML = '';
  // gmOnlyの節はGM以外には出さない。【本当の制御ではない】UPDATE_ROOM_EXTENSIONはGM限定
  // アクションではなく、状態も全員へ配られる（js/parameters/registry.jsの「宣言の形」の節）。
  // シナリオ側の仕掛け（ステラナイツの舞台）がPLの画面にうっかり出ないようにするためのもの。
  const definitions = listPluginRoomExtensions(pluginId).filter(def => isGm || !def.gmOnly);
  if (definitions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dialog-plugin-placeholder';
    empty.textContent = listPluginRoomExtensions(pluginId).length > 0
      ? 'この部屋の拡張ルーム設定は、GMだけが扱えます。'
      : 'この部屋のシステムには、拡張ルーム設定がありません。';
    body.appendChild(empty);
    return;
  }

  definitions.forEach(def => {
    const section = document.createElement('details');
    section.className = 'room-extension-section';

    // 中身を組み直すたびに details も作り直されるので、覚えた開閉を当て直す
    const openKey = `${pluginId}:${def.key}`;
    section.open = openedSections.has(openKey);
    section.addEventListener('toggle', () => {
      if (section.open) openedSections.add(openKey);
      else openedSections.delete(openKey);
    });

    const heading = document.createElement('summary');
    heading.textContent = def.label;
    section.appendChild(heading);

    def.renderSection({
      container: section,
      value: readPluginRoomExtension(extensions, pluginId, def.key),
      dispatchOp: (op, args) => store.dispatch('UPDATE_ROOM_EXTENSION', { key: def.key, op, args }),
      roundActive: !!state.round?.active,
      isGm
    });
    body.appendChild(section);
  });

  if (!dialog.open) dialog.showModal();
}

/**
 * @param {{ store: { state: object, dispatch: (action: string, payload: object) => void } }} options
 */
export function showRoomExtensionDialog({ store }) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  const heading = document.createElement('h3');
  heading.textContent = '拡張ルーム設定';
  dialog.appendChild(heading);

  const body = document.createElement('div');
  dialog.appendChild(body);

  const btnRow = document.createElement('div');
  btnRow.className = 'dialog-button-row';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '閉じる';
  closeBtn.className = 'dialog-confirm-btn';
  closeBtn.addEventListener('click', () => dialog.close());
  btnRow.appendChild(closeBtn);
  dialog.appendChild(btnRow);

  current = { dialog, body, store, signature: null };
  dialog.addEventListener('close', () => { current = null; }, { once: true });

  if (!subscribed) {
    subscribed = true;
    EventBus.subscribe('STATE_CHANGED', () => render());
  }
  render();
  if (!dialog.open) dialog.showModal();
}
