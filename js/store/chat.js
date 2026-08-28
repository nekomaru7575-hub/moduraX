// js/store/chat.js
// チャットタブとログへの追記。
//
// ログへ入る経路は必ず withChatEntry を通る。時刻は呼び出し側が payload.time から渡す
// （そこを1か所に確定させてあるので、送信者のローカル適用・サーバーの権威適用・
// 他クライアントへの中継適用のどこで通っても同じ時刻になる。withChatEntry のコメント参照）。

import { AUDIO_CHANNEL_LABELS } from './audio.js';
import { withMapEntry } from './patch.js';

// 既定のチャットタブ。人が喋る場所で、タブ列の先頭に常に存在する。
export const MAIN_CHAT_TAB_ID = 'main';

// システム発言のうち「読み流してよい事務連絡」を集める固定タブ（withSystemTabLog参照）。
// 入室・フェーズ終了に伴うバフ消滅・BGMの切り替えだけをここへ流す：どれも卓の流れとは
// 独立していて、Mainに挟まると盤面下のカレントチャット欄（Mainの最新1件だけを映す）が
// 埋まり、直前の台詞が読めなくなるため。
//
// ラウンド進行・シーン開始・ログ消去は卓の流れとして読むものなのでMainに残す
// （withSystemLog）。どちらへ出すかは経路ごとに選ぶので、迷ったらMain側が既定。
// Mainと同じく常に存在し、削除・公開先変更・名前変更はできない（それぞれのcaseで弾く）。
export const SYSTEM_CHAT_TAB_ID = 'system';
export const SYSTEM_CHAT_TAB_NAME = 'システム';

// 固定タブ（Main・システム）と、その空ログを必ず用意した chatTabs / chatLogs を返す。
// システムタブより前に保存された部屋にはタブ自体が無いので、読み込み時にここで足す
// （足さないと、システム発言の宛先が存在しないままADD_CHAT_MESSAGEに弾かれて消える）。
// 既にMainへ流れ終わった過去のシステム発言は動かさない（履歴は履歴のまま残す）。
// 並びはMainの直後。UI上は固定位置に出す（js/main.jsのrenderChatTabs）ので表示位置には
// 効かないが、ログの保存ダイアログ等はこの配列順で並べるため、人のタブより前に置く。
export function withFixedChatTabs(chatTabs, chatLogs) {
  let tabs = Array.isArray(chatTabs) ? chatTabs.filter(tab => tab && typeof tab.id === 'string') : [];

  if (!tabs.some(tab => tab.id === MAIN_CHAT_TAB_ID)) {
    tabs = [Object.freeze({ id: MAIN_CHAT_TAB_ID, name: 'Main' }), ...tabs];
  }
  const systemTab = Object.freeze({ id: SYSTEM_CHAT_TAB_ID, name: SYSTEM_CHAT_TAB_NAME, audience: null });
  if (tabs.some(tab => tab.id === SYSTEM_CHAT_TAB_ID)) {
    // 既にある場合も名前・公開先はここで固定値へ揃える。取り込んだ部屋データ（信用しないJSON）に
    // 限定公開のシステムタブが入っていると、進行の通知が一部の人にしか届かなくなるため。
    tabs = tabs.map(tab => (tab.id === SYSTEM_CHAT_TAB_ID ? systemTab : tab));
  } else {
    const mainIndex = tabs.findIndex(tab => tab.id === MAIN_CHAT_TAB_ID);
    tabs = [...tabs.slice(0, mainIndex + 1), systemTab, ...tabs.slice(mainIndex + 1)];
  }

  const logs = { ...(chatLogs || {}) };
  tabs.forEach(tab => {
    if (!Array.isArray(logs[tab.id])) logs[tab.id] = [];
  });

  return { chatTabs: tabs, chatLogs: logs };
}

// BGMが切り替わったことをシステムタブへ1行残す（曲名、またはnextTrackId:nullで「停止」）。
// 音楽ダイアログの再生・停止ボタン、再生フレーズ、シーン遷移のどれで変わっても同じ1行になるよう、
// 経路ごとではなく「BGMの再生状態が変わったdispatch」の側から呼ぶ。
// 同じ曲を鳴らし直しただけ（playIdだけが変わる）のときは呼び出し側が呼ばない。
// 効果音はここでは扱わない：台詞に添えて鳴らすものなので、鳴らした人のタブへそのまま出す
// （js/main.jsのtriggerAudioPhrase）。
export function withBgmLog(chatLogs, tracks, nextTrackId, time) {
  const text = nextTrackId
    ? `♪ ${AUDIO_CHANNEL_LABELS.bgm}: ${tracks?.[nextTrackId]?.name || '不明な音源'}`
    : `♪ ${AUDIO_CHANNEL_LABELS.bgm}を止めました。`;
  return withSystemTabLog(chatLogs, text, time);
}

// 指定タブのログへ1件追記した新しいchatLogsを返す。チャットログへ入る経路は全てここを通る
// （ADD_CHAT_MESSAGE・withSystemLog経由の各種システムログ）。
//
// timeは呼び出し側（dispatchのcase分岐）がpayload.timeから渡す値。js/net-sync.jsのdispatch
// ラッパが、送信者のローカル楽観適用・サーバーへの送信の両方より前にpayload.timeを一度だけ
// 確定させているため、送信者のローカル適用・サーバーの権威適用・他クライアントへの中継適用の
// どこでこの関数が呼ばれても、同じactionのpayloadが運ぶ同じ値をここで受け取ることになり、
// 参加者・サーバー全員で同じ時刻になる（entry自体やpayloadを書き換えて後段へ引き継ぐような
// 副作用には頼らない。game-store.jsは状態遷移ロジックだけを持つ純粋なモジュールとして保つ）。
// timeが渡されない（=confirmed値が無い）場合だけ、ここで一度Date.now()を補う。
export function withChatEntry(chatLogs, tabId, entry, time) {
  const finalTime = Number.isFinite(time) ? time : Date.now();
  const nextEntries = Object.freeze([...(chatLogs[tabId] || []), Object.freeze({ ...entry, time: finalTime })]);
  return withMapEntry(chatLogs, tabId, nextEntries);
}

// システム発言（発言者が「システム」の1行）を指定タブへ1件追記する。
// EventBus経由の副作用にすると、同期される全クライアントでそれぞれ「受信→追記dispatch→
// 再送信」が走ってクライアント数だけログが重複するため、1回のdispatchで完結させている。
// timeはwithChatEntryと同じ扱い（呼び出し側のpayload.timeをそのまま渡す）。
export function withSystemLogIn(chatLogs, tabId, text, time) {
  return withChatEntry(chatLogs, tabId, { system: SYSTEM_CHAT_TAB_NAME, resultText: text }, time);
}

// Mainタブへ出すシステム発言。ラウンド進行・シーン開始・ログ消去など、
// 卓の流れとしてその場で読むもの。システム発言の既定の宛先はこちら。
export function withSystemLog(chatLogs, text, time) {
  return withSystemLogIn(chatLogs, MAIN_CHAT_TAB_ID, text, time);
}

// システムタブへ出すシステム発言。入室・フェーズ終了に伴うバフ消滅・BGMの切り替えなど、
// 後から辿れれば十分で、卓の流れに挟まると邪魔になるもの（SYSTEM_CHAT_TAB_ID参照）。
export function withSystemTabLog(chatLogs, text, time) {
  return withSystemLogIn(chatLogs, SYSTEM_CHAT_TAB_ID, text, time);
}
