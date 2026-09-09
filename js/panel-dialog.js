// js/panel-dialog.js
// パネル（マップタイル状オブジェクト）の追加・編集ダイアログ。
// 画像・サイズ（幅・高さ、マス単位）・パネル同士の重なり順を指定する。画像がまだ無いパネルで画像を選ぶと、
// その実サイズをマス換算した近似値をサイズ欄に自動反映する（あとから手で変更可）。
// すでに画像があるパネルの編集では、画像を差し替えてもサイズは変えない。
// 固定・テキストの公開先はここではなくパネルの右クリックメニューから設定する。

// 画像はセレクタ（js/image-selector-dialog.js）で選ぶ。選んだ時点で置き場へ送られて
// いるので、ここへ返ってくるのは常に確定した文字列URL——溜め置きの参照は入ってこない。

import { showImageSelectorDialog } from './image-selector-dialog.js';
import { loadImageDimensions } from './image-dimensions.js';
import { createDialogHost, appendConfirmRow } from './dialog-host.js';

const ensureDialog = createDialogHost();

/**
 * @param {{
 *   title?: string,
 *   initialImage?: string | null,
 *   initialText?: string,
 *   initialCols?: number,
 *   initialRows?: number,
 *   initialStackOrder?: number,
 *   initialKeepOnSceneChange?: boolean,
 *   initialIsStocker?: boolean,
 *   initialStockerOwned?: boolean,
 *   stockerOwnerLabel?: string,
 *   initialClickAction?: object | null,
 *   usedImages?: Set<string>, この部屋で使っている画像（セレクタの再利用一覧に並べる）
 *   clickActionChoices?: {
 *     scenes: {id: string, name: string}[],
 *     audioTracks: {id: string, name: string, channel: string, channelLabel: string}[],
 *     stamps: {id: string, label: string}[]
 *   },
 *   maxChatTextLength?: number,
 *   gridSize: number,
 *   onConfirm: (result: {
 *     image: string | null, text: string, cols: number, rows: number,
 *     stackOrder: number, keepOnSceneChange: boolean,
 *     isStocker: boolean, stockerOwned: boolean, clickAction: object | null
 *   }) => void
 * }} options
 */
export function showPanelDialog({
  title = 'パネルを追加', initialImage = null, initialText = '', initialCols = 2, initialRows = 2,
  initialStackOrder = 0, initialKeepOnSceneChange = false,
  initialIsStocker = false, initialStockerOwned = false, stockerOwnerLabel = '',
  initialClickAction = null,
  usedImages = new Set(),
  clickActionChoices = { scenes: [], audioTracks: [], stamps: [] },
  maxChatTextLength = 500,
  gridSize, onConfirm
}) {
  const dialog = ensureDialog();
  dialog.innerHTML = '';

  let currentImage = initialImage || null;

  // すでに画像を持つパネルの編集では、画像を選び直してもサイズ欄へは自動反映しない
  // （＝盤面上のパネルの大きさを変えない）。サイズを変えたいときは手で入力する。
  const autoSizeFromImage = !currentImage;

  const form = document.createElement('form');

  const heading = document.createElement('h3');
  heading.textContent = title;
  form.appendChild(heading);

  // --- 画像 ---
  const imageGroup = document.createElement('div');
  imageGroup.className = 'dialog-form-group';
  const imageLabel = document.createElement('label');
  imageLabel.textContent = '画像';
  imageGroup.appendChild(imageLabel);

  const preview = document.createElement('img');
  preview.className = 'dialog-image-preview';
  preview.style.display = currentImage ? 'block' : 'none';
  if (currentImage) preview.src = currentImage;
  imageGroup.appendChild(preview);

  const imageBtnRow = document.createElement('div');
  imageBtnRow.className = 'dialog-custom-row';

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '画像を選択';
  pickBtn.className = 'dialog-add-row-btn';
  pickBtn.style.marginBottom = '0';
  pickBtn.addEventListener('click', async () => {
    // 状態に載るのはURLだけ（データURLのままだと、シーンがパネルを写し取る都合で
    // シーンの数だけ画像が部屋データに積み上がる。js/image-upload.js参照）
    const picked = await showImageSelectorDialog({
      purpose: 'panel', usedImages, title: 'パネルの画像を選ぶ'
    });
    if (!picked) return;
    currentImage = picked.url;
    preview.src = currentImage;
    preview.style.display = 'block';

    // 画像の実サイズをマス換算してサイズ欄へ自動反映（新規追加時のみ）。
    // 寸法はセレクタが持って返す（溜めるときに測ってある）ので、多くの場合は
    // 画像を取り直さずに済む。使い回した画像など分からないときだけ測る。
    if (!autoSizeFromImage) return;
    const dim = (picked.width && picked.height)
      ? { width: picked.width, height: picked.height }
      : await loadImageDimensions(currentImage);
    if (dim) {
      colsInput.value = Math.max(1, Math.round(dim.width / gridSize));
      rowsInput.value = Math.max(1, Math.round(dim.height / gridSize));
    }
  });
  imageBtnRow.appendChild(pickBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '画像を削除';
  clearBtn.className = 'dialog-remove-row';
  clearBtn.addEventListener('click', () => {
    currentImage = null;
    preview.removeAttribute('src');
    preview.style.display = 'none';
  });
  imageBtnRow.appendChild(clearBtn);

  imageGroup.appendChild(imageBtnRow);
  form.appendChild(imageGroup);

  // --- マウスオーバーテキスト ---
  const textGroup = document.createElement('div');
  textGroup.className = 'dialog-form-group';
  const textLabel = document.createElement('label');
  textLabel.textContent = 'マウスオーバーテキスト';
  const textInput = document.createElement('textarea');
  textInput.rows = 4;
  textInput.value = initialText || '';
  textInput.placeholder = 'パネルにカーソルを合わせたときに表示するテキスト';
  textGroup.appendChild(textLabel);
  textGroup.appendChild(textInput);
  form.appendChild(textGroup);

  // --- 幅（マス） ---
  const colsGroup = document.createElement('div');
  colsGroup.className = 'dialog-form-group';
  const colsLabel = document.createElement('label');
  colsLabel.textContent = '幅（マス）';
  const colsInput = document.createElement('input');
  colsInput.type = 'number';
  colsInput.min = '1';
  colsInput.step = '1';
  colsInput.required = true;
  colsInput.value = initialCols;
  colsGroup.appendChild(colsLabel);
  colsGroup.appendChild(colsInput);
  form.appendChild(colsGroup);

  // --- 高さ（マス） ---
  const rowsGroup = document.createElement('div');
  rowsGroup.className = 'dialog-form-group';
  const rowsLabel = document.createElement('label');
  rowsLabel.textContent = '高さ（マス）';
  const rowsInput = document.createElement('input');
  rowsInput.type = 'number';
  rowsInput.min = '1';
  rowsInput.step = '1';
  rowsInput.required = true;
  rowsInput.value = initialRows;
  rowsGroup.appendChild(rowsLabel);
  rowsGroup.appendChild(rowsInput);
  form.appendChild(rowsGroup);

  // --- 重なり順 ---
  // パネル同士の前後だけを決める値（コマは常にパネルより手前のまま）。
  // 実際の描き分けはjs/board-data-driven.jsが行う。
  const stackGroup = document.createElement('div');
  stackGroup.className = 'dialog-form-group';
  const stackLabel = document.createElement('label');
  stackLabel.textContent = '重なり順';
  stackLabel.title = '小さいほど下、大きいほど上に重なります。同じ数値なら後から追加したパネルが上になります。';
  const stackInput = document.createElement('input');
  stackInput.type = 'number';
  stackInput.min = '0';
  stackInput.step = '1';
  stackInput.required = true;
  stackInput.value = initialStackOrder;
  stackGroup.appendChild(stackLabel);
  stackGroup.appendChild(stackInput);
  form.appendChild(stackGroup);

  // --- シーンチェンジで残す ---
  // 既定はオフ（＝従来どおり、シーンへ遷移するとパネルは総入れ替えになる）。
  const keepGroup = document.createElement('div');
  keepGroup.className = 'dialog-form-group';
  const keepLabel = document.createElement('label');
  keepLabel.style.display = 'flex';
  keepLabel.style.alignItems = 'center';
  keepLabel.style.gap = '6px';
  keepLabel.style.cursor = 'pointer';
  keepLabel.title = '他のシーンへ移動してもこのパネルは盤面に残ります（シーンには保存されません）。';
  const keepInput = document.createElement('input');
  keepInput.type = 'checkbox';
  keepInput.checked = !!initialKeepOnSceneChange;
  keepLabel.appendChild(keepInput);
  keepLabel.appendChild(document.createTextNode('シーンチェンジで残す'));
  keepGroup.appendChild(keepLabel);
  form.appendChild(keepGroup);

  // --- カードストッカー ---
  // オンにすると、このパネルがカードを収納できる箱になる（js/game-store.jsのSET_PANEL_STOCKER）。
  // オフに戻すと中のカードは箱の付近へ出てくる。
  // 「自分専用にする」を付けると、入れる・見る・取り出すのすべてが自分だけになる。
  // 付けなければ誰でも自由に使える箱で、中身のカード名も全員に見える。
  const stockerGroup = document.createElement('div');
  stockerGroup.className = 'dialog-form-group';

  const stockerLabel = document.createElement('label');
  stockerLabel.style.display = 'flex';
  stockerLabel.style.alignItems = 'center';
  stockerLabel.style.gap = '6px';
  stockerLabel.style.cursor = 'pointer';
  stockerLabel.title = 'カードをドラッグして収納できる箱になります。右クリックで中身を取り出せます。';
  const stockerInput = document.createElement('input');
  stockerInput.type = 'checkbox';
  stockerInput.checked = !!initialIsStocker;
  stockerLabel.appendChild(stockerInput);
  stockerLabel.appendChild(document.createTextNode('カードストッカーにする'));
  stockerGroup.appendChild(stockerLabel);

  const ownedLabel = document.createElement('label');
  ownedLabel.style.display = 'flex';
  ownedLabel.style.alignItems = 'center';
  ownedLabel.style.gap = '6px';
  ownedLabel.style.cursor = 'pointer';
  ownedLabel.style.marginTop = '4px';
  ownedLabel.style.marginLeft = '18px';
  ownedLabel.title = '所有者だけが、入れる・中身を見る・取り出すことができます。';
  const ownedInput = document.createElement('input');
  ownedInput.type = 'checkbox';
  ownedInput.checked = !!initialStockerOwned;
  ownedLabel.appendChild(ownedInput);
  // 既に他の人のものになっている箱では、誰のものかを出す。「自分専用にする」とだけ書くと
  // 他人の箱を開いた人が自分のものだと読み違える（外して入れ直せば所有者は移る）。
  ownedLabel.appendChild(document.createTextNode(
    stockerOwnerLabel
      ? `所有者を決める（今は${stockerOwnerLabel}のもの。外して入れ直すと自分のものになります）`
      : '自分専用にする（自分だけが出し入れできる）'
  ));
  stockerGroup.appendChild(ownedLabel);

  // ストッカーでないパネルに所有者だけ付いていても意味がないので、連動させる
  function syncStockerOwned() {
    ownedInput.disabled = !stockerInput.checked;
    ownedLabel.style.opacity = stockerInput.checked ? '' : '0.5';
    if (!stockerInput.checked) ownedInput.checked = false;
  }
  stockerInput.addEventListener('change', syncStockerOwned);
  syncStockerOwned();

  form.appendChild(stockerGroup);

  // --- クリックオプション ---
  // 押したときの振る舞いを1つだけ持たせる（js/store/panels.js）。
  // 候補（シーン・音源・スタンプ）は呼び出し側が渡す：このダイアログは状態を知らない部品で、
  // storeを直接触らない約束になっている（js/scene-list-dialog.jsと同じ作り）。
  const clickGroup = document.createElement('div');
  clickGroup.className = 'dialog-form-group';

  const clickLabel = document.createElement('label');
  clickLabel.textContent = 'クリックオプション';
  clickLabel.title = 'このパネルを押したときの動きです。カードストッカーとは同時に設定できません。';
  clickGroup.appendChild(clickLabel);

  const clickTypeSelect = document.createElement('select');
  [
    ['', 'なし'],
    ['chat', '発言する'],
    ['scene', 'シーンを変更する'],
    ['audio', '音楽を変更する'],
    ['stamp', 'スタンプを送る']
  ].forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    clickTypeSelect.appendChild(option);
  });
  clickGroup.appendChild(clickTypeSelect);

  // 発言の本文。チャット入力欄と同じに解釈されるので、ダイスもパラメータ増減も書ける
  const chatWrap = document.createElement('div');
  chatWrap.style.marginTop = '6px';
  const chatInput = document.createElement('textarea');
  chatInput.rows = 2;
  chatInput.maxLength = maxChatTextLength;
  chatInput.placeholder = '例: 2d6+3 ／ +HP(1d6) ／ こんにちは';
  chatInput.title = 'チャット入力欄に打つのと同じに扱われます（ダイス・{HP}・パラメータ増減も使えます）。'
    + '発言者は、チャット欄で選んでいる参照キャラクターになります。';
  chatWrap.appendChild(chatInput);
  clickGroup.appendChild(chatWrap);

  // シーン・音楽・スタンプは、その時点で選べる候補から選ぶ
  const targetWrap = document.createElement('div');
  targetWrap.style.marginTop = '6px';
  const targetSelect = document.createElement('select');
  targetWrap.appendChild(targetSelect);
  clickGroup.appendChild(targetWrap);

  // 種類ごとの候補。value は確定時にそのまま clickAction へ組み直す
  function targetOptionsFor(type) {
    if (type === 'scene') {
      return clickActionChoices.scenes.map((scene) => [scene.id, scene.name]);
    }
    if (type === 'audio') {
      return [
        ...clickActionChoices.audioTracks.map((track) => [
          `play:${track.channel}:${track.id}`,
          `${track.channelLabel}「${track.name}」を鳴らす`
        ]),
        // 停止はチャンネルごと。STOP_AUDIO_PLAYBACKがチャンネルを要求するため
        ['stop:bgm', 'BGMを止める'],
        ['stop:se', '効果音を止める']
      ];
    }
    if (type === 'stamp') {
      return clickActionChoices.stamps.map((stamp) => [stamp.id, stamp.label]);
    }
    return [];
  }

  // 今の設定を value 表現へ直す（種類の選び直しで候補を作り直しても選択を保てるように）
  function initialTargetValue() {
    const action = initialClickAction;
    if (!action) return '';
    if (action.type === 'scene') return action.sceneId;
    if (action.type === 'stamp') return action.stampId;
    if (action.type === 'audio') {
      return action.trackId ? `play:${action.channel}:${action.trackId}` : `stop:${action.channel}`;
    }
    return '';
  }

  function fillTargetOptions(type, keepValue) {
    targetSelect.innerHTML = '';
    const options = targetOptionsFor(type);
    if (options.length === 0) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = type === 'scene'
        ? '（シーンがまだありません）'
        : type === 'audio' ? '（音源がまだありません）' : '（スタンプがまだありません）';
      targetSelect.appendChild(empty);
      return;
    }
    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      targetSelect.appendChild(option);
    });
    // 元々指していた先が消えている（シーンを削除した等）場合、黙って別のものへ
    // すり替わると「押しても違うことが起きる」になる。消えたことが読めるようにしておく。
    if (keepValue && !options.some(([value]) => value === keepValue)) {
      const missing = document.createElement('option');
      missing.value = keepValue;
      missing.textContent = '（削除されたため、選び直してください）';
      targetSelect.insertBefore(missing, targetSelect.firstChild);
    }
    if (keepValue) targetSelect.value = keepValue;
  }

  function syncClickFields() {
    const type = clickTypeSelect.value;
    chatWrap.style.display = type === 'chat' ? '' : 'none';
    targetWrap.style.display = (type === 'scene' || type === 'audio' || type === 'stamp') ? '' : 'none';
  }

  // ストッカーとクリックオプションは同時に持てない（押したときの意味を奪い合うため）。
  // 上のsyncStockerOwnedと同じ形で、片方が入っていれば他方を選べなくする。
  function syncStockerVsClick() {
    const clickChosen = clickTypeSelect.value !== '';
    stockerInput.disabled = clickChosen;
    stockerLabel.style.opacity = clickChosen ? '0.5' : '';
    if (clickChosen && stockerInput.checked) {
      stockerInput.checked = false;
      syncStockerOwned();
    }

    clickTypeSelect.disabled = stockerInput.checked;
    clickLabel.style.opacity = stockerInput.checked ? '0.5' : '';
    if (stockerInput.checked && clickTypeSelect.value !== '') {
      clickTypeSelect.value = '';
      syncClickFields();
    }
  }

  clickTypeSelect.addEventListener('change', () => {
    fillTargetOptions(clickTypeSelect.value, '');
    syncClickFields();
    syncStockerVsClick();
  });
  stockerInput.addEventListener('change', syncStockerVsClick);

  clickTypeSelect.value = initialClickAction?.type || '';
  chatInput.value = initialClickAction?.type === 'chat' ? initialClickAction.text : '';
  fillTargetOptions(clickTypeSelect.value, initialTargetValue());
  syncClickFields();
  syncStockerVsClick();

  form.appendChild(clickGroup);

  // フォームの入力から clickAction を組み立てる。形が揃わないものはnull（＝設定なし）。
  // ここで潰しておくと、UIの連動が壊れても矛盾した値は出ていかない。
  function buildClickAction() {
    if (stockerInput.checked) return null;
    const type = clickTypeSelect.value;
    if (type === 'chat') {
      const text = chatInput.value.trim();
      return text ? { type: 'chat', text } : null;
    }
    const value = targetSelect.value;
    if (!value) return null;
    if (type === 'scene') return { type: 'scene', sceneId: value };
    if (type === 'stamp') return { type: 'stamp', stampId: value };
    if (type === 'audio') {
      const [mode, channel, trackId] = value.split(':');
      if (mode === 'stop') return { type: 'audio', channel, trackId: null };
      if (mode === 'play' && trackId) return { type: 'audio', channel, trackId };
    }
    return null;
  }

  // --- ボタン行 ---
  appendConfirmRow(form, {
    confirmLabel: '適用',
    onCancel: () => dialog.close()
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const cols = Math.max(1, Math.round(Number(colsInput.value) || initialCols));
    const rows = Math.max(1, Math.round(Number(rowsInput.value) || initialRows));
    // 0は有効な値なので、空欄・非数のときだけ元の値へ戻す（|| だと0が弾かれてしまう）
    const rawStackOrder = Number(stackInput.value);
    const stackOrder = Math.max(0, Math.round(
      Number.isFinite(rawStackOrder) ? rawStackOrder : initialStackOrder
    ));
    dialog.close();
    onConfirm({
      image: currentImage, text: textInput.value, cols, rows, stackOrder,
      keepOnSceneChange: keepInput.checked,
      isStocker: stockerInput.checked,
      stockerOwned: stockerInput.checked && ownedInput.checked,
      clickAction: buildClickAction()
    });
  });

  dialog.appendChild(form);
  dialog.showModal();
}
