// js/parameters/skill/item-use.js
// アイテム（createItemSpecで宣言した、個数を持つ持ち物）の使用と増減。
//
//   item.use(名前)      … 個数を1減らし「（名前）を使用しました。（効果）」をMainタブへ
//   item.gain(名前, n)  … 個数をnだけ増減する（nは負数可）
//
// この2つは特定のシステムの能力ではなく「持ち物そのもの」への操作なので、item を宣言して
// いるプラグインには js/parameters/registry.js が自動で生やす。プラグイン側に書くことは
// 何も無い（ダイスドラフトの dice.change / dice.add と同じ配り方。
// js/parameters/dice-draft/dice-draft-pool.js）。
//
// ボックスの「使用」ボタンも item.use と同じここを通る（runItemUse）。同じ操作が
// 経路によって違う結果になることが無いようにするため。
// 一方、ボックスの「＋」「−」はチャットへ流さない：数え直しのたびに卓のログが埋まる。
// item.gain がログを残すのは、誰かが宣言して打ったものだから（GMの「兵糧丸を2つ渡す」）。
//
// dispatch などの依存は全部引数で受け取る（game-store.js を import すると
// game-store.js → registry.js → プラグイン → ここ → game-store.js の循環になる）。
// トップレベルで document を触らないこと（サーバーもこのファイルを読み込む）。

import { normalizeSkillList, findSkillByName, clampQuantity } from './skill-model.js';

const MAIN_TAB_ID = 'main';

// 引数の区切りは書く人によって揺れるので全角の読点も受ける（dice-draft-pool.js と同じ扱い）。
// 個数は末尾の数値として切り出し、名前側は必要なだけ伸ばす（「item.gain(兵糧丸, -1)」の
// 名前が「兵糧丸」になるように）。名前に読点を含むアイテムは、そのぶん書けない。
const ITEM_USE_PATTERN = /^item\.use\(\s*(.+?)\s*\)$/i;
const ITEM_GAIN_PATTERN = /^item\.gain\(\s*(.+?)\s*[,，]\s*([+\-]?\d+)\s*\)$/i;

// 書き損じ（「item.gain(兵糧丸)」のように個数を書き忘れた等）まで拾う緩い形。
// 素通りしてただの発言になる前に書式を教えるために使う。
const ITEM_LOOKALIKE_PATTERN = /^item\.(use|gain)\(.*\)$/i;

/** 入力がアイテムのコマンド構文に見えるか（適用外の部屋で理由を出すために使う） */
export function looksLikeItemCommand(rawInput) {
  return ITEM_LOOKALIKE_PATTERN.test(String(rawInput).trim());
}

function logToChat(dispatch, spec, token, chatCommand, resultText) {
  dispatch('ADD_CHAT_MESSAGE', {
    tabId: MAIN_TAB_ID,
    entry: {
      system: spec.noun,
      character: token?.name || '',
      characterId: token?.id || null,
      color: token?.textColor || null,
      command: chatCommand,
      resultText
    }
  });
}

/** components から正規形のアイテム一覧を取り出す。 */
export function readItems(spec, components) {
  return normalizeSkillList(spec, components?.[spec.componentKey] ?? []);
}

// 一覧の1件だけ個数を差し替えて書き戻す。名前で引くのは、ボックスから呼ばれた場合も
// コマンドから呼ばれた場合も、手元にあるのが名前だけのため。
function saveQuantity(spec, items, item, nextQuantity, { tokenId, dispatch }) {
  const nextList = items.map(entry => (
    entry === item ? { ...entry, quantity: nextQuantity } : entry
  ));
  dispatch('SET_COMPONENT', { id: tokenId, componentKey: spec.componentKey, value: nextList });
}

/**
 * アイテムを1つ使う。個数を1減らし、名前と効果をMainタブへ流す。
 * ボックスの「使用」ボタンとコマンドの両方から呼ばれる。
 * @returns {boolean} 実際に使えたか（在庫切れならfalse。副作用は何も起きない）
 */
export function runItemUse({ spec, items, item, token, dispatch, chatCommand }) {
  if (item.quantity <= 0) {
    alert(`「${item.name}」は残っていません。`);
    return false;
  }

  saveQuantity(spec, items, item, item.quantity - 1, { tokenId: token.id, dispatch });

  // 効果が空欄なら「◯◯を使用しました。」だけ。残りの個数はボックスで見えるので添えない。
  const effect = String(item.note ?? '').trim();
  logToChat(dispatch, spec, token, chatCommand, `${item.name}を使用しました。${effect}`);
  return true;
}

/**
 * アイテムの個数を増減する（nは負数可）。上下限は宣言の範囲へ丸める。
 * @returns {boolean} 個数が実際に動いたか
 */
export function runItemGain({ spec, items, item, amount, token, dispatch, chatCommand }) {
  const next = clampQuantity(spec, item.quantity + amount);
  if (next === item.quantity) return false;

  saveQuantity(spec, items, item, next, { tokenId: token.id, dispatch });

  const delta = next - item.quantity;
  logToChat(dispatch, spec, token, chatCommand,
    `${item.name}: ${delta > 0 ? '+' : ''}${delta} ＝ ${next}`);
  return true;
}

// 名前でアイテムを引く。無ければ理由を出してnullを返す（構文は合っているので、
// 呼び出し側はコマンドとして処理済み＝ただの発言に落とさない）。
function pickItem(spec, items, name) {
  const item = findSkillByName(items, name);
  if (!item) {
    alert(`${spec.noun}「${name}」が見つかりません。コマの更新ダイアログから登録してください。`);
    return null;
  }
  return item;
}

/**
 * item.use / item.gain を実行する。
 * @param {string} rawInput
 * @param {{spec:object, token:object|null, dispatch:Function}} context
 * @returns {boolean} コマンドとして処理したか
 */
export function handleItemChatCommand(rawInput, { spec, token, dispatch }) {
  const input = String(rawInput).trim();
  if (!spec || !looksLikeItemCommand(input)) return false;

  // 構文が合った時点で必ずtrueを返す（Coreが通常のダイスロールへフォールバックしないように）。
  if (!token) {
    alert(`${spec.noun}を使う参照キャラクターを選択してください。`);
    return true;
  }

  const items = readItems(spec, token.components);

  const gain = input.match(ITEM_GAIN_PATTERN);
  if (gain) {
    const item = pickItem(spec, items, gain[1]);
    if (item) {
      const amount = Number(gain[2]);
      if (!runItemGain({ spec, items, item, amount, token, dispatch, chatCommand: input })) {
        alert(`「${item.name}」の個数は変わりませんでした（${spec.quantity.min}〜${spec.quantity.max}）。`);
      }
    }
    return true;
  }

  const use = input.match(ITEM_USE_PATTERN);
  if (use) {
    const item = pickItem(spec, items, use[1]);
    if (item) runItemUse({ spec, items, item, token, dispatch, chatCommand: input });
    return true;
  }

  // 構文には見えるが読めなかった＝書き損じ。黙って発言にせず書式を教える。
  alert(`書式が違います。

item.use(${spec.noun}名)
item.gain(${spec.noun}名, 個数)

個数にはマイナスも書けます（例: item.gain(兵糧丸, -1)）。`);
  return true;
}
