// js/store/handlers/board.js
// 盤面に載るもののうち、コマ以外――パネル（マップタイル状のオブジェクト）と
// カード・デッキ・カードストッカー、そしてデッキの作り置き（deckTemplates）。
//
// 【秘匿の水準】裏向きのカードの表面(face)も、所有者付きストッカーの中身も、状態として
// 全クライアントへ配られる。隠しているのは描画だけで、開発者ツールを開けば読める
// （js/visibility.js 冒頭と同じ「うっかり見えない」まで）。

import {
  CARD_COLS, MAX_CARD_SEEN_BY, MAX_DECK_CARDS, MAX_DECK_TEMPLATES, MAX_DRAW_COUNT, MAX_ROOM_CARDS,
  MAX_ROOM_DECKS, buildCard, buildDeck, buildDeckTemplate, findFreeCardSpot, nextStockerSeq,
  releaseStockerCards, stockerAllowsUser
} from '../cards.js';
import { normalizeAudience, normalizeStackOrder, withMapEntry, withoutMapEntry } from '../patch.js';

export const BOARD_HANDLERS = {
  // --- デッキの定義（js/deck-list-dialog.js・js/deck-editor-dialog.js） ---
  // 作り置きのデッキ。盤面に置いた山札（state.decks）とは別で、こちらは
  // 1行＝1種類のカード＋枚数で持つ。オリジナル表と同じく部屋の全員で共有し、
  // 誰でも作成・編集・削除できる。
  // 同じidで呼べば上書き（SAVE_SCENEと同じ「キー重複＝上書き」の規則）。
  SAVE_DECK_TEMPLATE({ prevState, payload, commit }) {
    const { id, name } = payload;
    if (!id || !name) return;
    const room = prevState.room;
    // 数を見るのは新規のときだけ。同じidでの上書きは数が増えないので通す
    // （「キー重複＝上書き」の規則を上限のせいで壊さないため）。
    if (!room.deckTemplates?.[id]
      && Object.keys(room.deckTemplates || {}).length >= MAX_DECK_TEMPLATES) return;

    commit({
      room: {
        ...room,
        deckTemplates: withMapEntry(room.deckTemplates || {}, id, buildDeckTemplate(payload))
      }
    });
  },

  // 定義を消すだけで、その定義から作って盤面に置いてある山札・カードには触らない
  // （置いた時点で1枚ずつへ展開され、定義とは切り離されているため）。
  REMOVE_DECK_TEMPLATE({ prevState, payload, commit }) {
    const { id } = payload;
    const room = prevState.room;
    if (!room.deckTemplates?.[id]) return;

    commit({
      room: { ...room, deckTemplates: withoutMapEntry(room.deckTemplates, id) }
    });
  },

  // --- パネル（盤面上／盤面外に置けるマップタイル状のオブジェクト） ---
  // 位置(x,y)は盤面ローカルのピクセル座標（グリッド吸着済み、盤面外は負値もあり得る）、
  // 大きさ(cols,rows)はマス数。置ける場所に制限は無く、盤面から離れた位置にも置ける。
  ADD_PANEL({ prevState, payload, commit }) {
    const {
      id, image = null, text = '', x = 0, y = 0, cols = 2, rows = 2, locked = false,
      textAudience = null, keepOnSceneChange = false, stackOrder = 0
    } = payload;
    if (!id) return;
    if (prevState.panels[id]) return;

    const panel = Object.freeze({
      id, image: image || null, text: text || '', x, y,
      cols: Math.max(1, Math.round(cols)),
      rows: Math.max(1, Math.round(rows)),
      locked: !!locked, // 固定中は盤面上でドラッグ移動できない（背景タイルのように振る舞う）
      // テキスト（マウスオーバーで出るメモ）の公開先。null＝全員に見せる
      textAudience: normalizeAudience(textAudience),
      // シーンへ遷移してもこのパネルだけは盤面に残す。シーン側には保存されないので、
      // 実体は常に1つ（js/main.jsのcurrentBoardSnapshotとAPPLY_SCENE参照）
      keepOnSceneChange: !!keepOnSceneChange,
      // パネル同士の重なり順。同値のパネル同士はこのマップの並び（＝追加順）で決まる
      stackOrder: normalizeStackOrder(stackOrder),
      // カードストッカー（カードを収納できる箱）。既定は普通のパネル。
      // 切り替えとその所有者はSET_PANEL_STOCKERで決める
      isStocker: false,
      stockerOwnerId: null,
      stockerOwnerLocalId: null
    });

    commit({ panels: withMapEntry(prevState.panels, id, panel) });
  },

  // パネルをカードストッカーにする／やめる。所有者を決めるのもここ（PANEL_FIELD_PATCHESに
  // 混ぜないのは、やめるときに中のカードを盤面へ出す必要があるため）。
  // 所有者を付けると、入れる・見る・取り出すのすべてがその人だけになる。
  SET_PANEL_STOCKER({ prevState, payload, commit }) {
    const { id, isStocker, ownerId = null, localUserId = null, gridSize } = payload;
    const panel = prevState.panels[id];
    if (!panel) return;

    const nextPanel = Object.freeze({
      ...panel,
      isStocker: !!isStocker,
      // 所有者を付けないときは両方null（＝誰でも使える箱）。表示名を設定している人は
      // 参加者IDで持ち、ゲストはブラウザ単位のIDへ退避する（MOVE_TO_BACKYARDと同じ）
      stockerOwnerId: isStocker ? (ownerId || null) : null,
      stockerOwnerLocalId: isStocker && !ownerId ? (localUserId || null) : null
    });

    // 箱でなくなるなら、中のカードは盤面へ出す（消えると取り返しがつかない）
    const cards = isStocker ? prevState.cards : releaseStockerCards(prevState.cards, panel, gridSize);

    commit({
      panels: withMapEntry(prevState.panels, id, nextPanel),
      ...(cards === prevState.cards ? {} : { cards })
    });
  },

  // パネルの項目変更（固定/移動/サイズ/画像/テキスト）はPANEL_FIELD_PATCHESで共通処理する。
  REMOVE_PANEL({ prevState, payload, commit }) {
    const { id, gridSize } = payload;
    const panel = prevState.panels[id];
    if (!panel) return;

    // ストッカーごと消すときは、中のカードを盤面へ出してから消す
    const cards = releaseStockerCards(prevState.cards, panel, gridSize);

    commit({
      panels: withoutMapEntry(prevState.panels, id),
      ...(cards === prevState.cards ? {} : { cards })
    });
  },

  // --- カード（表と裏を持つ盤面オブジェクト。js/board-data-driven.js） ---
  // 位置(x,y)・重なり順の規則はパネルと同じ。単項目の変更（移動/固定/重なり順/表裏）は
  // CARD_FIELD_PATCHESで共通処理する。
  // シーンの保存・適用（SAVE_SCENE・APPLY_SCENE）はカードとデッキに触らない。
  // 場面が変わってもコマが消えないのと同じ扱いで、引いた手札が場面転換で巻き戻ったり
  // 消えたりしないようにするため。
  ADD_CARD({ prevState, payload, commit }) {
    const { id } = payload;
    if (!id) return;
    if (prevState.cards[id]) return;
    if (Object.keys(prevState.cards).length >= MAX_ROOM_CARDS) return;

    commit({
      cards: withMapEntry(prevState.cards, id, buildCard(payload))
    });
  },

  REMOVE_CARD({ prevState, payload, commit }) {
    const { id } = payload;
    if (!prevState.cards[id]) return;

    commit({ cards: withoutMapEntry(prevState.cards, id) });
  },

  // 「カードを見る」（裏のまま自分だけ表面を確認する）で、見た人を記録する。
  // 見ること自体は誰にでも許すので、ここで止めるものは何もない。記録は全員に配られるが、
  // 盤面には出さず、カードの右クリックメニューを開いた人だけが読める
  // （js/board-data-driven.jsのカードメニュー）。
  MARK_CARD_SEEN({ prevState, payload, commit }) {
    const { id, participantId } = payload;
    const card = prevState.cards[id];
    if (!card || typeof participantId !== 'string' || !participantId) return;
    // 表示名を設定していない人（参加者IDを持たない）は記録できない。名前が無い記録は
    // 「誰が見たか」を伝えられず、数だけ増えても意味がないため。
    if (card.seenBy.includes(participantId)) return;
    if (card.seenBy.length >= MAX_CARD_SEEN_BY) return;

    commit({
      cards: withMapEntry(prevState.cards, id, Object.freeze({
        ...card,
        seenBy: Object.freeze([...card.seenBy, participantId])
      }))
    });
  },

  // --- カードストッカーへの出し入れ（stockerAllowsUser の節を参照） ---
  // 収納したカードは盤面から消えるが、状態としては残る（stockerIdが入るだけ）。
  // 所有者付きの箱は、操作した人がその所有者のときだけ受け付ける。
  // 【箱から箱への移動も受け付ける】既に別の箱に入っているカードでも、移動先の権限
  // だけでなく移動元の権限も確認したうえで動かす。移動元の確認を省くと、権限のない人が
  // 他人の専用ストッカーから自分の箱へカードを引き抜けてしまう（「取り出す」が移動元の
  // 権限を見ているのと同じ理由）。盤面のカード（stockerIdがnull）は移動元が無いので、
  // ここは常に素通りする＝既存のドラッグ&ドロップの挙動は変わらない。
  STORE_CARD_IN_STOCKER({ prevState, payload, commit }) {
    const { cardId, panelId, participantId = null, localUserId = null } = payload;
    const card = prevState.cards[cardId];
    const panel = prevState.panels[panelId];
    if (!card || !panel) return;
    if (card.stockerId === panelId) return; // 既に同じ箱の中
    if (!stockerAllowsUser(panel, participantId, localUserId)) return;
    if (card.stockerId) {
      const sourcePanel = prevState.panels[card.stockerId];
      if (sourcePanel && !stockerAllowsUser(sourcePanel, participantId, localUserId)) return;
    }

    commit({
      cards: withMapEntry(prevState.cards, cardId, Object.freeze({
        ...card, stockerId: panelId, stockerSeq: nextStockerSeq(prevState.cards)
      }))
    });
  },

  // 箱から1枚取り出す。置き場所は箱の位置から決めるので、全員の画面で同じ位置に出る。
  TAKE_CARD_FROM_STOCKER({ prevState, payload, commit }) {
    const { cardId, gridSize, participantId = null, localUserId = null } = payload;
    const card = prevState.cards[cardId];
    if (!card?.stockerId) return;

    const panel = prevState.panels[card.stockerId];
    // 箱そのものが既に無い場合は、誰でも取り出せる扱いにする（迷子のままにしない）
    if (panel && !stockerAllowsUser(panel, participantId, localUserId)) return;

    const grid = Math.max(1, Math.round(Number(gridSize) || 25));
    const baseX = (panel?.x ?? card.x) + (CARD_COLS + 1) * grid;
    const spot = findFreeCardSpot(prevState.cards, baseX, panel?.y ?? card.y, grid);

    commit({
      cards: withMapEntry(prevState.cards, cardId, Object.freeze({
        ...card, stockerId: null, stockerSeq: 0, x: spot.x, y: spot.y
      }))
    });
  },

  // 箱の中身をまとめて盤面へ出す（メニューの「すべて取り出す」）。
  RELEASE_STOCKER_CARDS({ prevState, payload, commit }) {
    const { panelId, gridSize, participantId = null, localUserId = null } = payload;
    const panel = prevState.panels[panelId];
    if (!panel) return;
    if (!stockerAllowsUser(panel, participantId, localUserId)) return;

    const cards = releaseStockerCards(prevState.cards, panel, gridSize);
    if (cards === prevState.cards) return;

    commit({ cards });
  },

  // --- デッキ（カードの束。裏向きでセットする） ---
  // 束ねる札のIDは配置する側（js/deck-dialog.js）が発番して渡す。reducerで採番すると、
  // 同じアクションを各クライアントが再実行したときに別々のIDになってしまう。
  ADD_DECK({ prevState, payload, commit }) {
    const { id } = payload;
    if (!id) return;
    if (prevState.decks[id]) return;
    if (Object.keys(prevState.decks).length >= MAX_ROOM_DECKS) return;

    commit({
      decks: withMapEntry(prevState.decks, id, buildDeck(payload))
    });
  },

  // デッキだけを消す。既に引かれて盤面に出ているカードはそのまま残す。
  REMOVE_DECK({ prevState, payload, commit }) {
    const { id } = payload;
    if (!prevState.decks[id]) return;

    commit({ decks: withoutMapEntry(prevState.decks, id) });
  },

  // シャッフル。並び替えた結果（IDの配列）を発火側が作って渡す。reducerでMath.random()を
  // 呼ぶと、同じアクションを実行した各クライアントが別々の並びになってしまうため。
  // 受け取った並びは「今デッキにある札の並べ替えであること」を必ず確かめる。ここを
  // 省くと、細工したpayloadで札を増やす・減らす・すり替えることができてしまう。
  SHUFFLE_DECK({ prevState, payload, commit }) {
    const { id, order } = payload;
    const deck = prevState.decks[id];
    if (!deck) return;
    if (!Array.isArray(order) || order.length !== deck.cards.length) return;

    const remaining = new Map(deck.cards.map(card => [card.id, card]));
    const shuffled = [];

    for (const cardId of order) {
      const card = remaining.get(cardId);
      if (!card) return; // 知らないID、または同じIDが2回出てきた
      remaining.delete(cardId);
      shuffled.push(card);
    }

    commit({
      decks: withMapEntry(prevState.decks, id, Object.freeze({
        ...deck,
        cards: Object.freeze(shuffled)
      }))
    });
  },

  // 盤面のカードをデッキへ戻す。戻る先は山の**一番下**（＝cardsの末尾）で、
  // 残りが0枚でも同じ（空の山に1枚だけ入る）。
  // どのデッキへ戻すかは呼び出し側が決めるが、そのカードの出自（deckId）と違う山は
  // 受け付けない（js/board-data-driven.jsのドロップ処理でも同じ判定をしている）。
  // 戻したカードは盤面から消える。裏面は捨てる（裏面はデッキが持つため）。
  RETURN_CARD_TO_DECK({ prevState, payload, commit }) {
    const { cardId, deckId } = payload;
    const card = prevState.cards[cardId];
    const deck = prevState.decks[deckId];
    if (!card || !deck) return;
    if (card.deckId !== deck.id) return;
    // 同じidの札が山に居るなら二重に増やさない（連打・再送への歯止め）
    if (deck.cards.some(entry => entry.id === card.id)) return;
    if (deck.cards.length >= MAX_DECK_CARDS) return;

    commit({
      cards: withoutMapEntry(prevState.cards, cardId),
      decks: withMapEntry(prevState.decks, deck.id, Object.freeze({
        ...deck,
        cards: Object.freeze([...deck.cards, Object.freeze({ id: card.id, face: card.face })])
      }))
    });
  },

  // デッキの一番上からn枚引く。表向き(faceUp:true)/裏向きで盤面へ出すか、stockerIdを
  // 渡してストッカーへ直接収納するかの3択（js/board-data-driven.jsのopenDeckMenu）。
  // 盤面へ出す場合の置き場所はデッキの位置から導く（findFreeCardSpot）ので、全員の画面で
  // 同じ位置に出る。gridSizeは描画側の定数（js/board-data-driven.jsのGRID_SIZE）で、
  // game-storeは画面の都合を持たない方針なのでpayloadで受け取る。
  // ストッカーへ送る場合はstockerAllowsUserで権限を確かめる（STORE_CARD_IN_STOCKERと同じ
  // 規則）。ストッカーの中では表/裏の区別が描画に効かない（storedカードは盤面に描かれない）
  // ので、送るカードの状態は問わず一律faceUp:falseにする。
  DRAW_CARDS({ prevState, payload, commit }) {
    const {
      deckId, count = 1, faceUp = false, gridSize = 25,
      stockerId = null, participantId = null, localUserId = null
    } = payload;
    const deck = prevState.decks[deckId];
    if (!deck || deck.cards.length === 0) return;

    let targetPanel = null;
    if (stockerId) {
      targetPanel = prevState.panels[stockerId];
      if (!stockerAllowsUser(targetPanel, participantId, localUserId)) return;
    }

    const grid = Math.max(1, Math.round(Number(gridSize) || 25));
    // 部屋の残り枠でも切る。断るのではなく引ける分だけ引くのは、山の残り枚数で
    // 切るのと同じ扱い（上限に触れた瞬間にボタンが無反応になるより素直）。
    const freeSlots = MAX_ROOM_CARDS - Object.keys(prevState.cards).length;
    if (freeSlots <= 0) return;
    const drawCount = Math.min(
      Math.max(1, Math.round(Number(count) || 1)),
      MAX_DRAW_COUNT,
      deck.cards.length,
      freeSlots
    );

    const drawn = deck.cards.slice(0, drawCount);
    let nextCards = prevState.cards;
    let nextSeq = targetPanel ? nextStockerSeq(nextCards) : 0;

    drawn.forEach((card, index) => {
      if (targetPanel) {
        nextCards = withMapEntry(nextCards, card.id, buildCard({
          id: card.id,
          face: card.face,
          back: deck.back,
          faceUp: false,
          deckId: deck.id,
          stockerId: targetPanel.id,
          stockerSeq: nextSeq
        }));
        nextSeq += 1;
      } else {
        const baseX = deck.x + (CARD_COLS + 1) * grid * (index + 1);
        const spot = findFreeCardSpot(nextCards, baseX, deck.y, grid);
        nextCards = withMapEntry(nextCards, card.id, buildCard({
          id: card.id,
          face: card.face,
          // 裏面は引いた時点のものをカード自身が持つ（あとでデッキの裏面を変えても、
          // 既に出ているカードの裏は変わらない）
          back: deck.back,
          x: spot.x,
          y: spot.y,
          faceUp,
          deckId: deck.id
        }));
      }
    });

    commit({
      cards: nextCards,
      decks: withMapEntry(prevState.decks, deck.id, Object.freeze({
        ...deck,
        cards: Object.freeze(deck.cards.slice(drawCount))
      }))
    });
  },
};