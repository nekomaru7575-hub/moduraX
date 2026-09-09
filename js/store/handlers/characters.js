// js/store/handlers/characters.js
// コマそのものの作成・削除と、コマが持つパラメータの操作。
//
// パラメータを触る case は、プラグインの自動計算（applyPluginDerivedParameters）を
// 通してから確定する。値を変えないもの（表示/公開先の切り替え）は通さない：
// 編集不可（editable:false）のパラメータも対象にできるようにするため。

import { EventBus } from '../../EventBus.js';
import { buildDefaultParameters } from '../../parameters/core.js';
import {
  applyPluginDerivedParameters, buildCharacterParametersForPlugin,
  withPluginParameterDeclarations
} from '../../parameters/registry.js';
import {
  buildUserParam, withEditableParamFields, withNewUserParam, withParamFields, withoutParam
} from '../params.js';
import { normalizeImageRef } from '../images.js';
import { normalizeAudience, patchCharacter, withMapEntry } from '../patch.js';
import { DEFAULT_TOKEN_COLOR } from '../room.js';
import { buildDerivedContext } from '../round-state.js';

export const CHARACTERS_HANDLERS = {
  ADD_CHARACTER({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const {
      id, name, x = 20, y = 20, color = DEFAULT_TOKEN_COLOR, image = null, size = 1,
      imageCrop = null, parameterOverrides = {}, parameterVisibility = {}, parameterAudience = {},
      customParameters = [], textColor = null, visible = true, ownerId = null
    } = payload;
    if (!id || !name) return;
    if (nextTokensState[id]) return;

    const parameters = {
      ...buildDefaultParameters(),
      ...buildCharacterParametersForPlugin(activePlugin)
    };

    Object.entries(parameterOverrides).forEach(([paramId, value]) => {
      if (parameters[paramId]) {
        parameters[paramId] = Object.freeze({ ...parameters[paramId], value });
      }
    });

    // 値とは別に、キャラクター一覧へ出すかどうかだけを作成時に指定する（HP等）。
    // 未指定なら各パラメータ定義の既定（buildParameters）のまま。
    Object.entries(parameterVisibility).forEach(([paramId, paramVisible]) => {
      if (parameters[paramId]) {
        parameters[paramId] = Object.freeze({ ...parameters[paramId], visible: !!paramVisible });
      }
    });

    // 同じく、値とは別に「誰に見せるか」も作成時に指定できる（HP等）
    Object.entries(parameterAudience).forEach(([paramId, audience]) => {
      if (parameters[paramId]) {
        parameters[paramId] = Object.freeze({ ...parameters[paramId], audience: normalizeAudience(audience) });
      }
    });

    customParameters.forEach(({ key, label, value, visible: paramVisible = true, audience: paramAudience = null }) => {
      parameters[`user:${key}`] = buildUserParam({ key, label, value, visible: paramVisible, audience: paramAudience });
    });

    // プラグインの自動計算を適用（activePlugin と parameters を正しく渡す）。
    // 作成直後はcomponentsが空なので、componentsから決まる値（ロイス数等）は0から始まる。
    const finalParameters = applyPluginDerivedParameters(
      activePlugin, parameters, {}, buildDerivedContext(prevState.round, id)
    );

    nextTokensState[id] = Object.freeze({
      id, name, x, y, color, image: normalizeImageRef(image), size: Math.max(1, Math.round(size)),
      imageCrop: imageCrop ? Object.freeze({ ...imageCrop }) : null, // コマ画像のトリミング（非破壊）
      textColor, // チャット欄でのキャラ名・発言テキストの色（未設定nullなら既定色）
      visible: !!visible, // false ならキャラクター一覧に表示しない（盤面上のコマ自体は表示されたまま）
      parameters: finalParameters, // ← 適用後のパラメータをセット
      components: Object.freeze({}),
      buffs: Object.freeze([]), // バフ/デバフ一覧（{id,name,paramId,delta,expirePhase}）
      actions: Object.freeze([]),
      // このコマの持ち主（参加者ID）。nullなら所有者なしで、誰でも更新・回収できる。
      // 更新/JSON読み込み/削除/バックヤードへの回収は持ち主とGMだけが行える（盤面上の移動は誰でも可）。
      ownerId: ownerId || null,
      inBackyard: false, // バックヤード（盤面外の個人保管場所）にしまわれているか
      // 旧データとゲスト（表示名なし）用の読み取り専用フィールド。しまった人のブラウザ単位のID。
      // 表示名を設定している人の棚はownerIdで判定する（MOVE_TO_BACKYARD参照）。
      backyardOwnerId: null
    });

    commit({ tokens: nextTokensState });
    EventBus.emit('CharacterCreated', { id });
  },

  REMOVE_CHARACTER({ payload, nextTokensState, commit }) {
    const { id } = payload;
    if (!nextTokensState[id]) return;
    delete nextTokensState[id];

    commit({ tokens: nextTokensState });
    EventBus.emit('CharacterDeleted', { id });
  },

  // 外部JSON（汎用/プラグイン拡張どちらも）の取り込み結果をまとめて適用する。
  // Core側はvalueOverrides/labelOverrides/newParametersの意味を解釈せず、
  // 既存paramIdへの反映・新規paramIdの追加という機械的な処理のみ行う。
  IMPORT_CHARACTER_DATA({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { id, name, valueOverrides = {}, labelOverrides = {}, newParameters = {}, components = {} } = payload;
    const character = nextTokensState[id];
    if (!character) return;

    let nextParams = { ...character.parameters };

    Object.entries(valueOverrides).forEach(([paramId, value]) => {
      if (nextParams[paramId] && typeof value === 'number') {
        nextParams[paramId] = Object.freeze({ ...nextParams[paramId], value });
      }
    });

    Object.entries(labelOverrides).forEach(([paramId, label]) => {
      if (nextParams[paramId] && typeof label === 'string') {
        nextParams[paramId] = Object.freeze({ ...nextParams[paramId], label });
      }
    });

    Object.entries(newParameters).forEach(([paramId, paramDef]) => {
      nextParams[paramId] = Object.freeze({ ...paramDef });
    });

    // componentsの中身（ロイス・エフェクト・コンボ等の複雑なデータ）はCoreは解釈せず、
    // componentKey単位でそのまま置き換えるだけ。
    // 自動計算にはcomponents（ロイス数等の算出元）を渡すため、先に反映後のcomponentsを作る。
    const nextComponents = Object.freeze({ ...character.components, ...components });

    nextParams = applyPluginDerivedParameters(
      activePlugin, nextParams, nextComponents, buildDerivedContext(prevState.round, id)
    );

    patchCharacter(nextTokensState, id, {
      name: name || character.name,
      parameters: nextParams,
      components: nextComponents
    });

    commit({ tokens: nextTokensState });
    EventBus.emit('CharacterImported', { id });
  },

  // 「コマをJSONで保存」で出力した完全なスナップショットから、コマを丸ごと復元する。
  // IMPORT_CHARACTER_DATAが値の上書きのみなのに対し、こちらは見た目（画像・色・サイズ等）や
  // components・buffsも含めて丸ごと置き換える。位置(x,y)・id・バックヤード状態は
  // 呼び出し側（既存コマへの上書き、またはドロップ位置での新規作成）の管轄なので触らない。
  RESTORE_CHARACTER_SNAPSHOT({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { id, snapshot } = payload;
    const character = nextTokensState[id];
    if (!character || !snapshot) return;

    const nextParams = { ...character.parameters };
    Object.entries(snapshot.parameters || {}).forEach(([paramId, paramDef]) => {
      nextParams[paramId] = Object.freeze({ ...paramDef });
    });
    const nextComponents = Object.freeze({ ...(snapshot.components || {}) });
    const calculatedParams = applyPluginDerivedParameters(
      activePlugin, nextParams, nextComponents, buildDerivedContext(prevState.round, id)
    );

    patchCharacter(nextTokensState, id, {
      name: snapshot.name || character.name,
      color: snapshot.color || character.color,
      image: normalizeImageRef(snapshot.image),
      imageCrop: snapshot.imageCrop ? Object.freeze({ ...snapshot.imageCrop }) : null,
      size: Math.max(1, Math.round(snapshot.size || character.size || 1)),
      textColor: snapshot.textColor ?? null,
      visible: snapshot.visible !== false,
      parameters: calculatedParams,
      components: nextComponents,
      buffs: Object.freeze((snapshot.buffs || []).map(buff => Object.freeze({ ...buff })))
    });

    commit({ tokens: nextTokensState });
    EventBus.emit('CharacterImported', { id });
  },

  // ロイス・エフェクト・コンボのような「ボックス」データを丸ごと更新する。
  // Coreはvalueの中身を解釈せず、componentKeyに紐づく値をそのまま置き換える。
  SET_COMPONENT({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { id, componentKey, value } = payload;
    const character = nextTokensState[id];
    if (!character || !componentKey) return;

    // ボックスの中身から決まるパラメータ（DX3のロイス数など）があるため、
    // componentsを差し替えたら自動計算も通し直す。値を直接書き込む必要が無いので、
    // それらのパラメータはeditable:false（手入力不可）のままにできる。
    const nextComponents = withMapEntry(character.components, componentKey, value);

    patchCharacter(nextTokensState, id, {
      components: nextComponents,
      parameters: applyPluginDerivedParameters(
        activePlugin, character.parameters, nextComponents, buildDerivedContext(prevState.round, id)
      )
    });

    commit({ tokens: nextTokensState });
  },

  SET_PARAMETER({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { characterId, paramId, value } = payload;
    const character = nextTokensState[characterId];
    if (!character) return;

    // 手入力できるか（editable）はプラグインの宣言が正なので、コマへ焼き付いた古い宣言を
    // 先に揃えてから弾く。ここで弾かれると自動計算まで到達しないため、
    // applyPluginDerivedParameters側の補正だけでは「後から手入力できるようにした
    // パラメータが、既存のコマでだけ永久に弾かれる」という状態になる。
    const declaredParams = withPluginParameterDeclarations(activePlugin, character.parameters);
    const nextParams = withEditableParamFields(declaredParams, paramId, { value }, 'このパラメータ');
    if (!nextParams) return;

    // プラグインの自動計算を通して新パラメータを取得
    patchCharacter(nextTokensState, characterId, {
      parameters: applyPluginDerivedParameters(
        activePlugin, nextParams, character.components,
        buildDerivedContext(prevState.round, characterId)
      )
    });

    commit({ tokens: nextTokensState });
    EventBus.emit('ParameterChanged', { characterId, paramId, value });
  },

  // 一覧での表示/非表示だけを切り替える。値を変えないため自動計算は通さず、
  // 編集不可（editable:false）のパラメータも対象にできる。
  SET_PARAMETER_VISIBILITY({ payload, nextTokensState, commit }) {
    const { characterId, paramId, visible } = payload;
    const character = nextTokensState[characterId];
    if (!character) return;

    const nextParams = withParamFields(character.parameters, paramId, { visible });
    if (!nextParams) return;

    patchCharacter(nextTokensState, characterId, { parameters: nextParams });

    commit({ tokens: nextTokensState });
    EventBus.emit('ParameterVisibilityChanged', { characterId, paramId, visible });
  },

  // パラメータ1件の公開先（誰に見せるか）だけを変える。値は変えないので自動計算は
  // 通さず、SET_PARAMETER_VISIBILITYと同じ扱いにする。
  SET_PARAMETER_AUDIENCE({ payload, nextTokensState, commit }) {
    const { characterId, paramId, audience } = payload;
    const character = nextTokensState[characterId];
    if (!character) return;

    const nextParams = withParamFields(character.parameters, paramId, { audience: normalizeAudience(audience) });
    if (!nextParams) return;

    patchCharacter(nextTokensState, characterId, { parameters: nextParams });

    commit({ tokens: nextTokensState });
  },

  REMOVE_PARAMETER({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { characterId, paramId } = payload;
    const character = nextTokensState[characterId];
    if (!character) return;

    const nextParams = withoutParam(character.parameters, paramId, 'このパラメータ');
    if (!nextParams) return;

    // 自動計算の再評価
    patchCharacter(nextTokensState, characterId, {
      parameters: applyPluginDerivedParameters(
        activePlugin, nextParams, character.components,
        buildDerivedContext(prevState.round, characterId)
      )
    });

    commit({ tokens: nextTokensState });
  },

  ADD_PARAMETER({ prevState, payload, activePlugin, nextTokensState, commit }) {
    const { characterId, key, label, value, visible = true, audience = null } = payload;
    const character = nextTokensState[characterId];
    if (!key || !character) return;

    const nextParams = withNewUserParam(character.parameters, { key, label, value, visible, audience });
    if (!nextParams) return;

    // 自動計算の適用
    patchCharacter(nextTokensState, characterId, {
      parameters: applyPluginDerivedParameters(
        activePlugin, nextParams, character.components,
        buildDerivedContext(prevState.round, characterId)
      )
    });

    commit({ tokens: nextTokensState });
  },
};