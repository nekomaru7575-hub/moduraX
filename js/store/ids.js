// js/store/ids.js
// 盤面のオブジェクト（コマ・パネル・カード・デッキ・バフ・プロット枠・情報）のIDを作る。
//
// どれも「時刻＋モジュール内の連番」で、同じミリ秒に続けて作っても衝突しない。
// 採番はアクションを起こす側（画面）で行い、payload に載せて配る約束になっている
// （reducer の中で採番すると、同じアクションを実行した各クライアントで別々のIDになる）。


let tokenIdCounter = 0;

export function generateTokenId() {
  tokenIdCounter += 1;
  return `token-user-${Date.now()}-${tokenIdCounter}`;
}

let panelIdCounter = 0;

export function generatePanelId() {
  panelIdCounter += 1;
  return `panel-user-${Date.now()}-${panelIdCounter}`;
}

let cardIdCounter = 0;

export function generateCardId() {
  cardIdCounter += 1;
  return `card-user-${Date.now()}-${cardIdCounter}`;
}

let deckIdCounter = 0;

export function generateDeckId() {
  deckIdCounter += 1;
  return `deck-user-${Date.now()}-${deckIdCounter}`;
}

let deckTemplateIdCounter = 0;

// デッキの定義（room.deckTemplates）のid。盤面に置いた山札のidとは別物。
export function generateDeckTemplateId() {
  deckTemplateIdCounter += 1;
  return `decktpl-${Date.now()}-${deckTemplateIdCounter}`;
}

let roomStampIdCounter = 0;

// 部屋に登録するスタンプ（room.stamps）のid。これは**ローカルid**で、公開ID
// （"room:<ローカルid>"）はreducer側が名前空間を冠して作る（js/store/stamps.js）。
// 送り手に名前空間を決めさせないための分担なので、ここで'room:'を付けないこと。
export function generateRoomStampId() {
  roomStampIdCounter += 1;
  return `roomstamp-${Date.now()}-${roomStampIdCounter}`;
}

let buffIdCounter = 0;

export function generateBuffId() {
  buffIdCounter += 1;
  return `buff-user-${Date.now()}-${buffIdCounter}`;
}

let plotSlotIdCounter = 0;

// 1つのコマに増やしたプロット選択（round.plotExtras）のid。
// 【リデューサーの中で採番してはいけない】リデューサーはクライアント（楽観適用）と
// サーバーの両方で走るので、中で作るとidが食い違って以後の操作が相手に効かなくなる。
// generateBuffIdと同じく、呼び出し側で作ってpayloadに載せること。
export function generatePlotSlotId() {
  plotSlotIdCounter += 1;
  return `plotslot-${Date.now()}-${plotSlotIdCounter}`;
}

let infoEntryIdCounter = 0;

export function generateInfoEntryId() {
  infoEntryIdCounter += 1;
  return `info-user-${Date.now()}-${infoEntryIdCounter}`;
}

let infoSectionIdCounter = 0;

export function generateInfoSectionId() {
  infoSectionIdCounter += 1;
  return `info-section-${Date.now()}-${infoSectionIdCounter}`;
}
