// js/bcdice-catalog.js
// BCDiceの「システム一覧」と「システム情報（command_pattern / help_message）」を
// 取得するクライアント共通モジュール。一覧はシステム選択欄の中身に、システム情報は
// チャット入力がダイスコマンドかどうかの判定とルーム設定のヘルプ表示に使う。
//
// 取得先はBCDice本体（bcdice.onlinesession.app）へ直接。BCDice APIはCORSを許可している
// ので、ブラウザから直接叩ける（js/BCdice.jsのrollBCDiceが以前からそうしている）。
// 直接叩けない場合だけ、自サーバーの中継 /api/bcdice/*（Redisで既定30日キャッシュ）へ回る。
//
// 【この順序にした理由】以前は逆で、自サーバーを一次・BCDice本体を控えにしていた。
// /api/bcdice/* はCORS回避のための中継ではなく、キャッシュと堅牢化のための中継なので、
// 「自サーバーが無いと一覧が出ない」必然性は無い。P2P化の検討（docs/p2p-migration-notes.md）
// でサーバー依存を1本ずつ剥がしていくにあたり、剥がせるものとして先に入れ替えた。
// 中継側は消していない：Upstashの帯域を食わずに済む利点は今も効くので、直接叩きが
// 通らなかったとき（BCDice本体の障害・回線の都合）の控えとして残す。
//
// 同じデータを何度も取りに行かないよう、Promiseの単位でメモ化する。

const BCDICE_BASE_URL = 'https://bcdice.onlinesession.app';

let systemsPromise = null;
const infoPromises = new Map();
// systemId -> RegExp | null（nullは「取得できなかった」。取得できなかったことも覚えて再試行を防ぐ）
const compiledPatterns = new Map();

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * BCDiceのシステム一覧を取得する。結果はページ内で使い回す（複数のselectがあっても1回だけ）。
 * @returns {Promise<Array<{id: string, name: string}>>} BCDice側の並び順（読み仮名順）のまま
 */
export function fetchGameSystems() {
  if (!systemsPromise) {
    systemsPromise = (async () => {
      try {
        const data = await fetchJson(`${BCDICE_BASE_URL}/v2/game_system`);
        // BCDice本体は1件あたりsort_key等も返すが、こちらで使うのはidとnameだけ。
        // 中継（下）が返す形もこの2つに揃えてあるので、呼び出し側は違いを見なくてよい。
        return (data.game_system || []).map(({ id, name }) => ({ id, name }));
      } catch (error) {
        console.warn('[bcdice] BCDice本体からのシステム一覧取得に失敗しました:', error.message);
        const data = await fetchJson('/api/bcdice/game_system');
        return data.systems || [];
      }
    })().catch((error) => {
      // 失敗したPromiseを握り続けると再試行できなくなるので、次回は取り直せるようにする
      systemsPromise = null;
      throw error;
    });
  }
  return systemsPromise;
}

/**
 * 指定システムのcommand_pattern・help_messageを取得する。
 * @param {string} systemId
 * @returns {Promise<{id: string, name: string, commandPattern: string, helpMessage: string}>}
 */
export function fetchGameSystemInfo(systemId) {
  if (!infoPromises.has(systemId)) {
    const promise = (async () => {
      try {
        const data = await fetchJson(`${BCDICE_BASE_URL}/v2/game_system/${encodeURIComponent(systemId)}`);
        // BCDice本体のスネークケースを、このアプリで使う名前へ寄せる。
        // 中継（下）は同じ変換を済ませた形で返してくるので、ここだけの仕事になる。
        return {
          id: data.id,
          name: data.name,
          commandPattern: data.command_pattern,
          helpMessage: data.help_message
        };
      } catch (error) {
        console.warn(`[bcdice] BCDice本体からのシステム情報取得に失敗しました (${systemId}):`, error.message);
        return await fetchJson(`/api/bcdice/game_system/${encodeURIComponent(systemId)}`);
      }
    })().catch((error) => {
      infoPromises.delete(systemId);
      throw error;
    });
    infoPromises.set(systemId, promise);
  }
  return infoPromises.get(systemId);
}

/**
 * 指定システムのコマンド判定用の正規表現を返す。取得に失敗した場合はnull
 * （呼び出し側は従来の文字種による簡易判定へフォールバックする）。
 * BCDiceのcommand_patternは大文字小文字が混在した表記のため、必ずiフラグ付きで使う。
 * @param {string} systemId
 * @returns {Promise<RegExp|null>}
 */
export async function getCommandPattern(systemId) {
  if (compiledPatterns.has(systemId)) return compiledPatterns.get(systemId);

  let compiled = null;
  try {
    const { commandPattern } = await fetchGameSystemInfo(systemId);
    if (commandPattern) compiled = new RegExp(commandPattern, 'i');
  } catch (error) {
    console.warn(`[bcdice] コマンド判定用の正規表現を用意できませんでした (${systemId}):`, error.message);
  }

  compiledPatterns.set(systemId, compiled);
  return compiled;
}

/**
 * 指定システムの情報をあらかじめ取りに行く（結果は待たない）。システムが決まった／
 * 変わったタイミングで呼び、実際に判定やヘルプ表示が必要になった時点では
 * メモ化済みの結果を即座に使えるようにするためのもの。
 * @param {string} systemId
 */
export function prefetchGameSystemInfo(systemId) {
  if (!systemId) return;
  getCommandPattern(systemId);
}
