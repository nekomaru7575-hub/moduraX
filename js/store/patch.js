// js/store/patch.js
// dispatch 内で繰り返し現れる更新パターンの共通処理。
//
// case 側が「どのスライスをどう変えるか」だけを書けるようにするための道具立てで、
// 凍結（Object.freeze）はここで面倒を見る。アクション名でテーブルを引く fieldPatchFor も
// ここに置いてある（素の TABLE[action] で引いてはいけない理由はその関数のコメント参照）。


// --- dispatch内で繰り返し現れる更新パターンの共通処理 ---
// case側が「どのスライスをどう変えるか」だけを書けるようにするための道具立て。
// 凍結（Object.freeze）はここで面倒を見るので、case側は原則freezeを書かない。

// 作業用トークンマップ（dispatch冒頭のnextTokensState）の1コマだけを差し替える。
// このマップはdispatch内のローカルコピーなので、ここだけは直接書き換える。
export function patchCharacter(tokensState, id, fields) {
  tokensState[id] = Object.freeze({ ...tokensState[id], ...fields });
}

// キー付きマップ（panels / room.originalTables / room.audioTracks / parameters等）の1件追加・更新。
export function withMapEntry(map, key, value) {
  return Object.freeze({ ...map, [key]: value });
}

// 同じマップからの1件削除。
export function withoutMapEntry(map, key) {
  const next = { ...map };
  delete next[key];
  return Object.freeze(next);
}

// パネルのマップを入れ子まで凍らせて写し取る（シーンの保存・適用で使う）。
// 通信やhydrate（JSON復元）を経た値は凍っていないので、状態へ入れる前にここを通す。
export function freezePanelMap(panels) {
  return Object.freeze(Object.fromEntries(
    Object.entries(panels || {}).map(([id, panel]) => [id, Object.freeze({ ...panel })])
  ));
}

// 公開先(audience)を正規化する。null（＝全員に公開）か、参加者IDの配列にそろえる。
// 空配列は「全員に公開」へ丸めない：呼び出し側が配列を渡した以上は限定公開の意図なので、
// 中身が空でも公開範囲を広げる方向へは倒さない（不具合が情報漏れにならないようにする）。
export function normalizeAudience(audience) {
  if (!Array.isArray(audience)) return null;
  return Object.freeze([...new Set(audience.filter(id => typeof id === 'string' && id !== ''))]);
}

// パネルの重なり順（stackOrder）を0以上の整数にそろえる。小さいほど下、大きいほど上。
// 未設定・数値でない・負値はすべて0になる。この項目より前に作られた部屋・シーン・
// 書き出しファイルのパネルにはキーが無いので、その既定値もこれが兼ねる（移行処理は不要）。
// 描画側（js/board-data-driven.js）も読むときに同じ関数を通す。片方だけ変えると、
// 状態に入っている値と画面上の重なりがずれるため。
export function normalizeStackOrder(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

// 値がundefinedのキーを落とす。既存オブジェクトへの部分更新をスプレッドで作るとき、
// undefinedが混ざると「指定なし」ではなく「その値で上書き」になってしまうのを防ぐ。
export function definedFields(patch) {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}

// 下の各テーブルからアクション名で規則を引く。必ずここを通すこと。
//
// 素の TABLE[action] で引いてはいけない。テーブルはオブジェクトリテラルなので
// Object.prototype 由来の名前まで拾ってしまう（SEND_STAMPのparticipantsと同じ罠。
// あちらのコメントも参照）。特に action:'constructor' は Object そのものを返し、
// Object(payload) は payload 自身なので、payloadの全キーがそのままコマへマージされ、
// 保存・全員への配信まで通ってしまう。GM_ONLY_ACTIONS にも載っていない名前なので、
// server/index.js の権限チェックも素通りする。
// 自分で書いた名前だけを引くようにして塞ぐ。
export function fieldPatchFor(table, action) {
  return Object.prototype.hasOwnProperty.call(table, action) ? table[action] : null;
}
