// js/store/handlers/scenes.js
// シーン（GMが場面ごとに盤面の見た目を保存し、1クリックで切り替えるための入れ物）。
//
// 保存するのは背景・盤面サイズ・パネルだけで、コマ・チャット・参加者・ラウンド進行には
// 触れない。「シーンチェンジで残す」指定のパネルはどのシーンにも属さない。

import { SCENE_BGM_STOP } from '../audio.js';
import { applyPhaseEnd } from '../buffs.js';
import { releaseStockerCards } from '../cards.js';
import { withBgmLog, withSystemLog, withSystemTabLog } from '../chat.js';
import { normalizeImageRef } from '../images.js';
import { freezePanelMap, ownEntry, withMapEntry, withoutMapEntry } from '../patch.js';

export const SCENES_HANDLERS = {
  // --- シーン（js/scene-list-dialog.js） ---
  // GMが場面ごとに盤面の見た目（背景・盤面サイズ・パネル）を保存し、1クリックで
  // 切り替えるための機能。すべてGM限定で、server/index.jsのGM_ONLY_ACTIONSにも
  // 同じ4つを入れてある（片方だけ変えると画面とサーバーの判断がずれる）。

  // 「今の盤面をシーンとして保存」。同じidで呼べば上書き保存になる
  // （ADD_ORIGINAL_TABLEと同じ「キー重複＝上書き」の規則）。
  //
  // 盤面の中身をprevStateから読まずpayloadで受け取るのは、保存の瞬間に他の人が
  // パネルを動かしていると、各クライアントが自分のローカル状態を写してしまい、
  // 端末ごとに違うスナップショットが焼き付くため。普通のアクションなら後続の差分で
  // 収束するが、シーンは保存された記録としてずれたまま恒久的に残ってしまう。
  SAVE_SCENE({ prevState, payload, commit }) {
    const { id, name, text = '', bgmTrackId = null, background = {}, panels = {} } = payload;
    if (!id || !name) return;
    const room = prevState.room;

    const scene = Object.freeze({
      id,
      name,
      text: text || '',
      bgmTrackId: bgmTrackId || null,
      backgroundImage: normalizeImageRef(background.imageUrl),
      backgroundImageKey: background.imageKey || null,
      boardWidth: background.boardWidth || null,
      boardHeight: background.boardHeight || null,
      // この項目より前に保存されたシーンにはキーが無いので、既定（マス目あり）へ倒す
      showGrid: background.showGrid !== false,
      panels: freezePanelMap(panels)
    });

    commit({
      room: { ...room, scenes: withMapEntry(room.scenes || {}, id, scene) }
    });
  },

  // シーンの名前・本文・BGMだけを更新する（盤面は写し直さない）。
  // そのシーンへ遷移していない状態でも描写を書き足せるようにするために要る。
  UPDATE_SCENE_META({ prevState, payload, commit }) {
    const { id, name, text = '', bgmTrackId = null } = payload;
    const room = prevState.room;
    const scene = room.scenes?.[id];
    if (!scene || !name) return;

    commit({
      room: {
        ...room,
        scenes: withMapEntry(room.scenes, id, Object.freeze({
          ...scene, name, text: text || '', bgmTrackId: bgmTrackId || null
        }))
      }
    });
  },

  // シーンを削除する。R2上の背景画像には触らない（同じ画像を他のシーンや現在の盤面が
  // 参照していることがあるため。掃除は部屋の削除時にまとめて行う。server/index.js参照）。
  REMOVE_SCENE({ prevState, payload, commit }) {
    const { id } = payload;
    const room = prevState.room;
    if (!room.scenes?.[id]) return;

    commit({
      room: { ...room, scenes: withoutMapEntry(room.scenes, id) }
    });
  },

  // シーンへ遷移する。背景・盤面サイズ・パネル・BGM・シーン終了時のバフ消滅を
  // 1回のdispatchでまとめて反映する。分けて投げると、他クライアントに「新しいパネル＋
  // 古い背景」という中間状態が見えるうえ、途中に他の人の操作が割り込むと片方だけ
  // 適用された状態がそのまま残ってしまう（サーバーのGM判定もアクション単位のため、
  // 分けるとその分だけ穴が増える）。
  //
  // コマ・チャット・参加者・ラウンド進行には触れない（バフの消滅だけはコマに及ぶ）。
  // パネルは総入れ替えだが、keepOnSceneChangeが付いたものだけは持ち越す。
  // playIdは呼び出し側が採番する。ここでDate.now()を呼ぶと、各クライアントとサーバーが
  // 同じアクションを再実行したときに値がずれ、js/audio-player.jsの再生検知が壊れる。
  APPLY_SCENE({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { id, playId } = payload;
    const room = prevState.room;
    // 素の room.scenes?.[id] だと '__proto__' がObject.prototypeに当たって通ってしまう
    // （ownEntryのコメント参照。パネルのクリックオプションから実際に踏めた）
    const scene = ownEntry(room.scenes, id);
    if (!scene) return;

    // BGM: null=変えない / SCENE_BGM_STOP=止める / id指定=その曲。
    // 既に同じ曲が鳴っているときはplayIdを据え置く（変えると頭出しに戻ってしまう）。
    // 参照先の音源が削除されていた場合は「変えない」に倒す。
    const playback = room.audioPlayback || { bgm: null, se: null };
    let nextBgm = playback.bgm;
    if (scene.bgmTrackId === SCENE_BGM_STOP) {
      nextBgm = null;
    } else if (scene.bgmTrackId && room.audioTracks?.[scene.bgmTrackId]
      && playback.bgm?.trackId !== scene.bgmTrackId) {
      nextBgm = Object.freeze({ trackId: scene.bgmTrackId, playId });
    }

    // 前のシーンが終わったので、終了条件が「シーン」のバフ/デバフを消す（EXPIRE_BUFFSと同じ処理）。
    // シーンの内側であるラウンド/プロセス/判定のバフもここで一緒に消える。
    const { tokens, logText } = applyPhaseEnd(nextTokensState, activePlugin, 'scene');

    // 触るのはパネルだけで、カード・デッキ（state.cards／state.decks）には手を付けない。
    // コマと同じ扱いで、引いた手札や場に出ている札が場面転換で巻き戻ったり消えたり
    // しないようにするため。
    // 消えるストッカーの中身は盤面へ出す。カード自体はシーンで触らないので、
    // ここで出さないと「消えたパネルを指したまま、どこにも描かれないカード」が残る。
    // 「シーンチェンジで残す」パネルは、遷移先のパネルへ重ねて持ち越す。
    // 同じidが両方にある場合（この属性より前に保存したシーン等）は盤面側を採る：
    // 保存したあとに動かした位置・大きさを巻き戻したくないため。
    const keptPanels = Object.fromEntries(
      Object.entries(prevState.panels || {}).filter(([, panel]) => panel.keepOnSceneChange)
    );

    // 遷移後に居なくなるストッカーの中身を、消える前に盤面へ出す
    const nextPanels = freezePanelMap({ ...scene.panels, ...keptPanels });
    let nextCards = prevState.cards;
    Object.values(prevState.panels || {}).forEach(panel => {
      if (!panel.isStocker || nextPanels[panel.id]) return;
      nextCards = releaseStockerCards(nextCards, panel, payload.gridSize);
    });

    commit({
      room: {
        ...room,
        // 背景に「シーンチェンジで残す」が付いている間は、背景・盤面サイズを上書きしない
        // （js/background-dialog.js）。フラグ自体は...roomに乗ってそのまま残る。
        ...(room.keepBackgroundOnSceneChange ? {} : {
          backgroundImage: scene.backgroundImage || null,
          backgroundImageKey: scene.backgroundImageKey || null,
          boardWidth: scene.boardWidth || null,
          boardHeight: scene.boardHeight || null,
          showGrid: scene.showGrid !== false
        }),
        audioPlayback: withMapEntry(playback, 'bgm', nextBgm)
      },
      panels: nextPanels,
      ...(nextCards === prevState.cards ? {} : { cards: nextCards }),
      tokens,
      // フェーズ終了 → シーン開始 → BGMの順で残す（起きた順）。宛先は行ごとに違う：
      // 前のシーンのバフ消滅とBGMはシステムタブ（EXPIRE_BUFFS・withBgmLogと同じ扱い）、
      // 「シーンが変わった」こと自体は卓の流れなのでMainに出す。
      chatLogs: (() => {
        const afterScene = withSystemLog(
          withSystemTabLog(prevState.chatLogs, logText, payload.time),
          `シーン「${scene.name}」を開始しました。`,
          payload.time
        );
        if (nextBgm?.trackId === playback.bgm?.trackId) return afterScene;
        return withBgmLog(afterScene, room.audioTracks, nextBgm?.trackId || null, payload.time);
      })()
    });
  },
};