// js/store/info.js
// 「情報」（タイトル＋区画の共有メモ）の形を整える処理と、伏せ字（masks）の扱い。
//
// 本文中の目印 {{n}} と masks が対になっていて、伏せている間は文字数が分からないよう
// 伏せ字1文字だけを描く。取り込んだ部屋データもここを通るので、形の壊れたものは落とす。

import { normalizeAudience } from './patch.js';

// 情報（infoEntries）の「伏せた語」(masks)の上限。カードと同じ趣旨の歯止めで、
// 状態は全員へ配られRedisへも書き戻るため、payloadを信用せずここで切る。
// 本文(body)とエントリ数には今も上限が無いが、そちらを今から切ると既に長い本文を
// 持つ部屋が削れるので（MAX_ROOM_DECKSの但し書きと同じ事故）、masks側だけに置く。
// 編集画面（js/info-entry-dialog.js）も同じ数で断るためexportする。切って通すと本文と
// 伏せ語が食い違うので、あちらは「切る」のではなく「断る」側で使う。
export const MAX_INFO_MASKS_PER_SECTION = 30;
export const MAX_INFO_MASK_TEXT_LENGTH = 100;
// 伏せ字。絵文字1つが入る長さにしてある。
export const MAX_INFO_MASK_CHAR_LENGTH = 2;
export const DEFAULT_INFO_MASK_CHAR = '■';

// 伏せ字を「人が1文字と見る単位」で切る。clampCardTextのsliceを使わないのは、1〜2文字の欄で
// sliceするとサロゲートペアや絵文字の合字を割って、壊れた文字が状態に載るため。
// 空になったら既定の伏せ字へ落とす（伏せ字が無いと語が丸見えになる）。
export function clampMaskChar(value) {
  if (typeof value !== 'string') return DEFAULT_INFO_MASK_CHAR;
  const trimmed = value.trim();
  // Intl.Segmenterはブラウザ・Nodeとも入っているが、無い環境ではコードポイント単位へ落ちる
  // （合字が切れることはあっても、壊れた文字にはならない）。
  const units = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? [...new Intl.Segmenter().segment(trimmed)].map(segment => segment.segment)
    : Array.from(trimmed);
  const clamped = units.slice(0, MAX_INFO_MASK_CHAR_LENGTH).join('');
  return clamped === '' ? DEFAULT_INFO_MASK_CHAR : clamped;
}

// 本文中の伏せ字の目印 {{n}} を頭から拾い、[{ id, start, end }] を出現順に返す。
// 描画（js/info-panel.js）・選択範囲との重なり判定（js/info-entry-dialog.js）・
// 下のnormalizeInfoMasksの刈り込みが同じ走査を要るので、正規表現の写しを3つ作らず
// ここへ寄せる。正規表現を関数の中で作るのは、/g付きをモジュール定数にすると
// lastIndexが呼び出し間で共有され、2回目の走査が途中から始まってしまうため。
export function listMaskMarkers(body) {
  if (typeof body !== 'string' || body === '') return [];
  const pattern = /\{\{(\d+)\}\}/g;
  const markers = [];
  let match;
  while ((match = pattern.exec(body)) !== null) {
    markers.push({ id: Number(match[1]), start: match.index, end: match.index + match[0].length });
  }
  return markers;
}

// 伏せた語の一覧を整える。不変条件は片側だけ持たせる：「maskには対応する目印が本文にある」。
// 逆（目印だけあってmaskが無い）は許して、描画側でただの文字として出す。本文は自由入力欄
// なので、利用者が手で打った {{1}} を黙って消さないため。
// 同じidの目印が本文に2つあれば伏せ字も2つ出て、公開すると両方同時に開く（同じ語なので）。
export function normalizeInfoMasks(masks, body) {
  if (!Array.isArray(masks)) return Object.freeze([]);

  const marked = new Set(listMaskMarkers(body).map(marker => marker.id));
  const seen = new Set();
  const normalized = [];

  masks.forEach(mask => {
    if (normalized.length >= MAX_INFO_MASKS_PER_SECTION) return;
    if (!mask || typeof mask !== 'object') return;
    if (!Number.isInteger(mask.id) || mask.id < 1) return;
    if (seen.has(mask.id)) return;
    // 目印を手で消された伏せ語は、もう本文のどこも指していないので捨てる
    if (!marked.has(mask.id)) return;
    if (typeof mask.text !== 'string') return;

    seen.add(mask.id);
    normalized.push(Object.freeze({
      id: mask.id,
      text: mask.text.slice(0, MAX_INFO_MASK_TEXT_LENGTH),
      mask: clampMaskChar(mask.mask),
      // truthy判定にしない。取り込んだJSONの "yes" や 1 で公開が広がらないようにする
      // （normalizeAudienceと同じ「広げる方向へ倒さない」流儀）。
      revealed: mask.revealed === true
    }));
  });

  return Object.freeze(normalized);
}

// 情報（infoEntries）のsection1件を作る／整える。audienceの正規化をここへ集約し、
// 追加・更新のどちらの経路を通っても同じ形になるようにする。
// masksは本文と対にして刈るので、bodyとmasksは必ず一緒に渡すこと（片方だけ渡すと
// 伏せ語が消えるか、目印が本文に取り残される）。
export function buildInfoSection({ id, label = '', body = '', audience = null, masks = null }) {
  const nextBody = body || '';
  return Object.freeze({
    id,
    label: label || '',
    body: nextBody,
    audience: normalizeAudience(audience),
    masks: normalizeInfoMasks(masks, nextBody)
  });
}

// 保存済み・読み込まれた情報（infoEntries）の形を整える。hydrateと「部屋の全データ読み込み」
// （js/state-import.js）の両方がここを通る。
// ADD_INFO_ENTRYと同じ規則で検証し、通らないものは捨てる：sectionsやtitleを欠いたエントリが
// 1件混ざるだけで、情報パネルは描画のたびに例外を投げてしまうため（js/info-panel.js）。
export function normalizeInfoEntries(infoEntries) {
  if (!Array.isArray(infoEntries)) return [];

  const seenEntryIds = new Set();
  const normalized = [];

  infoEntries.forEach(entry => {
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry.id !== 'string' || entry.id === '') return;
    if (typeof entry.title !== 'string') return;
    if (seenEntryIds.has(entry.id)) return;

    const seenSectionIds = new Set();
    const sections = [];
    (Array.isArray(entry.sections) ? entry.sections : []).forEach(section => {
      if (!section || typeof section !== 'object') return;
      if (typeof section.id !== 'string' || section.id === '') return;
      if (seenSectionIds.has(section.id)) return;
      seenSectionIds.add(section.id);
      sections.push(buildInfoSection(section));
    });
    // 区画0件のエントリは誰にも見えず画面から消すこともできない（ADD_INFO_ENTRYと同じ理由で捨てる）
    if (sections.length === 0) return;

    seenEntryIds.add(entry.id);
    normalized.push(Object.freeze({
      ...entry,
      ownerId: entry.ownerId || null,
      sections: Object.freeze(sections)
    }));
  });

  return Object.freeze(normalized);
}
