---
source: js/parameters/stella-knights.js
lines: 908
exports: 10
imported_by: 1
api_sha: 7017adbeff91
prose_sha: 7017adbeff91
generated: 2026-09-15
tags: [codemap]
---

# js/parameters/stella-knights.js

<!-- prose:summary -->
銀剣のステラナイツのプラグイン記述子（コマの種別・パラメータ・スキルとダイスドラフト・ブーケのコマンド・シートの取り込み）。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
防御力・チャージダイス数・ブーケと、バフの受け取り口のアタックダイス補正(DB)をコマに配り、HP を「耐久力」へ改称して流用する。DB は自動でダイス数へ足さない（卓が読んで振る）。出目の在庫はダイスドラフト（[[js.parameters.dice-draft.dice-draft-model]]）のプールが持ち、charge で振ってスキルへ置く。プチラッキー／ダイス追加／リロールはブーケを払うコマンドで、ダイス追加は打ったコマが払い、DB へ「判定終了で消滅」のバフを付ける（`>コマ名` で付け先だけ変わる。断る理由は払う前に全部見る）。部屋のブーケ合計はスタンプの押下回数から自動計算する。シートの取り込みは [[js.parameters.sheet-source]] の宣言で URL とファイルの両方から入る。スキル「始まりの部屋」は部屋全体に掛かる効果なので、記述子の roomExtensions（Core の「拡張ルーム設定」）と transformRollResult につなぐだけで、規則と計算は [[js.parameters.stella-knights-starting-room]]、欄の描画は [[js.parameters.stella-knights-starting-room-section]] が持つ。

コマの種別（ブリンガー／シース／NPC）の違いは `STELLA_KNIGHTS_TYPE_RULES` の1表に集めてあり、テスト（test/stella-knights-type.test.js）で表どうしの食い違いを止めている。シースは能力を持たず、自前のコマンドとダイスドラフト（`unavailableReason`）を断る。NPC は耐久力の公開先を持ち主だけにし、スキルの中身を持ち主以外に伏せる（[[js.visibility]] の canViewOwnerOnly、ダイスドラフトの `canViewSkillDetails`）。種別を切り替えたときの一覧表示・公開先は、更新画面の左側と食い違わないよう [[js.character-dialog]] の getCharacterOverrides で確定時に渡す（開いている間に dispatch すると確定で巻き戻るため）。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 149 | const | STELLA_KNIGHTS_CHAR_TYPES | `STELLA_KNIGHTS_CHAR_TYPES` |  |
| 167 | fn | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` |  |
| 172 | fn | readStellaKnightsCharType | `readStellaKnightsCharType(parameters)` |  |
| 191 | const | STELLA_KNIGHTS_TYPE_RULES | `STELLA_KNIGHTS_TYPE_RULES` | 種別ごとに何を持つか。 |
| 229 | fn | buildStellaKnightsTypeOverrides | `buildStellaKnightsTypeOverrides(charType, ownerId)` | 種別を切り替えたときに揃える、コマの見え方（js/character-dialog.jsのgetCharacterOverridesの形）。 |
| 243 | fn | stellaKnightsDraftUnavailableReason | `stellaKnightsDraftUnavailableReason(token)` | そのコマでダイスドラフト（とこのシステムのコマンド）を使えない理由。 |
| 248 | fn | canViewStellaKnightsSkills | `canViewStellaKnightsSkills(token, participantId)` | そのコマのスキルの中身を見てよいか（NPCは持ち主だけ。js/visibility.jsのcanViewOwnerOnly） |
| 794 | const | STELLA_KNIGHTS_SHEET_SOURCE | `STELLA_KNIGHTS_SHEET_SOURCE` | URLから取り込むときの受け付け先（受け付ける形と取得先の組み立ては js/parameters/sheet-source.js）。 |
| 847 | fn | importStellaKnightsCharacterJson | `importStellaKnightsCharacterJson(json)` | Webキャラクターシート（銀剣のステラナイツ）のJSONを取り込む。 |
| 879 | const | STELLA_KNIGHTS_PLUGIN | `STELLA_KNIGHTS_PLUGIN` |  |

## トップレベル関数（LOCAL TASKS 候補）（23）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 167 | buildStellaKnightsCharacterParameters | `buildStellaKnightsCharacterParameters()` | 3 | ✓ |
| 172 | readStellaKnightsCharType | `readStellaKnightsCharType(parameters)` | 4 | ✓ |
| 217 | rulesOf | `rulesOf(token)` | 3 |  |
| 229 | buildStellaKnightsTypeOverrides | `buildStellaKnightsTypeOverrides(charType, ownerId)` | 12 | ✓ |
| 243 | stellaKnightsDraftUnavailableReason | `stellaKnightsDraftUnavailableReason(token)` | 3 | ✓ |
| 248 | canViewStellaKnightsSkills | `canViewStellaKnightsSkills(token, participantId)` | 3 | ✓ |
| 265 | buildStellaKnightsRoomParameters | `buildStellaKnightsRoomParameters()` | 3 |  |
| 269 | computeStellaKnightsDerivedRoomParameters | `computeStellaKnightsDerivedRoomParameters(parameters, context = {})` | 8 |  |
| 278 | looksLikeStellaKnightsChatCommand | `looksLikeStellaKnightsChatCommand(rawInput)` | 9 |  |
| 289 | readStellaKnightsSkills | `readStellaKnightsSkills(components)` | 3 |  |
| 298 | renameHpToEndurance | `renameHpToEndurance({ readParameters, dispatch, tokenId })` | 10 |  |
| 309 | renderStellaKnightsCharacterPanel | `renderStellaKnightsCharacterPanel({ container, mode, canEdit = true, parameters = {}, components, onComponentChange, getComponents, dispatch, getToken, getEffectiveParameterValue, tokenId, myParticipantId = null })` | **201** |  |
| 514 | resetStellaKnightsComponentsOnPhaseEnd | `resetStellaKnightsComponentsOnPhaseEnd(components, phase)` | 7 |  |
| 528 | runPetitLucky | `runPetitLucky(input, { token, dispatch })` | 54 |  |
| 585 | readPayableBouquet | `readPayableBouquet(token, cost)` | 8 |  |
| 594 | logBouquetSpend | `logBouquetSpend(dispatch, token, input, lines)` | 13 |  |
| 620 | runDiceAdd | `runDiceAdd(input, { token, dispatch, findTokenByName, generateBuffId })` | 71 |  |
| 698 | runReroll | `runReroll(input, { token, dispatch })` | 21 |  |
| 723 | readImplicitChargeCount | `readImplicitChargeCount(token, roomParameters, getEffectiveParameterValue)` | 10 |  |
| 737 | handleStellaKnightsChatCommand | `handleStellaKnightsChatCommand( rawInput, { token, dispatch, rollBCDice, getEffectiveParameterValue, roomParameters, findTokenByName, generateBuffId } )` | 39 |  |
| 807 | skillNumberForRow | `skillNumberForRow(index)` | 3 |  |
| 822 | importStellaKnightsSkillsFromSheet | `importStellaKnightsSkillsFromSheet(json)` | 18 |  |
| 847 | importStellaKnightsCharacterJson | `importStellaKnightsCharacterJson(json)` | 31 | ✓ |

## 依存

- import → [[js.parameters.dice-draft.dice-draft-model]], [[js.parameters.dice-draft.dice-draft-pool]], [[js.parameters.dice-draft.dice-draft-roll]], [[js.parameters.paramFactory]], [[js.parameters.sheet-source]], [[js.parameters.skill.skill-box]], [[js.parameters.skill.skill-model]], [[js.parameters.stella-knights-starting-room-section]], [[js.parameters.stella-knights-starting-room]], [[js.visibility]]
- imported by → [[js.parameters.registry]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
