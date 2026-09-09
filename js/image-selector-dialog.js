// js/image-selector-dialog.js
// 画像を選ぶ画面。アップローダ（ファイルを選んで溜める）とセレクタ（溜めたもの・
// 既に使っているものから選ぶ）を1枚に収め、置き場へ送るのはここだけが行う。
//
// 【なぜアップロードと選択を分けるか】これまでは「ファイルを選んだ瞬間にR2へ上がる」
// だったので、見比べるために4枚選ぶと4枚とも上がって残った（画像は即時削除されない。
// js/image-pool.js冒頭）。溜める側と選ぶ側を分ければ、置き場へ行くのは選ばれた1枚だけになる。
//
// 【置き場へ送るのは「決定」を押した時点】呼び出し元（パネル・背景のダイアログ）へ返すのは
// 常に確定した文字列URLで、プールの参照は外へ出さない。理由が3つある。
//   ・状態の側に検証が無い項目がある（コマ・パネルのimage）。プールの参照が漏れると
//     「持っている本人だけ絵が見える」状態が全員へ配られる。外へ出さなければ漏れない
//   ・blob:のURLの後始末（revoke）をこの画面の中に閉じ込められる。<dialog>のcloseイベントは
//     この環境で発火しないので、後始末は自前で書くしかない。書く場所が5つに散るのを避ける
//   ・背景の適用は1回のdispatchにまとめる約束がある（js/background-dialog.js）。
//     呼び出し元の「適用」に非同期を挟まない
// 引き換えに「決めたあとダイアログをキャンセル」で1枚だけ孤児が出るが、選んだ枚数ぶん
// 全部残る現状より必ず少ない。完全に消すには参照カウントが要り、それは意図的に無い
// （server/index.jsのdeleteRoomData付近）。
//
// 【断り方をここへ集める】これまでは画面内の警告・alert・無言のデータURL退避と3通りに
// 散っていた。押した人に伝わらない断りは「壊れた」と受け取られるので、理由は必ず
// この画面の帯（.dialog-empty-note）に出す。alertは使わない（モーダルの上に重なる）。

import { createDialogHost, appendConfirmRow } from './dialog-host.js';
import { loadImageDimensions } from './image-dimensions.js';
import {
  addToPool, isImagePoolAvailable, listPool, maxPoolEntryBytes, readCommitMemory,
  removeFromPool, rememberCommit
} from './image-pool.js';
import { commitImageBlob, isImageUploadAvailable } from './image-upload.js';
import { pickFiles } from './file-uploader.js';
import { canOperateAsGm, GM_ONLY_REASON } from './room-authority.js';
import { canReuseCommitFor, imageUsableFor, pickReusableCommit } from './store/images.js';

const ensureDialog = createDialogHost('image-selector-dialog');

// アップロードにGMが要る用途。server/index.jsのIMAGE_PURPOSESと同じ。ここでの無効化は
// 案内であって制限ではない——本当の制御はサーバー側が行う（片方だけにすると
// 「登録はできないがアップロードはできる」口が残る）。
const GM_ONLY_PURPOSES = new Set(['background', 'stamp']);

// 前回貼ったEscハンドラ。ダイアログ要素は使い回しのシングルトンなので、
// 貼り直す前に必ず外す（js/original-table-dialog.jsと同じ作法）。
let escHandler = null;

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/**
 * 画像を選ばせて、置き場へ送ったうえで確定した指し先を返す。
 *
 * @param {{
 *   purpose: 'background'|'token'|'panel'|'card'|'stamp',
 *   usedImages?: Set<string>,
 *     この部屋の状態に今写っている画像（js/store/images.jsのcollectImageUrls）。
 *     一覧に並べるだけでなく、上げ直しを省く判断の材料でもある（pickReusableCommit）
 *   title?: string
 * }} options
 * @returns {Promise<{url: string, key: string|null, width: number, height: number}|null>}
 *   キャンセル・Escならnull
 */
export async function showImageSelectorDialog({
  purpose, usedImages = new Set(), title = '画像を選ぶ'
}) {
  // 上限の問い合わせをここで一度通す。プールの1件上限がこの応答から決まるので、
  // 先に取っておかないと8MBの控えで判断してしまう（js/image-pool.jsのmaxPoolEntryBytes）。
  const uploadAvailable = await isImageUploadAvailable();
  const poolReady = await isImagePoolAvailable();
  const gm = !GM_ONLY_PURPOSES.has(purpose) || canOperateAsGm();

  const dialog = ensureDialog();
  // 選び直しで開き直す使い方をするので、開いたままのshowModalで例外にならないようにする
  if (dialog.open) dialog.close();
  dialog.innerHTML = '';

  return new Promise((resolve) => {
    // 閉じ方（決定／キャンセル／Esc）に関わらず、後始末と解決は一度だけ
    let settled = false;
    // この画面が作ったblob:のURL。**ここだけが持ち、閉じるときに全部返す。**
    // 漏らしても画面には何も出ないので、作る場所を1か所に閉じてある。
    const objectUrls = [];
    let selected = null; // {kind:'pool', entry} | {kind:'url', url} | null

    function trackObjectUrl(blob) {
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      return url;
    }

    function finish(result) {
      if (settled) return;
      settled = true;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.length = 0;
      dialog.close();
      resolve(result);
    }

    // Escで閉じたときも後始末を通す。<dialog>のcloseイベントはこの環境で発火しない
    // （js/scene-dialog.js・js/room-stamp-dialog.jsに同じ注意書きがある）ため、
    // keydownで自前に処理する。revokeを取り逃がすと、閉じたあともblobが残り続ける。
    if (escHandler) dialog.removeEventListener('keydown', escHandler);
    escHandler = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finish(null);
    };
    dialog.addEventListener('keydown', escHandler);

    const form = document.createElement('form');

    const heading = document.createElement('h3');
    heading.textContent = title;
    form.appendChild(heading);

    // 断りと案内を出す唯一の場所
    const note = document.createElement('div');
    note.className = 'dialog-empty-note';
    form.appendChild(note);

    function say(message) {
      note.textContent = message || '';
      note.hidden = !message;
    }
    say('');

    const confirmRow = appendConfirmRow(form, {
      confirmLabel: 'この画像にする',
      onCancel: () => finish(null)
    });

    function refreshConfirm() {
      confirmRow.confirmBtn.disabled = !selected;
    }

    // --- 溜めてある画像 ---
    const poolSection = document.createElement('div');
    poolSection.className = 'dialog-form-group';
    const poolLabel = document.createElement('label');
    poolLabel.textContent = '溜めてある画像';
    poolSection.appendChild(poolLabel);
    const poolGrid = document.createElement('div');
    poolGrid.className = 'image-selector-grid';
    poolSection.appendChild(poolGrid);
    form.insertBefore(poolSection, confirmRow.row);

    // --- この部屋で使っている画像 ---
    const usedSection = document.createElement('div');
    usedSection.className = 'dialog-form-group';
    const usedLabel = document.createElement('label');
    usedLabel.textContent = 'この部屋で使っている画像';
    usedSection.appendChild(usedLabel);
    const usedGrid = document.createElement('div');
    usedGrid.className = 'image-selector-grid';
    usedSection.appendChild(usedGrid);
    form.insertBefore(usedSection, confirmRow.row);

    // 選択の見た目は1か所で切り替える（選ばれている札が2つ見えると何が起きるか分からない）
    function markSelection() {
      [...poolGrid.children, ...usedGrid.children].forEach((cell) => {
        if (!cell.classList.contains('image-selector-cell')) return;
        const isSelected = !!selected
          && ((selected.kind === 'pool' && cell.dataset.hash === selected.entry.hash)
            || (selected.kind === 'url' && cell.dataset.url === selected.url));
        cell.classList.toggle('selected', isSelected);
        cell.querySelector('.image-selector-tile')
          ?.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
      refreshConfirm();
    }

    function buildTile({ src, caption, detail, disabledReason, onPick, onRemove }) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'image-selector-tile';
      tile.setAttribute('aria-pressed', 'false');

      const img = document.createElement('img');
      img.alt = '';
      img.src = src;
      // 読めなくても札は残す（消えると、選べない画像を片付ける導線も消える）。
      // js/room-stamp-list-dialog.jsと同じ逃げ道。
      img.addEventListener('error', () => { img.remove(); tile.classList.add('broken'); });
      tile.appendChild(img);

      const nameEl = document.createElement('span');
      nameEl.className = 'image-selector-name';
      // 名前は利用者が付けたファイル名なので必ずtextContentで入れる
      nameEl.textContent = caption;
      tile.appendChild(nameEl);

      if (detail) {
        const detailEl = document.createElement('span');
        detailEl.className = 'image-selector-detail';
        detailEl.textContent = detail;
        tile.appendChild(detailEl);
      }

      if (disabledReason) {
        // 隠さずに理由を見せる。隠すと「さっき上げたのに一覧に無い」になる
        // （js/token-library-dialog.jsが同じ理由で隠した数を画面に出している）
        tile.disabled = true;
        tile.title = disabledReason;
        tile.classList.add('unusable');
        const why = document.createElement('span');
        why.className = 'image-selector-detail';
        why.textContent = disabledReason;
        tile.appendChild(why);
      } else {
        tile.addEventListener('click', onPick);
      }

      // 消すボタンは札（button）の中に入れられないので、常に枠で包んで隣に置く。
      // 枠がある行と無い行が混ざると、選択の印を付ける先がずれる。
      const cell = document.createElement('div');
      cell.className = 'image-selector-cell';
      cell.appendChild(tile);

      if (onRemove) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'dialog-remove-row image-selector-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'この画像を溜め置きから消す';
        removeBtn.addEventListener('click', onRemove);
        cell.appendChild(removeBtn);
      }
      return { cell, tile };
    }

    async function renderPool() {
      poolGrid.innerHTML = '';

      if (!poolReady) {
        const empty = document.createElement('div');
        empty.className = 'dialog-empty-note';
        // プールが使えないことで画像が1枚も使えなくなるのは退行。溜められないだけで、
        // 下の「画像をアップロードする」からはそのまま使える
        empty.textContent = 'このブラウザでは画像を溜めておけません'
          + '（プライベートウィンドウなど）。選んだ画像はそのまま使えます。';
        poolGrid.appendChild(empty);
        return;
      }

      const entries = await listPool();
      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dialog-empty-note';
        empty.textContent = 'まだ溜めてある画像はありません。'
          + 'アップロードした画像は、実際に使うまでこのブラウザに置いておきます。';
        poolGrid.appendChild(empty);
        return;
      }

      entries.forEach((entry) => {
        const size = entry.width && entry.height
          ? `${entry.width}×${entry.height} / ${formatBytes(entry.size)}`
          : formatBytes(entry.size);
        const { cell, tile } = buildTile({
          src: trackObjectUrl(entry.blob),
          caption: entry.name,
          detail: size,
          onPick: () => {
            selected = { kind: 'pool', entry };
            say('');
            markSelection();
          },
          onRemove: async () => {
            if (!confirm(`「${entry.name}」を溜め置きから消しますか？`)) return;
            await removeFromPool(entry.hash);
            if (selected?.kind === 'pool' && selected.entry.hash === entry.hash) selected = null;
            await renderPool();
            markSelection();
          }
        });
        cell.dataset.hash = entry.hash;
        poolGrid.appendChild(cell);
      });
    }

    function renderUsed() {
      usedGrid.innerHTML = '';
      const urls = [...usedImages];

      if (urls.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dialog-empty-note';
        empty.textContent = 'この部屋にはまだ画像がありません。';
        usedGrid.appendChild(empty);
        return;
      }

      urls.forEach((url) => {
        // 用途によって使えない形がある（スタンプはhttpsか/asset/のみ、カードは長さ上限）。
        // 判定は状態側の正規化と同じものを借りる（js/store/images.js）
        const usable = imageUsableFor(url, purpose);
        const { cell, tile } = buildTile({
          src: url,
          caption: url.startsWith('data:') ? 'この部屋に埋め込まれた画像' : url.split('/').pop(),
          detail: '',
          disabledReason: usable.ok ? '' : usable.reason,
          onPick: () => {
            selected = { kind: 'url', url };
            say('');
            markSelection();
          }
        });
        cell.dataset.url = url;
        usedGrid.appendChild(cell);
      });
    }

    // --- アップロード（溜めるだけ。ここではサーバーへ行かない） ---
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'dialog-add-row-btn';
    uploadBtn.textContent = '+ 画像をアップロードする';
    uploadBtn.disabled = !gm;
    uploadBtn.title = gm ? '' : GM_ONLY_REASON;
    uploadBtn.addEventListener('click', async () => {
      // 複数受け取る。1枚ずつだと「何枚か放り込んで見比べる」ができず、
      // 溜め置きの意味が出ない
      const files = await pickFiles({ accept: 'image/*' });
      if (!files || files.length === 0) return;

      const refusals = [];
      let lastEntry = null;
      for (const file of files) {
        // 寸法はここで1回だけ測る。パネルと背景がサイズの自動反映に使うので、
        // 控えておけば使うときに画像を取り直さずに済む
        let dim = null;
        const previewUrl = URL.createObjectURL(file);
        try {
          dim = await loadImageDimensions(previewUrl);
        } finally {
          // 測るためだけのURLなので、その場で返す（一覧の札とは別物）
          URL.revokeObjectURL(previewUrl);
        }

        const result = poolReady
          ? await addToPool(file, { name: file.name, width: dim?.width, height: dim?.height })
          : { ok: false, reason: 'skip-pool' };

        if (result.ok) {
          lastEntry = result.entry;
        } else if (poolReady) {
          refusals.push(`${file.name}：${result.reason}`);
        } else {
          // プールが使えない環境。溜めずにそのまま選んだ扱いにする（1枚だけ）
          const limit = maxPoolEntryBytes();
          if (file.size > limit) {
            refusals.push(`${file.name}：1枚あたり${Math.floor(limit / (1024 * 1024))}MBまでです`);
          } else {
            selected = {
              kind: 'blob', blob: file, name: file.name,
              width: dim?.width || 0, height: dim?.height || 0
            };
          }
        }
      }

      await renderPool();
      if (lastEntry) selected = { kind: 'pool', entry: lastEntry };
      markSelection();
      say(refusals.length > 0 ? refusals.join(' / ') : '');
    });
    form.insertBefore(uploadBtn, poolSection);

    if (!uploadAvailable) {
      // R2が無い環境（server/dev-local.js）。使えないのではなく、この部屋に画像として
      // 残らずデータURLとして状態に載る、という違いを先に伝える
      say('この部屋では画像の置き場が設定されていないため、選んだ画像は部屋データに'
        + '埋め込まれます（重くなります）。');
    } else if (!gm) {
      say(GM_ONLY_REASON);
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!selected || settled) return;

      confirmRow.confirmBtn.disabled = true;
      say('画像を保存しています…');

      try {
        // 既に置き場にあるものは、そのまま指すだけ（上げ直さない）
        if (selected.kind === 'url') {
          const dim = await loadImageDimensions(selected.url);
          finish({
            url: selected.url, key: null,
            width: dim?.width || 0, height: dim?.height || 0
          });
          return;
        }

        if (selected.kind === 'blob') {
          const { url, key } = await commitImageBlob(selected.blob, purpose);
          finish({ url, key, width: selected.width, height: selected.height });
          return;
        }

        const { entry } = selected;

        // 同じ中身をこの部屋へ上げてあれば、上げ直さない。スタンプでは使い回さない
        // （消すとR2の実体まで消えるので、共有していると他の絵が404になる）
        const reusable = canReuseCommitFor(purpose)
          ? readCommitMemory()
          : null;
        const reuse = reusable
          ? pickReusableCommit(reusable, usedImages, entry.hash)
          : null;
        if (reuse) {
          finish({ ...reuse, width: entry.width, height: entry.height });
          return;
        }

        const { url, key } = await commitImageBlob(entry.blob, purpose);
        if (canReuseCommitFor(purpose)) rememberCommit(entry.hash, { url, key });
        // 上げ終わったものはプールから出す。ここに残るのは常に
        // 「まだどこにも保存されていない実体」という約束を保つため
        await removeFromPool(entry.hash);
        finish({ url, key, width: entry.width, height: entry.height });
      } catch (error) {
        // 上げられなかった。プールからは消さない（消すと選び直しになる）
        console.warn('[image-selector] 画像を保存できませんでした:', error?.message);
        say(`画像を保存できませんでした：${error?.message || '原因不明'}`);
        confirmRow.confirmBtn.disabled = false;
      }
    });

    dialog.appendChild(form);
    dialog.showModal();

    // 一覧は開いたあとに作る（プールの読み出しがIndexedDB待ちなので、
    // 先に画面を出しておかないと押した反応が無いように見える）
    renderUsed();
    renderPool().then(markSelection);
    refreshConfirm();
    uploadBtn.focus();
  });
}
