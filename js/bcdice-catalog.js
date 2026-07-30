// js/bcdice-catalog.js
// BCDiceの「システム一覧」と「システム情報（command_pattern / help_message）」を
// 取得するクライアント共通モジュール。一覧はシステム選択欄の中身に、システム情報は
// チャット入力がダイスコマンドかどうかの判定とルーム設定のヘルプ表示に使う。
//
// 取得先は自サーバーの /api/bcdice/*（Redisで既定30日キャッシュしている中継）。
// サーバー側が落ちている・古い版が動いている場合だけBCDice本体へ直接取りに行く
// （BCDice APIはCORSを許可しているのでブラウザから直接叩ける）。
// 同じデータを何度も取りに行かないよう、Promiseの単位でメモ化する。

const BCDICE_FALLBACK_BASE_URL = 'https://bcdice.onlinesession.app';

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
        const data = await fetchJson('/api/bcdice/game_system');
        return data.systems || [];
      } catch (error) {
        console.warn('[bcdice] サーバー経由のシステム一覧取得に失敗しました:', error.message);
        const data = await fetchJson(`${BCDICE_FALLBACK_BASE_URL}/v2/game_system`);
        return (data.game_system || []).map(({ id, name }) => ({ id, name }));
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
        return await fetchJson(`/api/bcdice/game_system/${encodeURIComponent(systemId)}`);
      } catch (error) {
        console.warn(`[bcdice] サーバー経由のシステム情報取得に失敗しました (${systemId}):`, error.message);
        const data = await fetchJson(`${BCDICE_FALLBACK_BASE_URL}/v2/game_system/${encodeURIComponent(systemId)}`);
        return {
          id: data.id,
          name: data.name,
          commandPattern: data.command_pattern,
          helpMessage: data.help_message
        };
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
