// js/token-library-dialog.js
// 「保存したコマから追加」——部屋の外のコマ作成ツールで作って棚（js/token-library.js）に
// 残したコマを、この部屋のバックヤードへ引き込む。キャラクター一覧のバックヤードタブから開く。
//
// 【入室時に自動で入れない理由】バックヤードのコマも部屋の状態として全員へ配られ、
// 保存先へも書き戻る（js/visibility.js冒頭）。棚に十数体あるのを部屋へ入るたび自動で
// 注ぐと、その卓に関係のないコマまで全員の手元へ流れ続ける。使うものだけを選ばせる。
//
// 【この部屋で使えるものだけ並べる】棚は全部屋で共通だが、コマは作ったときのシステムを
// 抱えている。別のシステムの部屋へ入れても解釈する相手がいないので、候補の段階で外す
// （js/token-library.js の canBringIntoRoom）。外した数は画面に出す——黙って消すと、
// 保存したはずのコマが失われたように見える。

import { store } from './board-data-driven.js';
import { generateTokenId } from './game-store.js';
import { createDialogHost, appendConfirmRow } from './dialog-host.js';
import { adoptImageIntoRoom } from './image-upload.js';
import { getCurrentParticipantId, getLocalUserId } from './local-identity.js';
import { listPlugins } from './parameters/registry.js';
import { canBringIntoRoom, listTokenLibrary } from './token-library.js';

const ensureDialog = createDialogHost();

function pluginLabelOf(pluginId) {
  if (!pluginId) return 'プラグインなし';
  return listPlugins().find(plugin => plugin.id === pluginId)?.label ?? pluginId;
}

/**
 * 棚の1件をこの部屋へ入れる。盤面には出さず、いきなりバックヤードへ置く。
 *
 * 手順は盤面へJSONを落としたときと同じ2段構え（js/board-data-driven.jsのhandleDropJson）に、
 * 棚入れの1手を足したもの。
 *   1. 画像をこの部屋の持ち物にする ← **飛ばさないこと**
 *   2. 器を作る（ADD_CHARACTER）
 *   3. 中身を流し込む（RESTORE_CHARACTER_SNAPSHOT）
 *   4. バックヤードへ（ADD_CHARACTERはinBackyard:falseを直書きするので追い撃ちが要る）
 *
 * 【1が要る理由】棚の画像はデータURL（部屋の外にはアップロード先が無いため。
 * js/image-upload.js）。そのまま部屋の状態へ入れると、以後すべてのアクションで
 * 状態ごと保存先へ書き直され、帯域と保存量を食い潰す。
 *
 * 【名乗っていない人でも通る】getCurrentParticipantId()がnullならownerIdはnullになり、
 * MOVE_TO_BACKYARDはbackyardOwnerId（ブラウザ単位のID）の枝へ落ちる。
 * listMyBackyardTokens（js/character-panel.js）の第2の枝がそれを拾うので、
 * 名乗る前でも自分の棚として見える。
 */
async function bringIntoRoom(entry) {
  const image = await adoptImageIntoRoom(entry.snapshot.image, 'token');
  const id = generateTokenId();
  const participantId = getCurrentParticipantId();

  store.dispatch('ADD_CHARACTER', { id, name: entry.name, ownerId: participantId });
  store.dispatch('RESTORE_CHARACTER_SNAPSHOT', {
    id,
    // 位置(x/y)はスナップショットに入っていない（js/character-snapshot.js）。
    // ADD_CHARACTERの既定のまま置いておき、盤面に戻したときに初めて意味を持つ。
    snapshot: { ...entry.snapshot, image }
  });
  store.dispatch('MOVE_TO_BACKYARD', { id, participantId, localUserId: getLocalUserId() });
}

/**
 * 棚から選んでこの部屋へ引き込むダイアログ。
 * @param {{ onDone?: (count: number) => void }} [options]
 */
export async function showTokenLibraryPickerDialog({ onDone } = {}) {
  const shelf = await listTokenLibrary();
  // 棚は全部屋で共通なので、この部屋で意味を持たないコマまで並ぶ。選ばせてから
  // 「入れても使えない」と気づかせるより、候補の段階で外す（canBringIntoRoom）。
  const roomPluginId = store.state.room?.activePlugin ?? null;
  const entries = shelf.filter(entry => canBringIntoRoom(entry, roomPluginId));
  const hiddenCount = shelf.length - entries.length;

  const dialog = ensureDialog();
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = '保存したコマから追加';
  form.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'audio-note';
  note.textContent = 'コマ作成ツールで作って、このブラウザに保存したコマです。'
    + '選んだぶんが自分のバックヤードに入ります（盤面には出ません）。';
  form.appendChild(note);

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dialog-empty-note';
    // 棚に何体かあるのに1体も出せないときは、そう言う。「まだありません」で済ませると、
    // 保存したはずのコマが消えたように見えて、不具合として報告が返ってくる。
    empty.textContent = shelf.length === 0
      ? 'このブラウザにはまだ保存したコマがありません。'
        + '部屋の外の「コマ作成ツール」で作ると、ここに並びます。'
      : `保存したコマは${shelf.length}体ありますが、どれもこの部屋（${pluginLabelOf(roomPluginId)}）とは`
        + '違うシステムのものです。同じシステムのコマを作ると、ここに並びます。';
    form.appendChild(empty);

    // 選ぶものが無いので確定は要らない（appendConfirmRowは使わない）
    const btnRow = document.createElement('div');
    btnRow.className = 'dialog-button-row';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '閉じる';
    closeBtn.addEventListener('click', () => dialog.close());
    btnRow.appendChild(closeBtn);
    form.appendChild(btnRow);

    dialog.appendChild(form);
    dialog.showModal();
    return;
  }

  // 何体か隠したなら黙って隠さない。棚に入れたはずのコマが見当たらない理由が
  // 画面に無いと、探し回った末に不具合として報告されることになる。
  if (hiddenCount > 0) {
    const filtered = document.createElement('p');
    filtered.className = 'audio-note';
    filtered.textContent = `この部屋（${pluginLabelOf(roomPluginId)}）で使えるコマだけを並べています。`
      + `別のシステムで作った${hiddenCount}体は出していません。`;
    form.appendChild(filtered);
  }

  const listEl = document.createElement('div');
  listEl.className = 'dialog-custom-list';
  form.appendChild(listEl);

  const checkboxes = [];
  entries.forEach(entry => {
    const row = document.createElement('label');
    row.className = 'dialog-custom-row token-library-row';

    const check = document.createElement('input');
    check.type = 'checkbox';
    row.appendChild(check);
    checkboxes.push({ check, entry });

    if (entry.snapshot.image) {
      const thumb = document.createElement('img');
      thumb.className = 'token-library-thumb';
      thumb.alt = '';
      thumb.src = entry.snapshot.image;
      // 画像が読めなくても行は残す（名前とチェックが消えると選べなくなる）
      thumb.addEventListener('error', () => thumb.remove());
      row.appendChild(thumb);
    }

    const label = document.createElement('span');
    label.className = 'token-library-label';
    // 名前は利用者が決めた文字列なので、必ずtextContentで入れる
    label.textContent = `${entry.name}（${pluginLabelOf(entry.pluginId)}）`;
    row.appendChild(label);

    listEl.appendChild(row);
  });

  // 引き込んだコマは部屋の状態として全員へ配られる。バックヤードは表示の絞り込みで
  // あって秘匿の境界ではない（js/visibility.js）。入室時の自動投入をやめた理由でも
  // あるので、画面にも書いておく。
  const caution = document.createElement('p');
  caution.className = 'audio-note';
  caution.textContent = '入れたコマは部屋のデータとして保存され、他の参加者にも配られます'
    + '（バックヤードは一覧に出さないだけで、隠す仕組みではありません）。'
    + '棚の元のコマはそのまま残ります。';
  form.appendChild(caution);

  const { confirmBtn } = appendConfirmRow(form, {
    confirmLabel: '追加',
    onCancel: () => dialog.close()
  });

  function syncConfirm() {
    const count = checkboxes.filter(item => item.check.checked).length;
    confirmBtn.disabled = count === 0;
    confirmBtn.textContent = count > 0 ? `追加（${count}体）` : '追加';
  }
  checkboxes.forEach(item => item.check.addEventListener('change', syncConfirm));
  syncConfirm();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const picked = checkboxes.filter(item => item.check.checked).map(item => item.entry);
    if (picked.length === 0) return;

    // 画像の引き取りは1件ずつ通信する。押しっぱなしで二重に入るのを防ぐため、
    // ボタンを止めてから回す。
    confirmBtn.disabled = true;
    confirmBtn.textContent = '追加しています…';

    for (const entry of picked) {
      await bringIntoRoom(entry);
    }

    dialog.close();
    onDone?.(picked.length);
  });

  dialog.appendChild(form);
  dialog.showModal();
}
