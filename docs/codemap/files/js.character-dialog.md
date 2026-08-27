---
source: js/character-dialog.js
lines: 1107
exports: 5
imported_by: 2
api_sha: 14bcbd0e5a8f
prose_sha: 14bcbd0e5a8f
generated: 2026-08-27
tags: [codemap]
---

# js/character-dialog.js

<!-- prose:summary -->
キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを まとめて入力するためのモーダルダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマの新規登録・編集モーダル。名前・画像・トリミング・デフォルトパラメータ・カスタムパラメータ・公開範囲をまとめて扱う。システム固有のパラメータ欄は [[js.parameters.registry]] が返すプラグイン記述子から組み立てるため、DX3 やシノビガミ固有の知識はここには無い。プラグイン専用スペース（buildPluginPanel）へは、store を直接読めないプラグインの代わりに Core が集めた値一式（`getToken` / `dispatch` / `participants` / 他のコマを名前で引く `findTokenByName`）を素通しする。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 17 | fn | defaultImageCrop | `defaultImageCrop()` | コマ画像トリミングの既定値：ズームなし・中央。 |
| 24 | fn | applyImageCropStyle | `applyImageCropStyle(imgEl, crop)` | トリミング設定(crop)を<img>のCSSへ反映する。 |
| 47 | fn | applyCharacterEditResult | `applyCharacterEditResult(store, tokenId, result)` | showCharacterEditDialogのonConfirmが返す結果を、Store（部屋のstore、または js/character-builder.jsが使う部屋に紐づかない使い捨てのImmutableS… |
| 446 | fn | showCharacterDialog | `showCharacterDialog({ activePluginId = null, participants = {}, onConfirm })` | activePluginId?: string \| null, onConfirm: (result: { name: string, image: string \| null, imageCrop: {zoom:n… |
| 725 | fn | showCharacterEditDialog | `showCharacterEditDialog({ character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm, dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false })` | 既存キャラクターの名前・パラメータ値を更新するためのダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 17 | defaultImageCrop | `defaultImageCrop()` | 3 | ✓ |
| 24 | applyImageCropStyle | `applyImageCropStyle(imgEl, crop)` | 9 | ✓ |
| 47 | applyCharacterEditResult | `applyCharacterEditResult(store, tokenId, result)` | 67 | ✓ |
| 118 | buildPluginPanel | `buildPluginPanel({ activePluginId, mode, canEdit = true, parameters, components, onComponentChange, getComponents, dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, allowParameterEdit = false, participants = {}, myParticipantId = null })` | 38 |  |
| 162 | buildImagePicker | `buildImagePicker(initialImage, initialCrop, { readOnly = false } = {})` | 140 |  |
| 304 | buildSizeInput | `buildSizeInput(initialSize)` | 17 |  |
| 323 | buildTextColorInput | `buildTextColorInput(initialColor)` | 15 |  |
| 341 | buildVisibleCheckbox | `buildVisibleCheckbox(initialVisible)` | 20 |  |
| 365 | buildParameterVisibilityToggle | `buildParameterVisibilityToggle(initialChecked = true)` | 13 |  |
| 382 | buildAudienceButton | `buildAudienceButton({ getLabel, getAudience, setAudience, participants, myParticipantId })` | 30 |  |
| 416 | canToggleParameterVisibility | `canToggleParameterVisibility(param)` | 3 |  |
| 423 | parseCustomParameterValue | `parseCustomParameterValue(raw)` | 6 |  |
| 432 | ensureDialog | `ensureDialog()` | 7 |  |
| 446 | showCharacterDialog | `showCharacterDialog({ activePluginId = null, participants = {}, onConfirm })` | **233** | ✓ |
| 682 | ensureEditDialog | `ensureEditDialog()` | 7 |  |
| 725 | showCharacterEditDialog | `showCharacterEditDialog({ character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm, dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false })` | **383** | ✓ |

## 依存

- import → [[js.audience-picker]], [[js.buff-dialog]], [[js.icons]], [[js.image-upload]], [[js.local-identity]], [[js.parameters.core]], [[js.parameters.registry]], [[js.read-only-form]], [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.character-builder]]

## 注意

<!-- prose:notes -->
プラグインへ渡す値は**このファイルが増やす場所**ではなく、素通しするだけ。実体は呼び出し元（[[js.board-data-driven]] は部屋の store、[[js.character-builder]] は下書き用の store）が用意する。部屋の外＝コマ作成ツールからは `rollBCDice` や `findTokenByName` が渡ってこないので、使う側のプラグインが「部屋の中で実行してください」と断ること。
<!-- /prose:notes -->
