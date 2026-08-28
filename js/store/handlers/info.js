// js/store/handlers/info.js
// 「情報」（タイトル＋区画の共有メモ）の作成・更新と、伏せ字の開示。
//
// sections は「idで突き合わせて差分を当てる」方式で、配列ごと置き換えはしない：
// 自分に見えていない区画を、編集した人が消せてしまうため。

import { buildInfoSection } from '../info.js';
import { definedFields } from '../patch.js';

export const INFO_HANDLERS = {
  // --- 情報（タイトル＋内容の共有メモ。js/info-panel.js） ---
  // idはUI側（js/info-panel.js）が採番する。sectionは必ず1件以上：0件のエントリは
  // 作成者を含む誰にも見えず、画面から消すこともできない置き土産になるため。
  ADD_INFO_ENTRY({ prevState, payload, commit }) {
    const { id, title, ownerId = null, sections = [] } = payload;
    if (!id || !title) return;
    if (prevState.infoEntries.some(entry => entry.id === id)) return;

    // 通信・ファイル読み込みを経た値も通るので、sectionの形をここで確かめる
    const validSections = Array.isArray(sections)
      ? sections.filter(s => s && typeof s === 'object' && typeof s.id === 'string' && s.id !== '')
      : [];
    if (validSections.length === 0) return;

    const seenSectionIds = new Set();
    const normalized = [];
    validSections.forEach(section => {
      if (seenSectionIds.has(section.id)) return; // 同じidが二重に来たら先勝ち
      seenSectionIds.add(section.id);
      normalized.push(buildInfoSection(section));
    });

    commit({
      infoEntries: [
        ...prevState.infoEntries,
        Object.freeze({ id, title, ownerId: ownerId || null, sections: Object.freeze(normalized) })
      ]
    });
  },

  // タイトル・sectionの内容を更新する。sectionsは「idで突き合わせて差分を当てる」方式で、
  // 配列ごと置き換えはしない：自分に見えていないsectionを、編集した人が消せてしまうため
  // （今は1件しか無いので起きないが、将来の裏の使命を守るのはこの意味づけ）。
  UPDATE_INFO_ENTRY({ prevState, payload, commit }) {
    const { id, title, sections } = payload;
    const target = prevState.infoEntries.find(entry => entry.id === id);
    if (!target) return;

    let nextSections = target.sections;
    if (Array.isArray(sections)) {
      nextSections = [...target.sections];

      sections.forEach(patch => {
        if (!patch || typeof patch !== 'object' || typeof patch.id !== 'string' || !patch.id) return;

        const index = nextSections.findIndex(s => s.id === patch.id);
        if (index < 0) {
          // 知らないidは新しい区画として末尾へ足す（将来の裏の追加もここを通る）
          nextSections.push(buildInfoSection(patch));
          return;
        }
        // 渡されたキーだけを当てる。undefinedを混ぜないのが肝で、混ざると
        // buildInfoSectionの既定値が効いてaudienceが「全員に公開」へ広がってしまう。
        const fields = definedFields(patch);
        // 伏せた語の公開状態(revealed)は、編集画面が開かれてから誰かが動かしている
        // かもしれない。本文を直しただけで開示を巻き戻さないよう、編集画面は
        // revealedを送らず、ここで同じidの旧maskから引き継ぐ。
        // （hydrate・取り込みはファイル側のrevealedを読む必要があるので、この
        // 引き継ぎはbuildInfoSectionではなくこの場所に置いてある。）
        if (Array.isArray(fields.masks)) {
          const prevRevealed = new Map(nextSections[index].masks.map(m => [m.id, m.revealed]));
          fields.masks = fields.masks.map(m => (
            (m && typeof m === 'object') ? { ...m, revealed: prevRevealed.get(m.id) === true } : m
          ));
        }
        nextSections[index] = buildInfoSection({ ...nextSections[index], ...fields });
      });

      nextSections = Object.freeze(nextSections);
    }

    const nextTitle = (typeof title === 'string' && title !== '') ? title : target.title;
    if (nextTitle === target.title && nextSections === target.sections) return;

    commit({
      infoEntries: prevState.infoEntries.map(entry => (
        entry.id === id
          ? Object.freeze({ ...entry, title: nextTitle, sections: nextSections })
          : entry
      ))
    });
  },

  // 本文を送り直さずに公開先だけを変える（SET_CHAT_TAB_AUDIENCEと同じ役どころ）。
  SET_INFO_SECTION_AUDIENCE({ prevState, payload, commit }) {
    const { id, sectionId, audience } = payload;
    const target = prevState.infoEntries.find(entry => entry.id === id);
    if (!target) return;
    if (!target.sections.some(s => s.id === sectionId)) return;

    commit({
      infoEntries: prevState.infoEntries.map(entry => (
        entry.id === id
          ? Object.freeze({
              ...entry,
              sections: Object.freeze(entry.sections.map(s => (
                s.id === sectionId ? buildInfoSection({ ...s, audience }) : s
              )))
            })
          : entry
      ))
    });
  },

  // 伏せた語1つの公開/非公開を決める（フタリソウサの「知ってたカード」のように、
  // 本文は見せたまま一部の語だけを伏せておき、1語ずつ開いていく遊び方のため）。
  // TOGGLEにしないのは、このreducerがクライアントの楽観適用と権威側の両方で走り、
  // RESYNC後にも当て直されるため。SETなら何度当てても同じ状態に落ち着く。
  SET_INFO_MASK_REVEALED({ prevState, payload, commit }) {
    const { id, sectionId, maskId, revealed } = payload;
    const target = prevState.infoEntries.find(entry => entry.id === id);
    if (!target) return;
    const section = target.sections.find(s => s.id === sectionId);
    if (!section) return;
    // 目印を消した編集と、その語を開く操作がすれ違うと、もう無いmaskが指される。
    // idは「今ある一番大きい番号＋1」で採るので取り直しも起こりうるが、当たっても
    // 「1語が開く／閉じる」だけなので、ここで黙って捨てるだけにしておく。
    const mask = section.masks.find(m => m.id === maskId);
    if (!mask) return;

    const nextRevealed = revealed === true;
    // 値が変わらないなら何も配らない。commitすると新しいinfoEntriesができて、
    // js/info-panel.jsの参照等価チェックが空振りし、毎回全再描画になってしまう。
    if (mask.revealed === nextRevealed) return;

    commit({
      infoEntries: prevState.infoEntries.map(entry => (
        entry.id === id
          ? Object.freeze({
              ...entry,
              sections: Object.freeze(entry.sections.map(s => (
                s.id === sectionId
                  ? buildInfoSection({
                      ...s,
                      masks: s.masks.map(m => (m.id === maskId ? { ...m, revealed: nextRevealed } : m))
                    })
                  : s
              )))
            })
          : entry
      ))
    });
  },

  // 区画を1つ消す（ダブルハンドアウトの「裏」を取り下げる等）。最後の1つは消せない：
  // section 0件のエントリは誰にも見えず、画面から消すこともできなくなるため。
  // 見えていない区画は編集画面に出てこないので、ここへは自分に見える区画のidしか来ない。
  REMOVE_INFO_SECTION({ prevState, payload, commit }) {
    const { id, sectionId } = payload;
    const target = prevState.infoEntries.find(entry => entry.id === id);
    if (!target) return;
    if (target.sections.length <= 1) return;
    if (!target.sections.some(s => s.id === sectionId)) return;

    commit({
      infoEntries: prevState.infoEntries.map(entry => (
        entry.id === id
          ? Object.freeze({
              ...entry,
              sections: Object.freeze(entry.sections.filter(s => s.id !== sectionId))
            })
          : entry
      ))
    });
  },

  // 読み込んだ部屋データの情報を、GMが自分のものとして引き取る（js/state-import.js）。
  // 取り込みの時点ではまだGMが決まっていないことがある（部屋作成と同時の読み込み）ため、
  // 引き取りは取り込みと分けてこのアクションにしてある。発火はjs/info-panel.js。
  // 公開先が設定されていた区画は取り込み時に宛先なし（＝誰にも見えない）へ潰してあるので、
  // ここでGMを宛先に入れて初めて画面に出る。全員公開だった区画はそのまま触らない。
  CLAIM_RESTORED_INFO({ prevState, payload, commit }) {
    const { participantId } = payload;
    if (!participantId) return;
    if (!prevState.infoEntries.some(entry => entry.restoredFromImport)) return;

    commit({
      infoEntries: prevState.infoEntries.map(entry => {
        if (!entry.restoredFromImport) return entry;

        const { restoredFromImport, ...rest } = entry;
        return Object.freeze({
          ...rest,
          ownerId: participantId,
          sections: Object.freeze(entry.sections.map(section => (
            Array.isArray(section.audience)
              ? buildInfoSection({ ...section, audience: [participantId] })
              : section
          )))
        });
      })
    });
  },

  REMOVE_INFO_ENTRY({ prevState, payload, commit }) {
    const { id } = payload;
    if (!prevState.infoEntries.some(entry => entry.id === id)) return;

    commit({
      infoEntries: prevState.infoEntries.filter(entry => entry.id !== id)
    });
  },
};