// server/bcdice-cache-rules.js
// BCDiceの中継キャッシュ（server/index.jsのloadBcdiceCached）の判断そのもの。
// 時計もネットワークもRedisも触らない純粋関数だけを置く。
//
// 【なぜ分けたか】ここで一度間違えている。上流の答えを **4xxまとめて「そのシステムは
// 存在しない」として1時間覚える** 実装になっていて、403（弾かれた）や429（叩きすぎ）まで
// 「無い」扱いにしていた。上流の一時的な事情を、こちらで1時間に引き伸ばす動きになる。
// しかも症状は「特定のシステムだけダイス判定が効かない」で、しばらくすると直るので、
// 見ていて原因に辿り着けない種類の壊れ方をする。
//
// 紛らわしいのは、**広く取ること自体は間違いではなかった**こと：BCDiceは実在しないIDに
// 400を返すので、404だけに絞ると「無い」を1件も覚えられなくなる。境目は数字の大小ではなく
// 「上流がそのIDについて答えたのか、こちらを門前払いしたのか」にある。
//
// 判断の材料は「ステータス番号」と「覚えている記録」だけなので、切り出せばそのまま試せる。
// 分け方はjs/net-host-rules.js・js/room-authority-rules.jsと同じ流儀。

/** 「そのシステムは無い」と覚えておく時間。上流に増えたとき言い続けないよう短くする。 */
export const MISS_CACHE_MS = 60 * 60 * 1000;

/**
 * 上流が「無い」とは言っていないのに取れなかったとき、次に叩きに行くまで待つ時間。
 *
 * 「無い」の記録から403・429を外すと、今度は逆に**上流が弾いている間ずっと、
 * 1件ごとに毎回上流を叩きに行く**ことになる（部屋を開くたびに数システム分）。
 * 弾かれているときほど叩きに行くのは最悪なので、「無い」とは別の短い休みが要る。
 */
export const UNAVAILABLE_COOLDOWN_MS = 60 * 1000;

/**
 * 上流に**門前払いされている**間、どのIDでも上流へ行かない時間。
 *
 * 【なぜIDごとではなく全体か】401・403・429が言っているのは「そのIDは無い」ではなく
 * **「お前とは話さない」**。IDを変えても結果は変わらないので、IDごとに休んでいると
 * システムの数だけ無駄に叩くことになる。弾かれているときほど叩き続けるのは最悪。
 *
 * 60秒より長いのは、この手の遮断が秒単位では明けないため（データセンターのIPを弾く
 * 設定なら、こちらが何かしない限りずっと続く）。
 */
export const BLOCKED_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * その答えは「こちらが門前払いされた」を意味するか。
 *
 * 401・403（弾かれた）／429（叩きすぎ）は、**要求したIDについての答えではない**。
 * だからIDごとの記録ではなく、上流ごとの休みに繋げる。
 */
export function meansBlocked(status) {
  return status === 401 || status === 403 || status === 429;
}

/**
 * その答えは「そのシステムが実在しない」を意味するか。
 *
 * 【400が入っているのは実測による】BCDiceは実在しないシステムIDに **400 を返す**
 * （404ではない）。2026-09-02に `/v2/game_system/<でたらめなID>` で確認した。
 * 元の実装が「4xxまとめて」だったのは、おそらくこれを見たため——**そこは正しかった。**
 * 間違っていたのは、同じ網で403（弾かれた）や429（叩きすぎ）まで掬っていたこと。
 *
 * こちらが投げるIDはBCDICE_SYSTEM_ID_PATTERNを通してあるので、400が「投げ方が悪い」の
 * 意味で返ることは実質無い。
 *
 *   入れる … 400（この上流の「そんなIDは無い」）／404／410（消えた）
 *   入れない … 401・403（弾かれた）／408（時間切れ）／429（叩きすぎ）／5xx（不調）
 *
 * 【間違える向きが対称でない】一時的な事情を「無い」と覚えると、そのシステムだけ
 * 1時間ダイス判定が効かなくなる。逆に「無い」を覚え損ねても、上流をもう一度叩くだけ。
 * 迷ったら覚えない側へ倒すこと。
 */
export function meansMissing(status) {
  return status === 400 || status === 404 || status === 410;
}

/**
 * 覚えている記録を見て、上流へ行く前に何をするか決める。
 *
 * @param {object} options
 * @param {object|null} options.cached 覚えている記録（無ければnull）
 * @param {number} options.now いま
 * @param {number} [options.cacheMs] 本来のキャッシュの有効期間
 * @returns {{action: 'missing'|'fresh'|'stale'|'unavailable'|'fetch', reason?: string}}
 *   missing     … 「無い」と答える（上流へ行かない）
 *   fresh       … 覚えている中身をそのまま返す
 *   stale       … 休み中だが中身は持っている。古いものとして返す
 *   unavailable … 休み中で中身も無い。断る
 *   fetch       … 上流へ取りに行く
 */
export function decideCacheRead({ cached, now, cacheMs }) {
  if (!cached) return { action: 'fetch' };

  // 「無い」の記録が一番強い。休みの記録より優先する
  if (cached.missing) {
    if (now - cached.fetchedAt < MISS_CACHE_MS) return { action: 'missing' };
    return { action: 'fetch' };
  }

  // 期限内の中身があるなら、休みかどうかに関わらずそれを返す
  if (cached.payload && now - cached.fetchedAt < cacheMs) return { action: 'fresh' };

  // 休み中。**中身を持っているなら古くても返す**——上流の不調で、そのシステムの
  // ヘルプもコマンド判定も丸ごと失われる方が困る
  if (cached.unavailableUntil && now < cached.unavailableUntil) {
    if (cached.payload) return { action: 'stale' };
    return { action: 'unavailable', reason: cached.unavailableReason };
  }

  return { action: 'fetch' };
}

/**
 * 取れなかったときに覚える記録を組み立てる。
 *
 * **持っている中身は捨てない。** 捨てると、上流が不調な間そのシステムが完全に失われる。
 *
 * @returns {object|null} 覚える記録。nullなら何も変えない
 */
export function buildUnavailableEntry({ cached, now, reason }) {
  // 「無い」の記録の方が強い。上書きしない
  if (cached?.missing) return null;
  return {
    ...(cached?.payload
      ? { payload: cached.payload, fetchedAt: cached.fetchedAt }
      : { fetchedAt: now }),
    unavailableUntil: now + UNAVAILABLE_COOLDOWN_MS,
    unavailableReason: reason
  };
}
