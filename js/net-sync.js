// js/net-sync.js
// ブラウザ側の同期クライアント。store.dispatchをラップして、ローカル適用に加えて
// 権威（サーバー、またはホスト権威P2Pのホスト役）へアクションを送信し、
// 権威・他クライアントから届いたアクションをローカルに適用する。
//
// 【運ぶ道は知らない】メッセージを実際に運ぶのはjs/net-transport.jsが選んだ実装で、
// このファイルはプロトコル（INIT / ACTION / RESYNC / IDENTIFY / TYPING_USERS /
// ENTRY_REQUIRED …）と繋ぎ直しだけを担う。WebSocketかWebRTCかはここには現れない。
// 分けてあるのはP2P化の検討のため（docs/p2p-migration-notes.md）。

// 繋ぎ直しの最初の待ち。ここから倍にしていく（reconnectDelay）。
const RECONNECT_DELAY_MS = 2000;

// 通常の卓を繋ぎ直すときの待ちの上限。
//
// 【固定2秒の無限リトライをやめた理由】2つある。
//   ・スピンダウンからの起き直り（Renderで約1分）の間、30回ぶんの接続要求を
//     起きかけのサーバーへ叩き込むことになる
//   ・**この繋ぎ直しそのものが inbound traffic として数えられる。** 下の
//     KEEPALIVE_MAX_IDLE_MSで起こすのをやめても、ここが2秒で回り続ければ
//     結局サーバーを起こし続ける（歯止めが歯止めにならない）
//
// 上限をホスト役の口の繋ぎ直し（HOST_SIGNALING_MAX_DELAY_MS、30秒）より短く取るのは、
// こちらが「人が画面の前で待っている」経路だから。起き直りが1分なので、30秒だと
// 「起きた直後に最大30秒待たされる」が現実に起きる。15秒なら2/4/8/15/15…で
// その1分の間に6回試せる。叩きすぎず、復帰も待たせない。
const RECONNECT_MAX_DELAY_MS = 15 * 1000;

// ホスト役がシグナリングの口を繋ぎ直すときの待ちの上限（handleSignalingClose）。
// あちらは人が待っている経路ではなく、デプロイの入れ替わり（数十秒）を待つものなので長い。
const HOST_SIGNALING_MAX_DELAY_MS = 30 * 1000;

// --- 無操作でも定期的にサーバーへ1通送る間隔 ---
//
// 【なぜ要るか】Renderの無料プランは「15分間 inbound traffic が無い」とスピンダウンする。
// 公式の説明はこれに「既存接続からのWebSocketメッセージ」も含むと明記している。ところが
// このアプリは**クライアントから定期的に何も送っていなかった**：サーバー→クライアントの
// 生存確認（server/index.jsのHEARTBEAT_INTERVAL_MS）は outbound で、返るpongは
// WebSocketのコントロールフレームなので、アプリのメッセージとしては1通も上がらない。
// つまり「部屋を開いたまま15分席を外す」だけで卓が落ちる。ここを1通で埋める。
//
// 【4分の根拠】期限15分に対して1窓3回＝2回続けて取りこぼしても落ちない。Chromeの背景タブは
// 概ね1分に1回しか起きないので60秒未満にしても意味がなく、60秒以上なら「最大1分遅れる」
// だけで遅れは積み上がらない。費用はほぼゼロ（1時間に15通・1通20バイト程度。サーバーの
// 流量制限MESSAGE_RATE_LIMITは10秒300件）。
//
// 【これで救えないもの】端末のスリープと、モバイルでのタブ凍結ではタイマーごと止まる。
// そこは落ちること自体を防げないので、上の繋ぎ直しの仕事になる。
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

// この画面の人が最後に操作してから、これを過ぎたら接続ごと休止する（suspend）。
//
// 【なぜ止めるのか】Renderの無料枠は750インスタンス時間/月。閉じ忘れたタブが24時間
// 起こし続けると月730時間となり、それだけで枠をほぼ使い切る。月に数回あるだけで、
// 遊びたい日に「今月はもう動かない」が起きる。
//
// 【8時間の根拠】TRPGの1卓はおよそ3〜6時間。休憩や長考をまるごと飲み込める長さにして、
// **遊んでいる最中に落ちることはまず無い**ようにしつつ、閉じ忘れの方だけを止める。
const KEEPALIVE_MAX_IDLE_MS = 8 * 60 * 60 * 1000;

import { store } from './game-store.js';
import { adoptImportedState } from './state-import.js';
import { EventBus } from './EventBus.js';
import { createTransport, CLOSE_CODES, isP2pMode } from './net-transport.js';
import { createRtcGuestTransport } from './net-transport-rtc.js';
import { openSignaling } from './net-signaling.js';
import { startHost } from './net-host.js';
import { ensureAssetsFor, handleAssetMessage, initAssetSync } from './asset-sync.js';
import { startHostPersistence } from './host-persistence.js';
import { takePendingImport } from './p2p-import-handoff.js';
import { adoptDataUrlsInState } from './asset-store.js';
import { currentRoomId, getStoredEntryPassword, setStoredEntryPassword } from './room-entry.js';
import { showRoomEntryDialog, closeRoomEntryDialog } from './room-entry-dialog.js';
import { playEntrySound, playChatSendSound } from './audio-player.js';
import {
  activateRoomIdentity, getCurrentAuthToken, getCurrentParticipantId, getLocalUserId,
  getStoredRoomName
} from './local-identity.js';

// ラップ前の元のdispatch。サーバーから受け取ったアクションは、これで直接適用することで
// サーバーへの再送信（無限ループ）を防ぐ。
const localDispatch = store.dispatch.bind(store);

// 今つながっている道（js/net-transport.jsの契約）。切れている間はnull。
// ホスト役として動いている間はずっとnull——自分が権威なので、送る先が上に無い。
let transport = null;

// ホスト役として動いている場合の中継口（js/net-host.js）。ゲスト・WebSocket時はnull。
let host = null;

// ホストが部屋の控えをサーバーへ預ける係（js/host-persistence.js）。ホスト時だけ。
let hostPersistence = null;

// P2P卓でサーバーとの間に張っている口（js/net-signaling.js）。ホストもゲストも1本持つ。
// 同期データは通らないが、入室パスワードの照合と部屋の削除はここを通る。
let signaling = null;

// シグナリングから届いた合図の行き先。口を繋ぎ直しても**ホスト役はそのまま**なので、
// 行き先だけを新しい口へ差し替えられるようモジュール側に置く（reconnectHostSignaling）。
let routeSignal = null;
let routeHostReady = null;

// ホストがシグナリングを繋ぎ直すための予約と、いま何回目か。
let hostReconnectTimer = null;
let hostReconnectAttempts = 0;
// ホスト役の枠が空くのを待つ回数。サーバーが古い接続の切断に気づくまでの猶予で、
// 2秒から倍にして5回＝およそ1分待つ。ここを1回にすると、回線が一瞬切れただけで
// 「他人に移りました」と誤って追い出すことになる。
const HOST_RECLAIM_TRIES = 5;

// P2P卓で繋ぎ直した回数と、この読み込みの間に一度でもホストと繋がれたか。
// 一度も繋がれないまま重なった場合だけ、黙って待たせずに理由を伝えて部屋一覧へ戻す
// （下のhandleP2pClose）。一度繋がった相手なら、ホストが繋ぎ直している最中かもしれない
// ので待ってやり直す——ここを分けないと、GMがリロードしただけで全員が追い出される。
let p2pAttempts = 0;
let p2pEverConnected = false;
// ホストがそもそも居たか。「繋がらなかった」の理由が回線なのか、GMがまだ来ていないのかを
// 分けて伝えるために要る（どちらも症状は同じ「入れない」なので、混ぜると直しようがない）。
let p2pHostSeen = false;

// この接続で一度でもINITを受け取ったか。受け取る前に「不正／未作成の部屋」で切られた場合
// だけ、繋ぎ直さずに部屋一覧へ案内する（下のhandleClose）。接続は常に1本なので、
// 繋ぎ直しのたびにconnect()で倒し直せばよい。
let hasReceivedInit = false;

// 開発用の合言葉で名乗れているか。サーバーだけが判定できる値なので、名乗りの結果
// （IDENTITY_ACCEPTED）で受け取って持っておく。接続ごとに名乗り直すため、切れたら忘れる。
let developerIdentity = false;

// この画面が名乗る値（{participantId, authToken}）。名乗りは接続ごとにサーバーが忘れるので、
// 繋がるたびに送り直せるようここで覚えておく。ゲスト参加へ切り替えたときはnullに戻す。
let identityToSend = null;

// この読み込みで、一度でも名乗りが通ったか。**繋ぎ直しでの入室メッセージを止めるため**に持つ
// （名乗りと一緒にresumedとして送る。判断はjs/net-host-rules.jsのentryMessageDecision）。
//
// 【接続ごとではなく読み込みごとに覚える】繋ぎ直しは接続を作り直すので、接続に紐づけて
// 覚えても毎回忘れてしまう。権威の側で覚えないのは、再接続がまとめて起きる場面
// （デプロイ・スピンダウンからの起き直り）ではプロセスのメモリごと消えているため。
//
// 【INITではなくIDENTITY_ACCEPTEDで立てる】名前をまだ決めていない人は、INITを受け取った
// 後に名前を入力してから初めて名乗る。INITで立てると、その初回の名乗りまで「繋ぎ直し」に
// 見えてしまい、**初めて入った人の入室メッセージが出なくなる。**
let hasIdentifiedOnce = false;

// サーバーを寝かせないための定期送信のタイマー（KEEPALIVE_INTERVAL_MS）。
// **接続1本につき1つ**で、繋がっていない間はnull。張るのはhandleOpen、外すのはhandleClose
// の1組だけなので、数え上げなしで多重起動を防げる。
let keepaliveTimer = null;

// 繋ぎ直しの予約と、いま何回目か（reconnectDelay / RECONNECT_MAX_DELAY_MS）。
// 予約を覚えておくのは、休止に入るときに取り消すため（覚えていないと、休止した後に
// 積み残りのタイマーが発火して繋ぎ直してしまう）。
let reconnectTimer = null;
let reconnectAttempts = 0;

// 何本目の接続か。**古い接続からの知らせを聞かないため**に数える（connect参照）。
let connectGeneration = 0;

// 長い無操作で自分から接続を畳んだか（suspend / resumeFromSuspend）。
// 立っている間は繋ぎ直さない——**これが歯止めの本体**で、keepaliveを止めるだけでは
// 切断のたびの繋ぎ直しがサーバーを起こし続けてしまう。
let suspended = false;

// この画面の人が最後に自分で操作した時刻（KEEPALIVE_MAX_IDLE_MS）。
// **受信した他人のACTIONでは更新しない。** 他人が遊んでいるなら、その人のタブの
// 定期送信が起こしていればよく、こちらまで起き続ける理由はない。
let lastLocalActionAt = Date.now();

export function isDeveloperIdentity() {
  return developerIdentity;
}

// 入室パスワードの入力を求める。入力された値は覚えておき、繋がっていればその場で
// 送り直す。切れていた場合は、再接続後のENTRY_REQUIREDで自動的に使われる。
//
// submitは「照合してもらう相手へJOINを送る関数」。従来の卓ではサーバーとの同期の道
// （transport）、P2P卓ではシグナリングの口（js/net-signaling.js）になる。合言葉を
// 持っているのはどちらの場合もサーバーで、ホスト役は照合に関わらない。
function askEntryPassword({ error, submit }) {
  showRoomEntryDialog({
    password: getStoredEntryPassword(currentRoomId()),
    error,
    onSubmit: (password) => {
      setStoredEntryPassword(currentRoomId(), password);
      sendJoin(submit);
    }
  });
}

// 覚えているパスワードで入室を試みる。まだ何も覚えていなければ入力を求める
// （パスワードなしの部屋ではサーバーがENTRY_REQUIREDを送らないので、ここは通らない）。
function sendJoin(submit) {
  const password = getStoredEntryPassword(currentRoomId());
  if (!password) {
    askEntryPassword({ error: false, submit });
    return;
  }
  submit(password);
}

// 従来の卓での送り先。P2P卓ではシグナリングのsendJoinを渡す（openSignalingが引数でくれる）。
function submitJoinOverTransport(password) {
  transport?.send({ type: 'JOIN', password });
}

// 繋ぎ直しの待ち。RECONNECT_DELAY_MSから始めて倍にし、上限で頭打ちにする。
// 通常の卓（scheduleReconnect）とホスト役の口（handleSignalingClose）の両方が使う。
// **同じ計算を2か所に書かない**ため——片方だけ直すと、症状の似た別の壊れ方になる。
//
// 【ゆらぎ（±25%）を足す理由】卓の全員は**同時に切れる**（サーバーが落ちれば全員へ
// 同じ瞬間にcloseが届く）。素の倍々だと全員が同じ秒に揃って戻ってくるので、
//   ・起きかけのサーバーへ人数ぶんの接続要求が一斉に当たる
//   ・**その部屋がまだメモリに載っていないと、同時の読み込みが重なる**
//     （server/index.jsのloadingRooms。重なり自体はあちらで潰してあるが、
//     わざわざ揃えて当てにいく理由も無い）
// ばらしておけば、どちらも起きにくくなる。待ちの長さの性質は変わらない
// （2秒→4秒→8秒→上限、がそれぞれ±25%の幅を持つだけ）。
function reconnectDelay(attempts, maxDelayMs) {
  const base = Math.min(RECONNECT_DELAY_MS * (2 ** attempts), maxDelayMs);
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

// --- サーバーを寝かせないための定期送信 ---
// タイマーの寿命を接続（transport）と揃える。持ち主が同じなので、幽霊タイマーも
// 多重起動も構造的に起きない。
function startKeepalive() {
  // P2P卓では張らない。ここでのtransport.sendはDataChannelでホストのタブへ行き、
  // **サーバーには1バイトも届かない**（js/net-transport-rtc.js）。起こしたい相手に
  // 届かないうえ、ホストのタブを4分おきに叩くだけになる。P2P卓でサーバーを起こす必要が
  // あるのはホスト役の側（控えを預ける口）だが、サーバーのENABLE_P2P_SIGNALINGは
  // 既定で閉じていて本番では誰も通らないため、いまは手当てしない。開けるときに
  // js/host-persistence.jsと一緒に考えること。
  if (isP2pMode()) return;

  stopKeepalive();
  keepaliveTimer = setInterval(() => {
    // 長く操作が無ければ、起こし続けずに畳む（KEEPALIVE_MAX_IDLE_MS）。
    if (Date.now() - lastLocalActionAt > KEEPALIVE_MAX_IDLE_MS) {
      suspend();
      return;
    }
    // 返事は期待しない。サーバー側も何も返さない（server/index.jsのPINGの受け口）。
    // 接続の生死はws.ping/pongが既に見ているので、ここで二重に持たない。
    transport?.send({ type: 'PING' });
  }, KEEPALIVE_INTERVAL_MS);
}

function stopKeepalive() {
  if (!keepaliveTimer) return;
  clearInterval(keepaliveTimer);
  keepaliveTimer = null;
}

// 繋ぎ直しを予約する。切れた理由ごとの判断（部屋一覧へ戻す等）は済んだ後で呼ぶこと。
function scheduleReconnect() {
  if (suspended || reconnectTimer) return;

  // **keepaliveを止めるだけでは足りない。** 止めればサーバーは15分後に寝るが、
  // その切断がここへ返ってきて繋ぎ直しが始まり、接続要求そのものが inbound traffic
  // として数えられて結局起こしてしまう。だから休止は繋ぎ直しの側でも見る。
  if (Date.now() - lastLocalActionAt > KEEPALIVE_MAX_IDLE_MS) {
    suspend();
    return;
  }

  const delayMs = reconnectDelay(reconnectAttempts, RECONNECT_MAX_DELAY_MS);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delayMs);
}

// 長い無操作で、接続ごと畳む。**サーバーに寝てもらうため**の仕掛けで、
// 画面を閉じたのと同じ状態まで戻す（KEEPALIVE_MAX_IDLE_MS）。
function suspend() {
  if (suspended) return;
  suspended = true;
  stopKeepalive();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  console.info('[net-sync] 長時間操作が無いため、接続を休止しました');

  // 口が開いていれば閉じる。閉じたことはhandleCloseへ返ってくるので、表示の切り替えは
  // そちらに任せる（既に切れていた場合だけ、ここで出す）。
  if (transport) transport.close();
  else EventBus.emit('NET_STATUS_CHANGED', 'idle');

  // 再開の合図は「この画面で何かした」こと。**新しいボタンは作らない**——押さなければ
  // 動かない仕掛けにすると、休止に気づかないまま操作して「反応しない」になる。
  document.addEventListener('pointerdown', resumeFromSuspend);
  document.addEventListener('keydown', resumeFromSuspend);
}

function resumeFromSuspend() {
  document.removeEventListener('pointerdown', resumeFromSuspend);
  document.removeEventListener('keydown', resumeFromSuspend);
  if (!suspended) return;
  suspended = false;
  reconnectAttempts = 0;
  lastLocalActionAt = Date.now();
  connect();
}

// 覚えている名乗りをサーバーへ送る。送れなければ何もしない：接続が開いたとき（open）と
// 部屋の中身を受け取ったとき（INIT）に必ず呼ぶので、そのどちらかで送り直される。
// 入室パスワードのある部屋では、照合が済むまでサーバーが名乗りを読み捨てる
// （server/index.jsの「認証前は他のメッセージを受け付けない」）ため、INIT側の呼び出しが要る。
function flushIdentify() {
  if (!identityToSend) return;
  // resumed: この読み込みで既に入室しているか（hasIdentifiedOnce）。権威はこれを見て
  // 繋ぎ直しの入室メッセージを省く。
  transport?.send({ type: 'IDENTIFY', ...identityToSend, resumed: hasIdentifiedOnce });
}

function connect() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  hasReceivedInit = false;

  // **古い接続からの知らせは捨てる。** closeは非同期に届くので、こちらから閉じた直後に
  // 次の接続を作ると、後から来た「古い方のclose」がhandleCloseへ入る。そこはtransportに
  // nullを代入するので、**作ったばかりの新しい接続への参照が消える**（画面は「接続済み」
  // なのに何も送れない、という形で黙って壊れる）。続けて繋ぎ直しも予約するため、
  // 接続が2本になる道も開く。
  //
  // 実際に踏むのは休止（suspend）からの再開で、閉じてから知らせが届くまでの数ミリ秒の
  // 間に画面を触った場合。狭いが、触らせて再開する作りである以上いつか当たる。
  // 世代を数えて、いま生きている接続からの知らせだけを通す。
  const generation = ++connectGeneration;
  const isCurrent = () => generation === connectGeneration;

  transport = createTransport({
    onOpen: () => { if (isCurrent()) handleOpen(); },
    onMessage: (message) => { if (isCurrent()) handleMessage(message); },
    onClose: (event) => { if (isCurrent()) handleClose(event); }
  });
}

function handleOpen() {
  EventBus.emit('NET_STATUS_CHANGED', 'connected');
  // 繋ぎ直したときの名乗り直し。名乗りは接続ごとなので、ここで送らないと
  // 名乗り直すまでの間、GM限定の操作が権威側に黙って断られ続ける。
  flushIdentify();
  // サーバーを寝かせないための定期送信を始める（KEEPALIVE_INTERVAL_MS）。
  // 入室パスワード待ちの間も送ることになるが、それでよい——サーバーは認証前のメッセージを
  // 読み捨てるものの、**Renderが数えるのはフレームがインスタンスへ届いたかどうか**なので、
  // 捨てられても目的は果たす。
  startKeepalive();
}

// 届いたメッセージ1件。信用しないJSONとして読むところまではトランスポート側が済ませている
// （js/net-transport.jsの契約）。
function handleMessage(message) {
  // 画像・音源の実体（P2P卓。js/asset-sync.js）。状態とは別の流れなので先に捌く。
  if (handleAssetMessage(message)) return;

  // 入室パスワードのある部屋。これを通すまでINITは届かない（server/index.js参照）。
  // P2P卓ではこの2つはここへ来ない——照合はシグナリングの口で済ませてある
  // （js/net-signaling.jsのonEntryPasswordRequired）。
  if (message.type === 'ENTRY_REQUIRED') {
    sendJoin(submitJoinOverTransport);
    return;
  }

  if (message.type === 'ENTRY_REJECTED') {
    askEntryPassword({ error: true, submit: submitJoinOverTransport });
    return;
  }

  if (message.type === 'INIT') {
    hasReceivedInit = true;
    // 繋ぎ直しの待ちを最初に戻す。**handleOpenではなくここ**なのが要点で、
    // 「開くがすぐ切られる」（混雑・不正な部屋）を繰り返す場合に開いた時点で戻すと、
    // 待ちが永久に2秒のままサーバーを叩き続ける。部屋の中身を受け取れて初めて
    // 「ちゃんと繋がった」と言える。
    reconnectAttempts = 0;
    // 入室できたので、パスワードを聞いたままの画面が残っていれば閉じる
    closeRoomEntryDialog();
    store.hydrate(message.state);
    // 覚えている名乗りをここでも送り直す。下のNET_INITIALIZEDでもjs/main.jsが名乗り直すが、
    // そちらは表示名からIDを導出し直す非同期の処理なので、届くまでのわずかな間だけ
    // 「画面は操作できるのにサーバーからは誰でもない」状態になってしまう。
    flushIdentify();
    // 状態が使っている画像・音源のうち、まだ持っていないものを取りに行く（P2P卓）。
    // 待たない：描画は進めてよく、実体が要るところはService Workerが到着を待つ（sw.js）。
    ensureAssetsFor(message.state);
    // サーバーの最新状態を受け取った直後にだけ行いたい処理（参加者としての名乗り等）の
    // きっかけ。INITより前にdispatchしても、このhydrateで上書きされてしまうため。
    EventBus.emit('NET_INITIALIZED', message.state);
    return;
  }

  // GM限定の操作をサーバーに断られたときの差し戻し。送信前に自分の画面へ先に反映して
  // いるため、これを受けて正しい状態へ戻す。INITと違い、名乗り直し等の初期化
  // （NET_INITIALIZED）は起こさない。
  if (message.type === 'RESYNC') {
    store.hydrate(message.state);
    ensureAssetsFor(message.state);
    return;
  }

  // 名乗りが通った。developerが立っていれば開発用の合言葉での名乗りで、GMでなくても
  // GMと同じ操作ができる（server/index.jsのisDeveloperToken）。画面の「押せる／押せない」に
  // 反映させるため、IDENTITY_CHANGEDで各所に描き直してもらう。
  if (message.type === 'IDENTITY_ACCEPTED') {
    // 以後の名乗りは「繋ぎ直し」として扱われる（hasIdentifiedOnce）。
    hasIdentifiedOnce = true;
    developerIdentity = !!message.developer;
    if (developerIdentity) console.info('[net-sync] 開発用の合言葉で名乗りました');
    // 購読側は誰が名乗っているかを自分で取り直すため、ここでは値を渡さない
    EventBus.emit('IDENTITY_CHANGED');
    return;
  }

  // 名乗りのトークンと参加者IDが対応していなかった場合。
  // 閲覧はできるが、GM限定の操作はゲスト同様に断られる。
  if (message.type === 'IDENTITY_REJECTED') {
    developerIdentity = false;
    console.warn('[net-sync] 参加者の名乗りが通りませんでした');
    EventBus.emit('IDENTITY_REJECTED');
    return;
  }

  // 記入中の参加者一覧。部屋の状態（ACTIONによる同期）とは別の揮発情報で、サーバーが
  // 権威を持って配ってくる（{id, name}の配列）。ここではそのまま上へ流すだけで、
  // 自分自身を除く等の描画判断はEventBus購読側（js/main.js）に委ねる。
  if (message.type === 'TYPING_USERS') {
    EventBus.emit('TYPING_USERS_CHANGED', message.users || []);
    return;
  }

  if (message.type === 'ACTION') {
    // チャット送信音。状態を変えない一回きりの通知なので、他のACTIONと違いlocalDispatchは
    // 通さない（game-store.jsのdispatchは未知のactionを黙って無視するだけだが、通す意味がない）。
    // URLはサーバーの環境変数CHAT_SEND_SOUND_URL由来で、このACTIONメッセージのpayloadだけで
    // 運ぶ（js/audio-player.js参照。入室音と同じ作り）。
    if (message.action === 'CHAT_SEND_SOUND') {
      if (message.payload?.chatSendSoundUrl) {
        playChatSendSound(message.payload.chatSendSoundUrl);
      }
      return;
    }

    // スタンプ。盤面に一定時間だけ出して消える合図で、状態にもログにも残さないので
    // CHAT_SEND_SOUNDと同じくlocalDispatchは通さない（js/stamp-layer.jsが描く）。
    if (message.action === 'SHOW_STAMP') {
      EventBus.emit('STAMP_RECEIVED', message.payload || {});
      return;
    }

    localDispatch(message.action, message.payload);
    // 他の人が足した画像・音源を取りに行く（P2P卓）。状態全体ではなくpayloadだけを見る——
    // 操作のたびに状態を丸ごと歩くとコマのドラッグで効いてくる。新しい参照が現れるのは
    // それを持ち込んだpayloadの中だけなので、これで取りこぼさない。
    ensureAssetsFor(message.payload);
    // 入室メッセージに合わせた入室音。URLはサーバーの環境変数ENTRY_SOUND_URL由来で、
    // 状態には載せずこのACTIONメッセージのpayloadだけで運ぶ（js/audio-player.js参照）。
    if (message.action === 'ADD_ENTRY_MESSAGE' && message.payload?.entrySoundUrl) {
      playEntrySound(message.payload.entrySoundUrl);
    }
  }
}

// 切れた。codeの意味はjs/net-transport.jsのCLOSE_CODES（WebRTC実装も同じ値を立てて返す）。
function handleClose({ code }) {
  transport = null;
  // 送り先が無くなったのでタイマーも畳む。ここで外さないと、部屋一覧へ戻す分岐
  // （ROOM_DELETED等）でページが残っている間だけ空振りし続ける。
  stopKeepalive();

  // 自分から休止したときの切断（suspend）。繋ぎ直さず、表示も「切断」ではなく休止にする。
  if (suspended) {
    EventBus.emit('NET_STATUS_CHANGED', 'idle');
    return;
  }

  EventBus.emit('NET_STATUS_CHANGED', 'disconnected');
  // 名乗りは接続ごと。切れた時点で開発用の権限も一旦落とす（再接続時に名乗り直す）
  developerIdentity = false;

  // 部屋が削除された場合は、途中まで参加していたかに関わらず再接続を試みても
  // 無駄なので部屋一覧へ案内する。
  if (code === CLOSE_CODES.ROOM_DELETED) {
    alert('この部屋は削除されました。部屋一覧へ戻ります。');
    window.location.href = '/';
    return;
  }

  // P2Pで開かれている卓へ、従来のWebSocketで入ろうとした。**付け忘れを黙って直す。**
  // 断らずに中身を渡すと、この人はサーバー権威の部屋、ホストは自分が権威の部屋に居る形で
  // 黙って2つのセッションに割れる（docs/p2p-migration-notes.mdの4-④）。共有された古いURLや
  // ブックマークで一番起きやすい経路なので、警告を出すより先に正しい入り方へ回す。
  // 入り直した先はP2Pの道を通るので、ここへ戻ってきて回り続けることはない。
  if (code === CLOSE_CODES.ROOM_IS_P2P) {
    const params = new URLSearchParams(location.search);
    params.set('net', 'rtc');
    window.location.search = params.toString();
    return;
  }

  // 入室パスワードを通らないまま切られた場合は、繋ぎ直して聞き直す（部屋は在る）。
  // ダイアログを開いたままにしておくと、再接続後のENTRY_REQUIREDで送信し直される。
  if (code === CLOSE_CODES.ENTRY_REJECTED) {
    setTimeout(connect, RECONNECT_DELAY_MS);
    return;
  }

  // 混んでいて入れなかった。繋ぎ直さずに部屋一覧へ戻す——ここで再接続に回すと、
  // 混雑が解けるまで数秒ごとに接続を張り直し続けることになり、混んでいるサーバーを
  // さらに叩く。空いたかどうかは部屋一覧の混雑状況を見て判断してもらう。
  if (code === CLOSE_CODES.TOO_MANY_ACTIVE_ROOMS || code === CLOSE_CODES.TOO_MANY_CONNECTIONS) {
    alert('いまサーバーが混み合っているため、この部屋に入れませんでした。'
      + '\n少し待ってから、部屋一覧の混雑状況を見てお試しください。');
    window.location.href = '/';
    return;
  }

  // 一度もINITを受け取れないまま、不正/未作成の部屋を理由に切断された場合は、
  // 再接続を試みても無駄なので部屋一覧へ案内する。
  if (!hasReceivedInit && (code === CLOSE_CODES.INVALID_ROOM || code === CLOSE_CODES.ROOM_NOT_FOUND)) {
    alert('この部屋には接続できませんでした（存在しないか、まだ作成されていません）。部屋一覧へ戻ります。');
    window.location.href = '/';
    return;
  }

  scheduleReconnect();
}

// 発言1件を後から指すための鍵。部屋の中で重複しなければよいので、参加者IDのような
// 導出はせず単なるランダム値でよい（crypto.randomUUIDが無い環境用の控えも用意する）。
function generateChatEntryId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// チャットの発言に、その1件を指す鍵（id）と発言者（ownerId）を刻む。
//
// 下のtimeと同じくaction発生源で1回だけ確定させる。ここでなくgame-store.js側で作ると、
// 各クライアントとサーバーがそれぞれ別のidを振ってしまい、編集の指し先が食い違う。
// 発言の入口はjs/main.jsのapplyLogだけでなくプラグインからの直接dispatchにもあるので
// （js/parameters/以下）、全部が通るこのラッパに置いて取りこぼしを無くす。
//
// idが必要なのは、配列の位置では発言を指せないため。楽観適用のせいで同時発言の並びは
// クライアント間でずれ得るので、位置で指すと他人の画面では別の発言を書き換えてしまう。
// ownerIdは「編集してよいのは本人とGMだけ」の判定に使う（js/room-authority.jsの
// canEditChatEntry）。表示名未設定（ゲスト）の場合はnullのままで、本人にも直せない。
function withStampedChatEntry(action, payload) {
  if (action !== 'ADD_CHAT_MESSAGE' || !payload?.entry) return payload;

  return {
    ...payload,
    entry: {
      ...payload.entry,
      id: payload.entry.id || generateChatEntryId(),
      ownerId: payload.entry.ownerId ?? getCurrentParticipantId()
    }
  };
}

// action発生源（＝dispatchのラッパ）で時刻を1回だけ確定させ、payload.timeとして乗せる。
// ローカル楽観適用（localDispatch）と送信の両方より前に確定させるので、送信者のローカル・
// 権威側の適用・他クライアントへの中継適用は全員この確定済みの値を見ることになり、
// 誰も自分の時計でDate.now()を呼び直さない（js/game-store.jsのwithChatEntry/withSystemLogが
// payload.timeを尊重する）。呼び出し側が渡したpayload自体は書き換えず、新しいオブジェクトを
// 作って使う（js/game-store.jsと同じく、渡された引数を破壊的に書き換えない流儀に揃える）。
// チャットの発言に刻むid・ownerIdも同じ理由でここで確定させる（withStampedChatEntry）。
function stampPayload(action, payload) {
  const time = Number.isFinite(payload?.time) ? payload.time : Date.now();
  return withStampedChatEntry(action, { ...(payload || {}), time });
}

export function initNetSync() {
  if (isP2pMode()) {
    startP2pSession();
    return;
  }

  store.dispatch = (action, payload) => {
    const stampedPayload = stampPayload(action, payload);
    // この画面の人が操作した証（KEEPALIVE_MAX_IDLE_MS）。権威から届いたアクションは
    // localDispatchを直接呼ぶのでここを通らず、他人の操作では更新されない。
    lastLocalActionAt = Date.now();
    localDispatch(action, stampedPayload);
    transport?.send({ type: 'ACTION', action, payload: stampedPayload });
  };

  connect();
}

// --- P2P卓（?net=rtc） ---
//
// 従来の卓と違い、繋ぐ前に「自分がホストか参加者か」が決まっていない。役割を決めるのは
// サーバーで（js/net-signaling.js）、資格（GM）と先着で1人だけがホストに選ばれる。
// 画面が自分で決めると、2人が同時にホストを名乗って同期経路が2つに割れる。
//
// 手順は3つ：名乗りを用意する → シグナリングで役割を貰う → 言われた役を組み立てる。
async function startP2pSession() {
  EventBus.emit('NET_STATUS_CHANGED', 'connecting');
  p2pAttempts += 1;

  // 名乗りを先に導出しておく。ホストの資格の判定はサーバーが名乗りで行うので、
  // シグナリングを開く時点で持っていないと、GMが自分の卓のホストになれない。
  // 導出元（この部屋で使う表示名）はjs/main.jsが後で使うものと同じ。
  const roomId = currentRoomId();
  const storedName = getStoredRoomName(roomId) || '';
  await activateRoomIdentity(roomId, storedName).catch(() => null);
  const participantId = getCurrentParticipantId();
  const authToken = getCurrentAuthToken();
  if (participantId && authToken) identityToSend = { participantId, authToken, name: storedName };

  // シグナリングは役割が決まってから相手を教えてくれるので、届いた合図の行き先は
  // 後から差し替える。役割が決まる前にSIGNAL_*が届くことはない（呼びかけはWELCOMEの後）。
  // 行き先はモジュール側に置く——ホストが口を繋ぎ直したとき、**同じホスト役のまま**
  // 新しい口へ差し替える必要があるため（reconnectHostSignaling）。
  routeSignal = null;
  routeHostReady = null;
  let seedState = null;

  let session;
  try {
    session = await openSignaling({
      identity: () => identityToSend,
      // 従来の卓のENTRY_REQUIRED / ENTRY_REJECTEDと同じ分け方をする。求められただけの
      // ときは覚えているパスワードで黙って通し（sendJoin）、断られたときだけ聞き直す。
      // ここを一緒くたに「聞く」にすると、毎回入力させることになる。
      onEntryPasswordRequired: ({ error, sendJoin: submit }) => (
        error ? askEntryPassword({ error: true, submit }) : sendJoin(submit)
      ),
      onSignal: (info) => routeSignal?.(info),
      onSeed: (state) => { seedState = state; },
      onHostReady: (id) => routeHostReady?.(id),
      onClose: () => handleSignalingClose()
    });
  } catch (error) {
    // P2P卓ではない部屋に ?net=rtc が付いていただけ。4010の裏返しで、こちらも
    // 黙って直す（フラグを外して入り直す）。
    if (error.code === 'NOT_P2P') {
      const params = new URLSearchParams(location.search);
      params.delete('net');
      window.location.search = params.toString();
      return;
    }
    handleP2pFailure(error.message);
    return;
  }

  signaling = session;
  closeRoomEntryDialog();

  if (session.role === 'host') {
    const hostRole = initAsHost(session, seedState);
    // ホストは呼ばれる側なので、来るのは参加者からのSDPとICE候補だけ。
    // 「ホストが現れた」の知らせ（SIGNAL_HOST_READY）は自分には来ない。
    routeSignal = ({ from, payload }) => hostRole.handleSignal(from, payload);
    return;
  }

  const guest = initAsP2pGuest(session);
  if (session.hostPeerId) p2pHostSeen = true;
  routeSignal = ({ payload }) => guest.handleSignal(payload);
  routeHostReady = (id) => {
    p2pHostSeen = true;
    guest.setHost(id);
  };
  // 呼びかけは行き先を決めてから始める。先に始めると、返事が届いたときに回す先がまだ
  // 決まっていない、という順番の穴が空く（いまは非同期のぶんで間に合っているだけ）。
  guest.start();
}

// シグナリングの口が切れた。**ホストのときだけ繋ぎ直す。**
//
// 【なぜホストだけか】参加者は口が切れても困らない——DataChannelが張れていれば同期は
// そちらを流れ、切れたときはhandleP2pCloseがセッションごとやり直す。困るのはホストで、
// この口が無いと、
//   ・控えをサーバーへ預けられない＝**その卓は以後まったく保存されない**
//   ・新しい参加者からの呼びかけが届かない＝**誰も入ってこられない**
// しかもDataChannelは生きているので画面は「接続済み」のまま。**黙って壊れる。**
// サーバーを1回再起動しただけでこの状態になることを実測した（デプロイのたびに起きる）。
//
// 【間隔】待ちは2秒から始めて倍にし、30秒で頭打ちにする。デプロイの入れ替わりは数十秒
// なので数回で戻るが、長い停止でも叩き続けない。
function handleSignalingClose() {
  console.warn('[net-sync] シグナリングの口が切れました');
  if (!host) return;                 // 参加者は放っておいてよい
  if (hostReconnectTimer) return;    // 予約済み
  const delayMs = reconnectDelay(hostReconnectAttempts, HOST_SIGNALING_MAX_DELAY_MS);
  hostReconnectAttempts += 1;
  hostReconnectTimer = setTimeout(() => {
    hostReconnectTimer = null;
    reconnectHostSignaling();
  }, delayMs);
}

// ホストのまま、シグナリングの口だけを張り直す。
//
// **ホスト役（js/net-host.js）は作り直さない。** 作り直すと繋がっている参加者との
// DataChannelが全部切れる——サーバーが再起動しただけで卓が中断するのでは本末転倒。
// 差し替えるのは口と、合図の行き先だけ。
async function reconnectHostSignaling() {
  if (!host) return;
  let session;
  try {
    session = await openSignaling({
      identity: () => identityToSend,
      onEntryPasswordRequired: ({ error, sendJoin: submit }) => (
        error ? askEntryPassword({ error: true, submit }) : sendJoin(submit)
      ),
      onSignal: (info) => routeSignal?.(info),
      onSeed: () => { /* 種は要らない。権威はこちらにあり、貰うと巻き戻る */ },
      onHostReady: (id) => routeHostReady?.(id),
      onClose: () => handleSignalingClose()
    });
  } catch (error) {
    console.warn('[net-sync] シグナリングを繋ぎ直せませんでした:', error.message);
    handleSignalingClose();
    return;
  }

  // **役を貰えたか必ず確かめる。** サーバーはホスト役を記録しているので（認証情報の
  // hostParticipantId）普通は自分に戻ってくるが、戻らなかった場合に黙って続けると
  // 「サーバーが認めていないホスト」になり、卓が2つに割れる。ここは塞ぐと決めた穴
  // （docs/p2p-migration-notes.mdの4-④）なので、続けずに知らせる。
  //
  // **ただし、すぐには諦めない。** 回線が一瞬切れただけの場合、サーバーはまだ古い接続の
  // 切断に気づいておらず、ホストの枠が埋まったままに見える（server/index.jsのhostTaken）。
  // ここで即座に「他人に移った」と言うと、実際には自分の席なのに追い出すことになる。
  // 数回試して、それでも戻らないときだけ本物の交代とみなす。
  if (session.role !== 'host') {
    session.close();
    if (hostReconnectAttempts < HOST_RECLAIM_TRIES) {
      console.warn('[net-sync] ホスト役の枠がまだ空いていません。少し待って試し直します');
      handleSignalingClose();
      return;
    }
    console.error('[net-sync] 繋ぎ直しでホスト役に戻れませんでした');
    alert('この部屋のホスト役が別の人に移りました。'
      + '\n\nこの画面は同期の中心ではなくなっているため、いまの内容は保存されません。'
      + '\n再読み込みしてください。');
    return;
  }

  signaling = session;
  hostReconnectAttempts = 0;
  // 控えの送り先も新しい口へ。**ここを忘れると繋ぎ直しても保存が戻らない。**
  host.setSignaling(session);
  console.info('[net-sync] シグナリングを繋ぎ直しました（ホスト役のまま）');
  // 溜まっているぶんを待たずに預ける。次の定期送信まで最大5分空くので、
  // 「繋がったのにしばらく保存されない」時間を作らない。
  hostPersistence?.flush();
}

// ホスト役として動く。この画面のstoreがそのまま部屋の権威になり、送り先は「繋がっている
// 参加者たち」になる。トランスポート（transport）は持たない——自分より上の権威が無いので、
// 送る相手が居ない。
//
// 【永続化が無い】このタブを閉じると部屋の状態は消える。Redisへの定期バックアップは
// 次の段（docs/p2p-migration-notes.md）。
function initAsHost(session, seedState) {
  console.info('[net-sync] ホスト役として動きます（この画面が部屋の権威になります）');

  host = startHost({
    signaling: session,
    applyRemote: localDispatch,
    // 「送り主を含む全員へ配る」ものを、自分の画面へも届ける口。サーバーが
    // broadcastToRoom(entry, null, …) としていた場面がこれに当たる。
    onLocal: handleMessage,
    self: () => ({
      participantId: identityToSend?.participantId ?? null,
      name: identityToSend?.name?.trim() || 'ゲスト'
    })
  });
  // 実体の置き場での役どころ。ホストは権威なので取りに行く先が無く、代わりに配る側になる。
  initAssetSync({ host: true, send: null });

  // 部屋の控えをサーバーへ預ける（js/host-persistence.js）。これが無いと、このタブを
  // 閉じた時点でその日の卓が消える。種と同じ内容は送り返さない。
  hostPersistence?.stop();
  hostPersistence = startHostPersistence({
    // **その時点の口**へ送る。sessionを直接掴むと、繋ぎ直した後も切れた口へ送り続けて
    // 「送れたつもりで1件も保存されない」状態になる（reconnectHostSignaling）。
    send: (message) => signaling?.sendToServer(message) ?? false,
    seedState
  });

  store.dispatch = (action, payload) => {
    const stampedPayload = stampPayload(action, payload);
    localDispatch(action, stampedPayload);
    host.broadcast({ type: 'ACTION', action, payload: stampedPayload });
  };

  // サーバーから貰った部屋の初期値。ここから先は自分が権威なので、以後サーバーの
  // 言うことは聞かない。
  if (seedState) {
    hasReceivedInit = true;
    store.hydrate(seedState);
    // 「ファイルから作ったP2P卓」の中身は、サーバーではなく部屋一覧ページから直接来る
    // （js/p2p-import-handoff.js）。サーバーに大きなボディを読ませないための回り道で、
    // 流し込むのは**種を敷いた後・画面を出す前**——先に敷かないと、この後のhydrateが
    // 補った既定値を取りこぼす。
    //
    // 状態は渡す側で既にadoptImportedStateを通してある（参加者一覧は空）。この時点の
    // 部屋にもまだ誰も居ないので、ここで通し直しても結果は変わらない。
    const pending = takePendingImport(currentRoomId());
    if (pending) {
      console.info('[net-sync] ファイルから読み込んだ内容をこの部屋へ流し込みます');
      store.hydrate(pending);
    }
    EventBus.emit('NET_STATUS_CHANGED', 'connected');
    // 参加者としての名乗り等のきっかけ。ゲストのINIT受信時と同じ役割（js/main.jsが待っている）。
    EventBus.emit('NET_INITIALIZED', store.state);
    // 取り込んだファイル由来のデータURLをこのブラウザの実体へ移す（サーバーの
    // adoptStateMediaに当たる）。**先に画面を出してから**行う——数MBの読み替えで
    // 入室が待たされるより、絵が後から差し替わる方がよい。
    adoptLocalMedia();
  }

  return host;
}

// いまの状態に埋まっているデータURLを実体へ移し替える。ホストになった直後（種）と、
// GM自身がファイルを読み込んだ直後（replaceState）の両方から呼ぶ。
//
// 移したぶんは状態が軽くなり、控えとしてサーバーへ送る量もそのぶん減る
// （js/host-persistence.js）。**軽くしないと控えが上限を超えて捨てられる**ので、
// これは表示の都合ではなく永続化の前提。ゲストが送ってきたぶんは権威側でも同じことを
// する（js/net-host.jsのadoptReplacedMedia）。
async function adoptLocalMedia() {
  try {
    const { state, adopted } = await adoptDataUrlsInState(store.state);
    if (adopted === 0) return;
    console.info(`[net-sync] 取り込み済みの画像${adopted}件をこのブラウザの持ち物にしました`);
    store.hydrate(state);
    // 既に繋がっている参加者へ配り直す（この時点では普通まだ誰も居ない）
    host?.broadcast({ type: 'INIT', state: store.state });
  } catch (error) {
    console.warn('[net-sync] 取り込み済みの画像を引き取れませんでした:', error.message);
  }
}

// 参加者として動く。ホストのタブとDataChannelを1本張り、以後の同期はそこだけを流れる。
function initAsP2pGuest(session) {
  console.info('[net-sync] 参加者として動きます（同期はホストのタブを通ります）');

  store.dispatch = (action, payload) => {
    const stampedPayload = stampPayload(action, payload);
    localDispatch(action, stampedPayload);
    transport?.send({ type: 'ACTION', action, payload: stampedPayload });
  };

  hasReceivedInit = false;
  transport = createRtcGuestTransport({
    signaling: session,
    onOpen: () => {
      p2pEverConnected = true;
      handleOpen();
    },
    onMessage: handleMessage,
    onClose: handleP2pClose
  });
  // 実体はホストから貰い、自分が上げたものはホストへ渡す（js/asset-sync.js）。
  initAssetSync({ host: false, send: (message) => transport?.send(message) ?? false });
  return transport;
}

// P2P卓で道が切れた。**WebSocketへは落ちない。** 落ちるとホストは自分が権威のまま、
// 落ちた人はサーバー権威の部屋に居る形で黙って2つに割れる（docs/p2p-migration-notes.mdの
// 4-④）。ホストが繋ぎ直している最中のこともあるので、一度でも繋がった相手なら待って
// やり直し、一度も繋がっていないなら理由を伝えて部屋一覧へ戻す。
function handleP2pClose({ code }) {
  transport = null;
  signaling?.close();
  signaling = null;
  EventBus.emit('NET_STATUS_CHANGED', 'disconnected');
  developerIdentity = false;

  if (code === CLOSE_CODES.ROOM_DELETED) {
    alert('この部屋は削除されました。部屋一覧へ戻ります。');
    window.location.href = '/';
    return;
  }

  // この読み込みの間、一度もホストと繋がれていない。黙って待たせず、はっきり断る。
  // 一度でも繋がったことがあるなら、ホストが繋ぎ直している最中かもしれないので待って
  // やり直す（GMのリロードで全員が追い出されないように）。
  //
  // 理由は2つに分ける。症状はどちらも「入れない」で同じだが、打つ手が正反対になる：
  // ホストが居ないならGMを待てばよく、居るのに張れないなら回線の問題で待っても直らない
  // （TURNを用意していないため。docs/p2p-migration-notes.mdの5-2）。
  if (!p2pEverConnected && p2pAttempts >= 2) {
    handleP2pFailure(p2pHostSeen
      ? 'お使いの回線からホストと直接繋がりませんでした'
      : 'この部屋のGMがまだ入室していません');
    return;
  }

  setTimeout(startP2pSession, RECONNECT_DELAY_MS);
}

// P2P卓に入れなかった。理由を必ず見せる——**この卓では「黙って同期しない」を作らない**
// のが今回の設計の要（docs/p2p-migration-notes.mdの4-④）。
function handleP2pFailure(reason) {
  console.warn('[net-sync] P2P卓に入れませんでした:', reason);
  alert(`この部屋はP2P（参加者どうしの直接通信）で開かれていますが、入れませんでした。\n\n理由: ${reason}\n\n部屋一覧へ戻ります。`);
  window.location.href = '/';
}

// この接続での名乗りをサーバーへ伝える。表示名から導出した公開ID（participantId）と、
// 状態には載せない名乗り用の値（authToken）を送る。サーバーはこの2つを突き合わせて
// 「そのIDを名乗ってよいか」を判断し、GM限定の操作の可否に使う（server/index.jsのverifyIdentity）。
// 接続が切れるとサーバーは忘れるので、値はidentityToSendに覚えておき、繋がるたび
// （open・INIT）にflushIdentifyで送り直す。まだ繋がっていない間に呼ばれても取りこぼさない。
// nameは入室メッセージ用のニックネーム（サーバーは状態を持たないため、名乗りのたびに渡す）。
//
// ホスト役のときは送り先が無いので、flushIdentifyは空振りする（transportがnull）。
// それでよい：自分の名乗りを自分で検算しても意味が無く、画面の描き直しに要る
// IDENTITY_CHANGEDはjs/main.js側が既に撃っている。developerIdentityがfalseのままなのも
// 正しい——開発用の合言葉はサーバーの環境変数で、ホストには判定材料が無い。
export function sendIdentify(participantId, authToken, name) {
  // 名乗り直しの結果が返るまでは、前の名乗りで得た権限を持ち越さない
  developerIdentity = false;
  // 名前なし（ゲスト参加）への切り替え。覚えていた名乗りも捨てる：残しておくと、
  // 次に繋ぎ直したときに前の人として名乗り直してしまう。
  identityToSend = (participantId && authToken) ? { participantId, authToken, name } : null;
  flushIdentify();
  // **ホストは名乗りをサーバーへも伝える。** 伝えないと、サーバーは「誰がホスト役か」を
  // 記録できない（server/index.jsのpinHostParticipant）。記録が無いと、サーバーを
  // 再起動したときに他の人がホスト役を取れてしまい、卓が2つに割れる。
  //
  // 部屋を開いてから表示名を入れるのが普通の順番なので、**ここを通さないとほぼ毎回
  // 記録されない**。シグナリングを開いた時点ではまだ名乗りが空だったため。
  if (host && identityToSend) signaling?.sendToServer({ type: 'IDENTIFY', ...identityToSend });
  // ホスト役のときは、自分の入室メッセージを出す相手も自分しかいない。サーバー権威の
  // 部屋では名乗った本人にも出るので、そこに揃える（js/net-host.jsのannounceSelf）。
  host?.announceSelf();
}

// --- 権威へ送る揮発的な要求 ---
//
// どれも状態を変えず、権威が「送り主を含む全員」へ配り直す種類の通知。
// **ホスト役のときは送り先が無い**（transportがnull）ので、権威である自分に直接頼む。
// ここを分けそこねると、GMが押したスタンプが自分にも他人にも出ない・GMの入力が
// 「記入中」に出ない、という形で静かに壊れる（サーバーには無い、ホスト権威特有の分岐）。

// 素のチャット発言（コマンドとして処理されなかった入力）が送信されたときに呼ぶ。URLの決定は
// サーバー任せ（環境変数CHAT_SEND_SOUND_URL）で、ここでは要求を送るだけ。どの発言が「素」かの
// 判断はjs/main.jsのsubmitChatText側が持つ。権威は送信者を含む部屋の全員にACTION
// （action: 'CHAT_SEND_SOUND'）で配り直す（上のACTIONハンドラ参照）。
export function requestChatSendSound() {
  if (host) {
    host.requestChatSendSound();
    return;
  }
  transport?.send({ type: 'REQUEST_CHAT_SEND_SOUND' });
}

// スタンプを送る。requestChatSendSoundと同じ揮発メッセージで、状態もログも変えない。
// 送るのはIDだけ（画像URLも表示名も権威／受け手側が決める。js/stamp-catalog.js冒頭参照）。
// 名乗っていない場合は権威が黙って捨てるので、押せないようにするのは画面側の仕事。
export function sendStamp(stampId) {
  if (host) {
    host.sendStamp(stampId);
    return;
  }
  transport?.send({ type: 'SEND_STAMP', stampId });
}

// 部屋の削除を要求する。サーバー側は自分を含む全クライアントを退室させ、その場で実データを
// 消す（切断の完了は待たない。server/index.jsのstartRoomDeletion）。
// 結果は各クライアントの切断（CLOSE_CODES.ROOM_DELETED）で通知される。
//
// P2P卓でもRedisとR2を消せるのはサーバーだけなので、ホストはシグナリングの口で頼み、
// 参加者には理由を付けて切ってもらう（js/net-host.jsのdeleteRoom）。
export function requestRoomDeletion() {
  if (host) {
    host.requestRoomDeletion();
    return;
  }
  transport?.send({ type: 'DELETE_ROOM' });
}

// メイン入力欄が空→非空になった瞬間に呼ぶ。「記入中」を要求を送るだけの揮発的な通知で、
// requestChatSendSoundと同じ流儀（状態は変えず、権威へ要求を送るのみ）。
export function sendTypingStart() {
  if (host) {
    host.setOwnTyping(true);
    return;
  }
  transport?.send({ type: 'TYPING_START' });
}

// メイン入力欄が非空→空になった瞬間に呼ぶ（sendTypingStartの対）。
export function sendTypingStop() {
  if (host) {
    host.setOwnTyping(false);
    return;
  }
  transport?.send({ type: 'TYPING_STOP' });
}

// ファイルから読み込んだ状態などで、ローカル・サーバー・他クライアントの状態をまるごと
// 置き換える。ローカルには即座に反映し、サーバーには別途通知して他クライアントにも
// ブロードキャストしてもらう（ADD_CHAT_MESSAGE等の通常アクションとは別経路）。
export function replaceState(newState) {
  // 取り込みは必ずadoptImportedStateを通す（js/state-import.js）。今の部屋の参加者一覧を
  // 引き継がないと、読み込んだ本人がその場でGM権限を失う。サーバー側も同じ関数を通すが、
  // ここで通しておかないと、送り返されるINITが届くまでの間だけ画面が食い違う。
  // myBackyardOwnerId：ファイルに記録された「保存した利用者のバックヤードのコマ」を、
  // 読み込んだこの利用者の棚へ付け替えるための宛先。表示名未設定などで参加者IDが
  // 取れない場合は、listMyBackyardTokens（js/character-panel.js）のownerId不在時と同じ
  // 判定基準に合わせるため、ブラウザ単位のIDをmyBackyardOwnerLocalIdとして渡す。
  const adopted = adoptImportedState(newState, {
    participants: store.state.participants,
    myBackyardOwnerId: getCurrentParticipantId(),
    myBackyardOwnerLocalId: getLocalUserId()
  });
  store.hydrate(adopted);

  // ホスト役のときは自分が権威なので、送るのではなく配る。
  if (host) {
    host.broadcast({ type: 'INIT', state: store.state });
    // 読み込んだファイルに混ざっている画像をこのブラウザの実体へ移す（サーバー側の
    // adoptStateMediaに当たる）。配ってから行い、移し終えたらもう一度配り直す。
    adoptLocalMedia();
    return;
  }

  transport?.send({ type: 'REPLACE_STATE', state: adopted });
}
