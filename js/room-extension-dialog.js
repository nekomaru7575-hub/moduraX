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
import { EventBus } from './EventBus.js';
import { listPluginRoomExtensions, readPluginRoomExtension } from './parameters/registry.js';

const ensureDialog = createDialogHost('room-extension-dialog');

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
  const signature = JSON.stringify([pluginId, extensions, !!state.round?.active]);
  // 関係の無い変化（コマが動いた等）では描き直さない。選びかけのプルダウンが戻ってしまうため
  if (signature === current.signature) return;
  current.signature = signature;

  body.innerHTML = '';
  const definitions = listPluginRoomExtensions(pluginId);
  if (definitions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dialog-plugin-placeholder';
    empty.textContent = 'この部屋のシステムには、拡張ルーム設定がありません。';
    body.appendChild(empty);
    return;
  }

  definitions.forEach(def => {
    const section = document.createElement('section');
    section.className = 'room-extension-section';

    const heading = document.createElement('h4');
    heading.textContent = def.label;
    section.appendChild(heading);

    def.renderSection({
      container: section,
      value: readPluginRoomExtension(extensions, pluginId, def.key),
      dispatchOp: (op, args) => store.dispatch('UPDATE_ROOM_EXTENSION', { key: def.key, op, args }),
      roundActive: !!state.round?.active
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
