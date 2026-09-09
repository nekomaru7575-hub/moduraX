// js/character-panel.js
// 「キャラクター一覧」：盤面にいるコマと、バックヤード（盤面からしまったコマの個人保管場所）を
// タブで切り替えて並べる浮動パネル。どちらもstore.state.tokensをinBackyardで分けただけの
// 相補的な一覧なので、1枚のパネルの表と裏として扱う。
//
// 以前は盤面の左端に貼り付いた固定オーバーレイ（.character-panel-area）で、バックヤードは
// 盤外の右クリックメニューから開くモーダルダイアログだった。チャットパレット・情報と同じ
// createFloatingPanelへ載せ替え、置き場所を選べるようにしたうえで導線も1つにまとめている。
//
// net-sync.js/round-panel.js/info-panel.jsと同様にinitCharacterPanel()をexportし、
// main.jsの初期化から1回だけ呼ぶ。

import {
  store, setCharacterPanelController, DEFAULT_TOKEN_COLOR, getEffectiveParameterValue,
  openTokenContextMenu
} from './board-data-driven.js';
import { EventBus } from './EventBus.js';
import { bindDragGesture, LONG_PRESS_ONLY } from './drag-gesture.js';
import { createFloatingPanel } from './floating-panel.js';
import { canView, isGm, HIDDEN_VALUE_MASK } from './visibility.js';
import { getCurrentParticipantId, getLocalUserId } from './local-identity.js';
import {
  showTokenLibraryPickerDialog, showTokenLibrarySaveDialog
} from './token-library-dialog.js';

// 引き取り（下のclaimRestoredTokens）の連続失敗を数える。サーバーに断られるとRESYNCで
// 印の付いた状態が戻ってくるため、無条件に撃ち直すと往復し続けてしまう。引き取れたら
// 0に戻すので、入室中に続けて読み込んだ場合もその都度やり直せる（情報のclaimRestoredEntries
// ・js/info-panel.jsと同じ作り）。
const MAX_CLAIM_ATTEMPTS = 3;
let claimAttempts = 0;

// パラメータのラベルは列幅に収まらないので頭だけ見せる（全文はtitleで出す）
function truncateLabel(label, maxLength = 4) {
  if (!label) return '';
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}

// 盤面にいるコマ。バックヤードにしまわれているコマは「今、盤面にいない」扱いなので出さない。
// 並びはイニシアチブ（実効値）の降順。
function listBoardTokens(state) {
  return Object.values(state.tokens)
    .filter(t => !t.inBackyard && t.visible !== false)
    .sort((a, b) => {
      const initiativeA = a.parameters?.['core:initiative'] ? getEffectiveParameterValue(a, 'core:initiative') : 0;
      const initiativeB = b.parameters?.['core:initiative'] ? getEffectiveParameterValue(b, 'core:initiative') : 0;
      return initiativeB - initiativeA;
    });
}

// 部屋の誰かのバックヤードに入っているコマを、持ち主を問わず全部返す。
// 「部屋の全データ保存」で書き出す対象がこれ（js/main.jsのexportStateToFile）。棚の分け方は
// その部屋限りのIDに依存していて別の部屋へは持ち越せないので、保存では持ち主で絞らず、
// 読み込んだ側でGMの棚へまとめて入れ直す（js/state-import.js）。
export function listBackyardTokens(state) {
  return Object.values(state.tokens).filter(t => t.inBackyard);
}

// バックヤードに入っているコマのうち、自分の棚のものだけを返す。
// 表示名を設定している人は所有者(ownerId)で判定するので、別の端末から入り直しても
// 同じ棚が見える。ownerIdを持たないコマ（この機能より前にしまったもの・ゲストがしまった
// もの）は、従来どおりブラウザ単位のIDで判定する。
export function listMyBackyardTokens(state) {
  const myParticipantId = getCurrentParticipantId();
  const myLocalUserId = getLocalUserId();

  return Object.values(state.tokens).filter(t => {
    if (!t.inBackyard) return false;
    if (t.ownerId) return t.ownerId === myParticipantId;
    return t.backyardOwnerId === myLocalUserId;
  });
}

// アバター（画像 or 色）＋ イニシアチブバッジ ＋ 名前。両方のタブで同じ見た目を使う。
// バックヤードのコマは行動順に関係ないので、バッジは盤面タブでだけ出す。
function buildAvatarColumn(tokenData, { withInitiative }) {
  const avatarColumn = document.createElement('div');
  avatarColumn.className = 'character-avatar-column';

  const avatar = document.createElement('div');
  avatar.className = 'character-avatar';
  if (tokenData.image) {
    avatar.style.backgroundImage = `url('${tokenData.image}')`;
  } else {
    avatar.style.backgroundColor = tokenData.color || DEFAULT_TOKEN_COLOR;
  }

  if (withInitiative && tokenData.parameters?.['core:initiative']) {
    const initiativeBadge = document.createElement('span');
    initiativeBadge.className = 'character-avatar-initiative';
    initiativeBadge.textContent = getEffectiveParameterValue(tokenData, 'core:initiative');
    avatar.appendChild(initiativeBadge);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'character-avatar-name';
  nameSpan.textContent = tokenData.name;
  if (tokenData.textColor) {
    nameSpan.style.color = tokenData.textColor;
  }

  bindTokenMenu(avatar, tokenData.id);

  avatarColumn.appendChild(avatar);
  avatarColumn.appendChild(nameSpan);
  return avatarColumn;
}

// アバターを右クリック（スマホは長押し）で、盤面のコマと同じメニューを開く。
// 小さくて狙いにくい盤面のコマや、そもそも盤面にいないバックヤードのコマにも、
// 一覧から同じ操作（キャラクター更新・バフ付与・削除など）で届くようにするため。
//
// ここでは動かす操作が無いのでLONG_PRESS_ONLYを返し、長押しの見張りだけを頼む。
// pointerdownを握らないので、一覧を指でスクロールする動きはそのまま通る
// （js/drag-gesture.js参照）。
function bindTokenMenu(element, tokenId) {
  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openTokenContextMenu(tokenId, event.clientX, event.clientY);
  });

  bindDragGesture(element, {
    onStart: () => LONG_PRESS_ONLY,
    onLongPress: (event) => openTokenContextMenu(tokenId, event.clientX, event.clientY)
  });
}

function buildBoardRow(tokenData, myId) {
  const item = document.createElement('div');
  item.className = 'character-list-item';
  item.appendChild(buildAvatarColumn(tokenData, { withInitiative: true }));

  const paramList = document.createElement('div');
  paramList.className = 'character-param-list';

  Object.entries(tokenData.parameters || {})
    // visible: 一覧に出すかどうか（全員共通）。出さないものは行ごと消える。
    // roundOnly: 戦闘中（ラウンド進行中）にだけ意味を持つ値。進行していない間は同じく
    // 行ごと出さない（シノビガミの「コスト計」。js/parameters/paramFactory.js参照）。
    // 2つはANDで、visible:falseのものは戦闘中でも出ない。
    .filter(([, param]) => param.visible !== false && (!param.roundOnly || store.state.round?.active))
    .forEach(([paramId, param]) => {
      const paramRow = document.createElement('div');
      paramRow.className = 'character-list-param-row';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'character-param-label';
      labelSpan.textContent = truncateLabel(param.label);
      labelSpan.title = param.label;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'character-param-value';

      // audience: 誰に見せるか（相手ごと）。宛先でない人には行は出すが値だけを伏せる。
      // 行ごと消すと「そのコマが何を持っているか」まで隠れて、伏せられていること自体に
      // 気づけない。パラメータ変更コマンドのログ（js/main.js）と同じ見せ方に揃える。
      if (!canView(param.audience, myId)) {
        valueSpan.textContent = HIDDEN_VALUE_MASK;
        valueSpan.title = '公開されていません';
      } else {
        // バフ/デバフがかかっている場合は実効値（基礎値＋合計）を表示し、
        // 差分を括弧書きで添える（例: 68 (+10)）
        const effectiveValue = getEffectiveParameterValue(tokenData, paramId);
        // 文字列値の変数にはバフ差分の概念がない（getEffectiveParameterValueが
        // 基礎値をそのまま返すため常に差分ゼロ）。数値どうしの引き算のみ行う。
        const buffTotal = typeof param.value === 'number' ? effectiveValue - param.value : 0;

        valueSpan.textContent = buffTotal !== 0
          ? `${effectiveValue} (${buffTotal > 0 ? '+' : ''}${buffTotal})`
          : String(effectiveValue);
        if (buffTotal !== 0) {
          valueSpan.title = `基礎値 ${param.value}${buffTotal > 0 ? '+' : ''}${buffTotal}`;
        }
      }

      paramRow.appendChild(labelSpan);
      paramRow.appendChild(valueSpan);
      paramList.appendChild(paramRow);
    });

  item.appendChild(paramList);
  return item;
}

// 「盤面に戻す」は適用を挟まず即時反映。位置(x,y)はしまっている間も保たれているので、
// 元いた場所へそのまま戻る。
//
// 「保存したコマへ」は棚（部屋の外のコマ作成ツールの置き場）への写し。バックヤードは
// 棚から引き込んだコマが最初に着く場所でもあるので、戻す道も同じ行に置く。
// 行は260pxしか無く、2つ横に並べるとアバターごと潰れるので縦に積む。
function buildBackyardRow(tokenData) {
  const item = document.createElement('div');
  item.className = 'character-list-item';
  item.appendChild(buildAvatarColumn(tokenData, { withInitiative: false }));

  const actions = document.createElement('div');
  actions.className = 'character-panel-row-actions';

  const restoreBtn = document.createElement('button');
  restoreBtn.type = 'button';
  restoreBtn.className = 'character-panel-row-btn';
  restoreBtn.textContent = '盤面に戻す';
  restoreBtn.addEventListener('click', () => {
    store.dispatch('RESTORE_FROM_BACKYARD', { id: tokenData.id });
  });
  actions.appendChild(restoreBtn);

  const shelveBtn = document.createElement('button');
  shelveBtn.type = 'button';
  shelveBtn.className = 'character-panel-row-btn';
  shelveBtn.textContent = '保存したコマへ';
  shelveBtn.addEventListener('click', () => {
    showTokenLibrarySaveDialog({ tokenId: tokenData.id });
  });
  actions.appendChild(shelveBtn);

  item.appendChild(actions);

  return item;
}

export function initCharacterPanel() {
  const panel = createFloatingPanel({
    title: 'キャラクター一覧',
    storageKey: 'characterPanelRect',
    // 既存2枚（チャットパレット x:24 / 情報 x:360）と重ならない初期位置
    defaultRect: { x: 720, y: 120, w: 260, h: 460 },
    // 以前は常時表示の固定パネルだったので、既定では出しておく
    defaultVisible: true
  });
  setCharacterPanelController(panel);

  const container = panel.body;
  // チャットパレット・情報と同じく、パネル本体のクラスを中身側のものへ差し替える
  // （flexの縦並びは.character-panel側で持ち直す）
  container.className = 'character-panel';

  const tabRow = document.createElement('div');
  tabRow.className = 'character-panel-tabs';
  container.appendChild(tabRow);

  const listEl = document.createElement('div');
  listEl.className = 'character-panel-list';
  container.appendChild(listEl);

  // 'board' | 'backyard'。位置/サイズと違って永続化はせず、毎回「盤面」から始める。
  let mode = 'board';
  let lastRenderedTokensRef = null;
  let lastRenderedParticipantsRef = null;

  function renderTabs(backyardCount) {
    tabRow.innerHTML = '';

    // バックヤードの件数は、旧右クリックメニューのラベルが持っていた表示を引き継ぐ。
    // タブを開かなくても「しまってあるコマがある」ことが分かるようにするため。
    [
      ['board', '盤面'],
      ['backyard', backyardCount > 0 ? `バックヤード (${backyardCount})` : 'バックヤード']
    ].forEach(([value, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'character-panel-tab';
      btn.classList.toggle('is-active', mode === value);
      btn.textContent = label;
      btn.addEventListener('click', () => {
        mode = value;
        render(store.state);
      });
      tabRow.appendChild(btn);
    });
  }

  function renderList(tokens, myId) {
    listEl.innerHTML = '';

    // 棚（部屋の外のコマ作成ツールで作って、このブラウザに保存したコマ）からの引き込み。
    // バックヤードは「盤面に出していない自分のコマ」の置き場なので、外から持ち込んだ
    // コマが最初に着く場所もここになる。空のときこそ要る導線なので、一覧より前に置く。
    if (mode === 'backyard') {
      const bringBtn = document.createElement('button');
      bringBtn.type = 'button';
      bringBtn.className = 'character-panel-bring-btn';
      bringBtn.textContent = '保存したコマから追加';
      bringBtn.addEventListener('click', () => { showTokenLibraryPickerDialog(); });
      listEl.appendChild(bringBtn);
    }

    if (tokens.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'character-panel-empty';
      empty.textContent = mode === 'backyard'
        ? 'バックヤードは空です。'
        : '盤面にコマがいません。';
      listEl.appendChild(empty);
      return;
    }

    tokens.forEach(tokenData => {
      listEl.appendChild(mode === 'backyard'
        ? buildBackyardRow(tokenData)
        : buildBoardRow(tokenData, myId));
    });
  }

  // 部屋データの読み込みで復元されたバックヤードのコマ（restoredFromImport）を、GMのものと
  // して引き取る。読み込んだファイルの棚の分け方は、部屋が変われば誰も名乗れないIDになって
  // いる。部屋の中からの読み込みなら取り込みの時点で読み込んだGMの棚へ入るが、部屋の作成と
  // 同時の読み込みではまだ誰も居ないので印だけが付いている（js/state-import.js）。
  // ここで引き取って初めて、GMのバックヤードのタブに出る。
  function claimRestoredTokens(state, myId) {
    if (!Object.values(state.tokens).some(token => token?.restoredFromImport)) {
      claimAttempts = 0; // 引き取り済み。次の読み込みに備えて数え直す
      return false;
    }
    if (claimAttempts >= MAX_CLAIM_ATTEMPTS) return false;
    if (!myId || !isGm(state.participants, myId)) return false;

    claimAttempts += 1;
    store.dispatch('CLAIM_RESTORED_BACKYARD', { participantId: myId });
    return true;
  }

  function render(state) {
    const myId = getCurrentParticipantId();
    // 引き取ると状態が変わり、その通知で描き直されるので、ここでは描かずに譲る
    if (claimRestoredTokens(state, myId)) return;
    const backyardTokens = listMyBackyardTokens(state);

    renderTabs(backyardTokens.length);
    renderList(mode === 'backyard' ? backyardTokens : listBoardTokens(state), myId);
  }

  render(store.state);

  // tokensスライスはコマが変わったときだけ新しい参照になる（game-store.jsの#commit）ので、
  // 参照比較で他スライスだけの変更（チャットログ等）による全描画を避ける。
  // participantsも見るのは引き取り（claimRestoredTokens）のため：部屋の作成と同時に読み込むと
  // 「印の付いたコマは既にあるが、GMがまだ居ない」状態で始まるので、最初の1人がGMになった
  // 参加者一覧の変化で撃ち直せないと、印が付いたまま誰の棚にも出ない。
  EventBus.subscribe('STATE_CHANGED', (state) => {
    if (state.tokens === lastRenderedTokensRef
      && state.participants === lastRenderedParticipantsRef) return;
    lastRenderedTokensRef = state.tokens;
    lastRenderedParticipantsRef = state.participants;
    render(state);
  });

  // 名乗る人が変わると、見えるパラメータも「自分の棚」の中身も変わる
  // （状態自体は変わらないためSTATE_CHANGEDでは拾えない）。
  // 引き取りの失敗数もここで0に戻す：サーバーは名乗りが通っていない接続からのGM限定操作を
  // 断るので、名乗りが通った（IDENTITY_ACCEPTED）この機会に必ずやり直す。
  EventBus.subscribe('IDENTITY_CHANGED', () => {
    claimAttempts = 0;
    lastRenderedTokensRef = null;
    lastRenderedParticipantsRef = null;
    render(store.state);
  });

  // 狭幅レイアウトで中央スペースへはめ込むため、パネル本体をjs/main.jsへ返す
  return panel;
}
