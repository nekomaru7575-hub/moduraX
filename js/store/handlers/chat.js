// js/store/handlers/chat.js
// チャットのタブとログ。
//
// 誰が編集してよいかはここでは見ない：画面側（js/room-authority.js の canEditChatEntry）が
// 本人とGMだけに絞る。コマの所有者チェックや情報の編集と同じ姿勢で、サーバーも強制しない。

import { EventBus } from '../../EventBus.js';
import {
  MAIN_CHAT_TAB_ID, SYSTEM_CHAT_TAB_ID, withChatEntry, withSystemLog, withSystemTabLog
} from '../chat.js';
import { normalizeAudience, withMapEntry, withoutMapEntry } from '../patch.js';
import { showsEntryMessages } from '../room.js';

export const CHAT_HANDLERS = {
  // 入室メッセージ本体の追加。identify（名乗り）完了時にサーバーだけがdispatchする
  // （server/index.jsのIDENTIFYメッセージ処理）。フラグが無効な部屋では何もしない。
  // 名前は他人が自由に設定できるニックネームだが、ここではエスケープしない。
  // 表示側（main.jsのbuildLogHtml）が発言本文をエスケープしてから挿入するので、
  // ここでも掛けると画面に &lt; がそのまま出てしまう。エスケープは表示する側の仕事。
  ADD_ENTRY_MESSAGE({ prevState, payload, commit }) {
    if (!showsEntryMessages(prevState)) return;
    const name = (typeof payload?.name === 'string' && payload.name.trim()) || 'ゲスト';

    commit({
      chatLogs: withSystemTabLog(prevState.chatLogs, `${name}が入室しました。`, payload?.time)
    });
  },

  // チャットタブを1つ追加する。idは呼び出し側（main.js）がタイムスタンプ等で生成する。
  // audienceは公開先（null＝全員、配列＝その参加者だけ。js/visibility.js参照）。
  ADD_CHAT_TAB({ prevState, payload, commit }) {
    const { id, name, audience = null } = payload;
    if (!id || !name) return;
    if (prevState.chatTabs.some(tab => tab.id === id)) return;

    commit({
      chatTabs: [...prevState.chatTabs, Object.freeze({ id, name, audience: normalizeAudience(audience) })],
      chatLogs: withMapEntry(prevState.chatLogs, id, Object.freeze([]))
    });
  },

  // 既存タブの公開先を変える（メンバーの追加・削除、限定公開↔全員公開の切り替え）。
  // 固定タブ（Main・システム）は常に全員向けのまま：withSystemLogが宛先を選ばずに
  // 流し込む設計なので、限定公開にすると通知が一部の人にしか届かなくなる。
  SET_CHAT_TAB_AUDIENCE({ prevState, payload, commit }) {
    const { id, audience } = payload;
    if (id === MAIN_CHAT_TAB_ID || id === SYSTEM_CHAT_TAB_ID) return;
    if (!prevState.chatTabs.some(tab => tab.id === id)) return;

    commit({
      chatTabs: prevState.chatTabs.map(tab => (
        tab.id === id ? Object.freeze({ ...tab, audience: normalizeAudience(audience) }) : tab
      ))
    });
  },

  // 既存タブの名前を変える。追加・公開先変更と同じく、誰でも呼べる（GM限定にしていない）。
  // システムタブだけは名前も固定：役割が決まっている置き場で、名前を変えられると
  // 「システム発言はどこへ行ったのか」が分からなくなる（Mainの名前変更は従来どおり可）。
  RENAME_CHAT_TAB({ prevState, payload, commit }) {
    const { id, name } = payload;
    if (!id || !name) return;
    if (id === SYSTEM_CHAT_TAB_ID) return;
    if (!prevState.chatTabs.some(tab => tab.id === id)) return;

    commit({
      chatTabs: prevState.chatTabs.map(tab => (
        tab.id === id ? Object.freeze({ ...tab, name }) : tab
      ))
    });
  },

  // チャットタブを削除する。固定タブ（Main・システム）は常に存在する前提なので削除できない。
  // タブに紐づくログ（chatLogs）も一緒に消す。表示中タブが消えた場合の切り替えは
  // 呼び出し側（js/main.jsのensureActiveTabVisible、STATE_CHANGED購読で自動的に走る）に任せる。
  REMOVE_CHAT_TAB({ prevState, payload, commit }) {
    const { id } = payload;
    if (!id || id === MAIN_CHAT_TAB_ID || id === SYSTEM_CHAT_TAB_ID) return;
    if (!prevState.chatTabs.some(tab => tab.id === id)) return;

    commit({
      chatTabs: prevState.chatTabs.filter(tab => tab.id !== id),
      chatLogs: withoutMapEntry(prevState.chatLogs, id)
    });
  },

  // 指定タブのログにメッセージを1件追加する。存在しないタブIDは無視する。
  ADD_CHAT_MESSAGE({ prevState, payload, commit }) {
    const { tabId, entry } = payload;
    if (!tabId || !entry || !prevState.chatLogs[tabId]) return;

    commit({ chatLogs: withChatEntry(prevState.chatLogs, tabId, entry, payload.time) });
  },

  // 既に流れた発言の本文を書き直す（誤字の直し）。誰が編集してよいかはここでは見ない：
  // 画面側（js/room-authority.jsのcanEditChatEntry）が本人とGMだけに絞る。コマの所有者
  // チェック（canOperateToken）や情報の編集（js/info-panel.jsのcanEditEntry）と同じ姿勢で、
  // サーバー（server/index.js）も強制しない。
  //
  // 書き換わるのは本文（resultText）だけ。キャラ名・色・コマンド・出目内訳・発言時刻は
  // 元のまま残るので、「誰がいつ何を振ったか」は編集では消せない。
  // 指し先はidのみ。配列の位置で指すと、楽観適用で並びがずれた画面では別の発言に当たる。
  // idを持たない発言（この機能より前の過去ログ、システム発言、サーバー発の入室メッセージ）は
  // 一致するものが無いので、そのまま何も起こらない。
  EDIT_CHAT_MESSAGE({ prevState, payload, commit }) {
    const { tabId, entryId, resultText } = payload;
    if (!tabId || !entryId || typeof resultText !== 'string') return;

    const entries = prevState.chatLogs[tabId];
    if (!entries) return;

    const index = entries.findIndex(entry => entry.id === entryId);
    if (index < 0) return;

    // editedAtは「編集済み」の印を出すためだけの値（表示はjs/main.jsのbuildLogHtml）。
    // timeの扱いはwithChatEntryと同じで、payload.timeがあればそれを使う。
    const edited = Object.freeze({
      ...entries[index],
      resultText,
      editedAt: Number.isFinite(payload.time) ? payload.time : Date.now()
    });

    commit({
      chatLogs: withMapEntry(
        prevState.chatLogs, tabId,
        Object.freeze(entries.map((entry, i) => (i === index ? edited : entry)))
      )
    });
  },

  // 3Dダイスを転がす合図（js/dice-animation.jsが購読）。状態は一切変えず、通知だけを行う。
  // 出目をチャットログのエントリに持たせなかったのは、部屋のJSONへ永続化されてしまい、
  // 再接続時のhydrateで過去のロールが一斉に転がり出すため。状態を変えないので
  // サーバー側のstore（server/index.js）でも素通りし、そのまま他クライアントへ中継される。
  ROLL_DICE_ANIMATION({ payload }) {
    EventBus.emit('DICE_ROLLED', payload);
  },

  // 全タブのログを消す（GM限定。js/main.jsのルームメニュー「ログを消去」から）。
  // タブそのもの（chatTabs・公開先）は残し、中身だけを空にする。
  // 他の人から見ると前触れなくログが消えるので、Mainタブに理由を1行だけ残す。
  CLEAR_ALL_CHAT_LOGS({ prevState, payload, commit }) {
    const emptied = Object.freeze(Object.fromEntries(
      Object.keys(prevState.chatLogs).map(tabId => [tabId, Object.freeze([])])
    ));

    commit({
      chatLogs: withSystemLog(emptied, 'ログを消去しました。', payload?.time)
    });
  },
};