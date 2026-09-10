// js/check-view/skill-table-view.js
// 拡張判定UIの「特技表判定」ビュー：サイコロ・フィクション系（シノビガミ／インセイン等）の
// 分野×出目の表を出し、マスをクリックして判定を振る。
//
// 表を組むのは js/parameters/saikoro-fiction/skill-table-box.js の buildSkillTableView で、
// キャラクター更新ダイアログ（表の設定）と同じ実装。ここはそれを器のコンテキストへ繋ぐだけ。
//
// 【組み直さず refresh() で済ませる】
// 修正値の入力欄はコマのパラメータを直接書き換えるので、値を1つ直すたびに parameters の
// 参照が変わり、器から render が呼ばれる。そのたびに DOM を作り直すと、次の欄へ Tab で
// 移った瞬間にフォーカスが飛ぶ。同じコマ・同じ表を見ている間は組み直さず、
// buildSkillTableView が持つ refresh()（状態と修正値の読み直し）だけを呼ぶ。

import { buildSkillTableView } from '../parameters/saikoro-fiction/skill-table-box.js';

export function createSkillTableView() {
  // 今出している表。コマか表そのもの（PC/エネミー）が変わったときだけ組み直す。
  let mounted = null;   // { tokenId, tableId, canEdit, view }

  return {
    id: 'skillTable',

    title: (decl) => decl?.label ?? '特技判定',

    // components を丸ごと見れば、表の状態（skillTable）も PC/エネミーの別（sheetType）も拾える。
    // parameters は修正値の入力欄、buffs はその上に乗るバフの表示に効く
    // （ADD_BUFF は parameters を書き換えないので、これを見ないと表示が古いまま残る）。
    renderKey: ({ token }) => ({
      components: token?.components ?? null,
      parameters: token?.parameters ?? null,
      buffs: token?.buffs ?? null
    }),

    render(ctx) {
      const { container, spec: decl, canEdit, dispatch, getToken } = ctx;
      const token = getToken();
      if (!token) return;

      // PC/エネミーで表そのものが変わる。出し分けはプラグインの宣言の中に閉じている。
      const table = decl.tableFor(token.components);

      const same = mounted
        && mounted.tokenId === token.id
        && mounted.tableId === table.id
        && mounted.canEdit === canEdit;

      if (same) {
        mounted.view.refresh();
        return;
      }

      container.innerHTML = '';
      const view = buildSkillTableView({
        spec: table,
        // 状態は常に**今の**コマから読む。ダイアログ側と同時に開いていても、
        // 互いの変更を踏み潰さないための約束（skill-table-box.js の commit 参照）。
        readState: () => decl.stateFor(getToken()?.components),
        purpose: 'check',
        // パネルの見出しが既に「特技判定」なので、ここは件数だけの1行にする
        title: null,
        editable: canEdit,
        onSave: (nextState) => {
          const latest = getToken();
          if (!latest) return;
          dispatch('SET_COMPONENT', {
            id: latest.id, componentKey: decl.componentKey, value: nextState
          });
        },
        onCheck: canEdit
          ? (cellId) => decl.runCheck({
            cellId,
            token: getToken(),
            dispatch,
            rollBCDice: ctx.rollBCDice,
            getEffectiveParameterValue: ctx.getEffectiveParameterValue
          })
          : undefined,
        // スナップショットではなく関数で渡す：修正値の欄から書き換えた値が、
        // 同じ画面の中でそのまま反映される必要がある。
        getToken,
        getEffectiveParameterValue: ctx.getEffectiveParameterValue,
        // 他人のコマを見ているだけの時は渡さない＝欄は出るが触れない
        //（どんなバフが乗っているかは読めるようにしておく）。
        onParameterChange: canEdit
          ? (paramId, value) => dispatch('SET_PARAMETER', {
            characterId: getToken()?.id, paramId, value
          })
          : null
      });
      container.appendChild(view.element);
      mounted = { tokenId: token.id, tableId: table.id, canEdit, view };
    }
  };
}
