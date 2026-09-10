// js/check-panel.js
// 「拡張判定UI」：その部屋のシステムが宣言した判定の画面を1枚の浮動パネルに出す器。
// 既定は非表示で、盤外の右クリックメニューから出す（スタンプ送信と同じ構え）。
//
// シノビガミ等のサイコロ・フィクション系なら特技表判定、ドラクルージュ・ステラナイツなら
// ダイスドラフト。どちらを出すかは js/parameters/registry.js の getPluginCheckView が決め、
// 中身の組み立ては js/check-view/ のビューが持つ。**この器はビューの中身を解釈しない。**
//
// 器が持つのは、どのシステムでも同じもの——パネルの枠、対象コマの選択、注意書き、
// そして「材料の参照が変わったときだけ組み直す」判断だけ。
//
// 【判定をパネルへ出した理由】特技表の判定はかつてキャラクター更新ダイアログの中の
// モーダルにしか無く、1回振るたびに開き直すうえ、開いている間はチャットも盤面も触れなかった。
// 卓の最中に何度も使うものはモーダルに置かない。

import {
  store, setCheckPanelController, generateBuffId, getEffectiveParameterValue
} from './board-data-driven.js';
import { rollBCDice } from './BCdice.js';
import { EventBus } from './EventBus.js';
import { createFloatingPanel } from './floating-panel.js';
import { canOperateToken } from './room-authority.js';
import { getPluginCheckView } from './parameters/registry.js';
import { CHECK_VIEW_FACTORIES } from './check-view/index.js';

const NO_PLUGIN_NOTICE = 'この部屋のシステムには拡張判定UIがありません。';
const NO_TOKEN_NOTICE = '上の「対象」でコマを選ぶと、そのコマで判定できます。';
const READ_ONLY_NOTICE = '他の人のコマです（表示のみ。動かせるのは持ち主とGMです）';

/**
 * @param {{ onCharacterChange?: (tokenId: string|null) => void }} options
 *   onCharacterChange … パネルで対象コマを選び直した時。チャット欄の参照キャラクターを
 *   同じコマへ動かすために js/main.js が渡す。**選ぶ場所は2つでも、指しているコマは常に1つ。**
 */
export function initCheckPanel({ onCharacterChange = null } = {}) {
  const panel = createFloatingPanel({
    title: '判定',
    // 名前がダイスドラフト専用だった頃のまま。ここには位置・大きさに加えて表示状態も
    // 入っているので、変えると今このパネルを開いて使っている卓のパネルが一度閉じる。
    storageKey: 'diceDraftPanelRect',
    // 特技表（分野×出目の格子）が読める大きさを既定にする
    defaultRect: { x: 360, y: 160, w: 520, h: 560 },
    // 使わないシステムの部屋では邪魔なので、出すかどうかは各自に決めてもらう
    defaultVisible: false
  });
  panel.body.classList.add('check-panel-body');

  // --- 対象コマの選択 ---------------------------------------------
  // 選択肢の中身は、チャット欄の参照キャラクター（js/main.js）と同じ材料・同じ絞り込み。
  // バックヤードにしまわれたコマは盤面に存在しない扱いなので出さない。
  const pickerRow = document.createElement('div');
  pickerRow.className = 'check-panel-picker';

  const pickerLabel = document.createElement('span');
  pickerLabel.className = 'check-panel-picker-label';
  pickerLabel.textContent = '対象';
  pickerRow.appendChild(pickerLabel);

  const picker = document.createElement('select');
  picker.className = 'check-panel-picker-select';
  picker.title = '判定するコマ（チャット欄の参照キャラクターと連動します）';
  pickerRow.appendChild(picker);
  panel.body.appendChild(pickerRow);

  const notice = document.createElement('div');
  notice.className = 'check-panel-notice';
  notice.hidden = true;
  panel.body.appendChild(notice);

  const content = document.createElement('div');
  content.className = 'check-panel-content';
  panel.body.appendChild(content);

  let currentTokenId = null;
  // ビューが「今は描き直さないでほしい」と言っている間（ダイスをドラッグ中など）
  let busy = false;
  // 直前に描いた材料。参照が変わったときだけ組み直す（js/character-panel.jsと同じ狙い）
  let lastKey = null;
  // 今の部屋のビュー。判定UIの種類が変わったときだけ作り直す
  let view = null;
  let viewId = null;

  const getToken = () => (currentTokenId ? store.state.tokens[currentTokenId] : null) ?? null;
  const getDeclaration = () => getPluginCheckView(store.state.room?.activePlugin ?? null);

  picker.addEventListener('change', () => {
    const next = picker.value || null;
    if (currentTokenId === next) return;
    setCharacter(next);
    onCharacterChange?.(next);
  });

  // 盤面のコマの登録・削除・改名・しまう/出すに追従する。
  // 選んでいたコマが選択肢から消えた場合は「（選択なし）」へ落ちる（下のsetCharacterで拾う）。
  function renderPicker() {
    picker.innerHTML = '';

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = '（選択なし）';
    picker.appendChild(noneOption);

    Object.values(store.state.tokens)
      .filter(token => !token.inBackyard)
      .forEach(token => {
        const option = document.createElement('option');
        option.value = token.id;
        option.textContent = token.name;
        picker.appendChild(option);
      });

    picker.value = currentTokenId ?? '';
    // 選んでいたコマが一覧から消えていれば、selectは空文字へ落ちる
    if (picker.value === '' && currentTokenId) currentTokenId = null;
  }

  function showNotice(text) {
    notice.textContent = text;
    notice.hidden = false;
    content.innerHTML = '';
  }

  // 判定UIの種類が変わったらビューを作り直す。同じ種類なら作り置きを使い回す
  // （ビューは「保存しない見た目の状態」——狙う目標値・幕の絞り込み——を持っているため）。
  function ensureView(declaration) {
    if (!declaration || !CHECK_VIEW_FACTORIES[declaration.view]) {
      view = null;
      viewId = null;
      return null;
    }
    if (viewId !== declaration.view) {
      content.innerHTML = '';
      view = CHECK_VIEW_FACTORIES[declaration.view]();
      viewId = declaration.view;
    }
    return view;
  }

  function render() {
    renderPicker();

    const declaration = getDeclaration();
    const activeView = ensureView(declaration);

    if (!activeView) {
      panel.setTitle('判定');
      showNotice(NO_PLUGIN_NOTICE);
      return;
    }

    panel.setTitle(activeView.title(declaration.spec));

    const token = getToken();
    if (!token) {
      content.innerHTML = '';
      showNotice(NO_TOKEN_NOTICE);
      return;
    }

    const canEdit = canOperateToken(token);
    notice.hidden = canEdit;
    notice.textContent = canEdit ? '' : READ_ONLY_NOTICE;

    activeView.render({
      container: content,
      spec: declaration.spec,
      token,
      canEdit,
      getToken,
      dispatch: store.dispatch.bind(store),
      getEffectiveParameterValue,
      generateBuffId,
      rollBCDice,
      // ビュー内の見た目だけの状態（幕の絞り込み・狙う目標値）を変えた後に呼ぶ
      requestRender: () => { lastKey = null; render(); },
      setBusy: (value) => { busy = !!value; }
    });
  }

  // 材料の参照が変わったときだけ組み直す。器が常に見るのは「どのコマか・どのシステムか・
  // 名前・操作してよいか」で、それ以外はビューのrenderKeyに任せる。
  function renderIfChanged() {
    if (busy) return;

    const declaration = getDeclaration();
    const token = getToken();
    const key = {
      tokenId: currentTokenId,
      pluginId: store.state.room?.activePlugin ?? null,
      name: token?.name ?? null,
      canEdit: token ? canOperateToken(token) : false,
      // 選択肢の並びに効く（コマの追加・削除・改名・バックヤードへの出し入れ）
      tokens: store.state.tokens,
      view: declaration
        ? (CHECK_VIEW_FACTORIES[declaration.view] ? declaration.view : null)
        : null,
      viewKey: (view && declaration && token) ? view.renderKey({ spec: declaration.spec, token }) : null
    };

    if (lastKey && sameKey(lastKey, key)) return;

    lastKey = key;
    render();
  }

  // 1段だけの参照比較。viewKey（ビューが返す入れ子のオブジェクト）だけもう1段深く見る。
  function sameKey(a, b) {
    if (a.tokenId !== b.tokenId || a.pluginId !== b.pluginId || a.name !== b.name
      || a.canEdit !== b.canEdit || a.tokens !== b.tokens || a.view !== b.view) return false;
    if (a.viewKey === b.viewKey) return true;
    if (!a.viewKey || !b.viewKey) return false;
    const keys = Object.keys(a.viewKey);
    if (keys.length !== Object.keys(b.viewKey).length) return false;
    return keys.every(name => a.viewKey[name] === b.viewKey[name]);
  }

  EventBus.subscribe('STATE_CHANGED', renderIfChanged);
  // 名乗りが変わると操作してよいかが変わる（canOperateToken）
  EventBus.subscribe('IDENTITY_CHANGED', () => { lastKey = null; renderIfChanged(); });

  render();

  // 盤外の右クリックメニューから表示/非表示を切り替えられるようにする
  setCheckPanelController(panel);

  /**
   * 対象のコマを切り替える。チャット欄の参照キャラクターから呼ばれる（js/main.js）。
   * 同じコマなら何もしないので、パネル→チャット→パネルと往復しても止まる。
   */
  function setCharacter(tokenId) {
    if (currentTokenId === (tokenId || null)) return;
    currentTokenId = tokenId || null;
    lastKey = null;
    renderIfChanged();
  }
  panel.setCharacter = setCharacter;

  return panel;
}
