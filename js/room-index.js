// js/room-index.js
// 部屋一覧ページ（index.html）のロジック。/api/roomsで一覧を取得し、
// 使用中の部屋は「入室」リンク、空き部屋は名前・プラグイン・BCDiceシステム・
// （任意で）全データ読み込みの簡易フォームを表示する。部屋の作成自体は
// このページ上で完結させ（POST /api/rooms）、成功したらそのまま盤面へ遷移する。
// 部屋作成前はWebSocket接続を一切受け付けないサーバー側仕様と対になっている。

import { listPlugins } from './parameters/registry.js';

const BCDICE_SYSTEMS = [
  { id: 'ArknightsFan', label: 'アークナイツTRPG by Dapto' },
  { id: 'EarthDawn', label: 'アースドーン' },
  { id: 'EarthDawn3', label: 'アースドーン3版' },
  { id: 'EarthDawn4', label: 'アースドーン4版' },
  { id: 'Aoharubaan', label: 'あおはるばーんっ' },
  { id: 'Airgetlamh', label: '朱の孤塔のエアゲトラム' },
  { id: 'AssaultEngine', label: 'アサルトエンジン' },
  { id: 'AFF2e', label: 'ADVANCED FIGHTING FANTASY 2nd Edition' },
  { id: 'AnimaAnimus', label: 'アニマアニムス' },
  { id: 'AniMalus', label: 'アニマラス' },
  { id: 'Amadeus', label: 'アマデウス' },
  { id: 'Ayabito', label: 'あやびと' },
  { id: 'Arianrhod', label: 'アリアンロッドRPG' },
  { id: 'OrgaRain', label: '在りて遍くオルガレイン' },
  { id: 'AlchemiaStruggle', label: 'アルケミア・ストラグル' },
  { id: 'Alshard', label: 'アルシャード' },
  { id: 'ArsMagica', label: 'アルスマギカ' },
  { id: 'AlterRaise', label: 'アルトレイズ' },
  { id: 'UnsungDuet', label: 'アンサング・デュエット' },
  { id: 'IthaWenUa', label: 'イサー・ウェン＝アー' },
  { id: 'IfIfIf', label: 'イフ・イフ・イフ' },
  { id: 'YearZeroEngine', label: 'YearZeroEngine' },
  { id: 'Insane', label: 'インセイン' },
  { id: 'VampireTheMasquerade5th', label: 'Vampire: The Masquerade 5th Edition' },
  { id: 'VisionConnect', label: 'ヴィジョンコネクト' },
  { id: 'WitchQuest', label: 'ウィッチクエスト' },
  { id: 'Ventangle', label: 'Ventangle' },
  { id: 'Warhammer', label: 'ウォーハンマー' },
  { id: 'Warhammer4', label: 'ウォーハンマーRPG第4版' },
  { id: 'Utakaze', label: 'ウタカゼ' },
  { id: 'Alsetto', label: '詩片のアルセット' },
  { id: 'HeroScale', label: '英雄の尺度' },
  { id: 'AceKillerGene', label: 'エースキラージーン' },
  { id: 'EclipsePhase', label: 'エクリプス・フェイズ' },
  { id: 'NSSQ', label: 'SRSじゃない世界樹の迷宮TRPG' },
  { id: 'NRR', label: 'nRR' },
  { id: 'Ainecadette', label: 'エネカデット' },
  { id: 'EmbryoMachine', label: 'エムブリオマシンRPG' },
  { id: 'Emoklore', label: 'エモクロアTRPG' },
  { id: 'Elysion', label: 'エリュシオン' },
  { id: 'Elric', label: 'エルリック！' },
  { id: 'AngelGear', label: 'エンゼルギア 天使大戦TRPG The 2nd Editon' },
  { id: 'EndBreaker', label: 'エンドブレイカー！' },
  { id: 'Oukahoushin3rd', label: '央華封神RPG 第三版' },
  { id: 'OracleEngine', label: 'オラクルエンジン' },
  { id: 'GardenOrder', label: 'ガーデンオーダー' },
  { id: 'CardRanker', label: 'カードランカー' },
  { id: 'GURPS', label: 'ガープス' },
  { id: 'GurpsFW', label: 'ガープスフィルトウィズ' },
  { id: 'ChaosFlare', label: 'カオスフレア' },
  { id: 'OneWayHeroics', label: '片道勇者TRPG' },
  { id: 'Kamigakari', label: '神我狩' },
  { id: 'KamitsubakiCityUnderConstructionNarrative', label: '神椿市建設中。NARRATIVE' },
  { id: 'Comes', label: 'カムズ' },
  { id: 'Garako', label: 'ガラコと破界の塔' },
  { id: 'Karukami', label: 'カルカミ' },
  { id: 'KanColle', label: '艦これRPG' },
  { id: 'GundamSentinel', label: 'ガンダム・センチネルRPG' },
  { id: 'Gundog', label: 'ガンドッグ' },
  { id: 'GundogZero', label: 'ガンドッグゼロ' },
  { id: 'GundogRevised', label: 'ガンドッグ・リヴァイズド' },
  { id: 'KyokoShinshoku', label: '虚構侵蝕TRPG' },
  { id: 'KillDeathBusiness', label: 'キルデスビジネス' },
  { id: 'StellarKnights', label: '銀剣のステラナイツ' },
  { id: 'Kutulu', label: 'Kutulu' },
  { id: 'Cthulhu', label: 'クトゥルフ神話TRPG' },
  { id: 'CthulhuTech', label: 'クトゥルフテック' },
  { id: 'KurayamiCrying', label: 'クラヤミクライン' },
  { id: 'GranCrest', label: 'グランクレストRPG' },
  { id: 'GeishaGirlwithKatana', label: 'ゲイシャ・ガール・ウィズ・カタナ' },
  { id: 'GehennaAn', label: 'ゲヘナ・アナスタシス' },
  { id: 'KemonoNoMori', label: '獸ノ森' },
  { id: 'Revulture', label: '光砕のリヴァルチャー' },
  { id: 'Yggdrasill', label: '鋼鉄のユグドラシル' },
  { id: 'Illusio', label: '晃天のイルージオ' },
  { id: 'CodeLayerd', label: 'コード：レイヤード' },
  { id: 'Avandner', label: '黒絢のアヴァンドナー' },
  { id: 'GoblinSlayer', label: 'ゴブリンスレイヤーTRPG' },
  { id: 'Gorilla', label: 'ゴリラTRPG' },
  { id: 'ColossalHunter', label: 'コロッサルハンター' },
  { id: 'Postman', label: '壊れた世界のポストマン' },
  { id: 'ConvictorDrive', label: 'コンヴィクター・ドライブ' },
  { id: 'CyberpunkRed', label: 'サイバーパンクRED' },
  { id: 'SajinsenkiAGuS', label: '砂塵戦機アーガス' },
  { id: 'SajinsenkiAGuS2E', label: '砂塵戦機アーガス2ndEdition' },
  { id: 'Satasupe', label: 'サタスペ' },
  { id: 'TalesFromTheLoop', label: 'ザ・ループTRPG' },
  { id: 'SamsaraBallad', label: 'サンサーラ・バラッド' },
  { id: 'SharedFantasia', label: 'Shared†Fantasia' },
  { id: 'JamesBond', label: 'ジェームズ・ボンド007' },
  { id: 'JekyllAndHyde', label: 'ジキルとハイドとグリトグラ' },
  { id: 'LiveraDoll', label: '紫縞のリヴラドール' },
  { id: 'GhostLive', label: '実況ゴーストライヴ' },
  { id: 'ShinobiGami', label: 'シノビガミ' },
  { id: 'ShadowRun', label: 'シャドウラン' },
  { id: 'ShadowRun4', label: 'シャドウラン 4th Edition' },
  { id: 'ShadowRun5', label: 'シャドウラン 5th Edition' },
  { id: 'JuinKansen', label: '呪印感染' },
  { id: 'ShuumatsuKikou', label: '終末紀行ＲＰＧ' },
  { id: 'ShoujoTenrankai', label: '少女展爛会TRPG' },
  { id: 'InfiniteBabeL', label: '少年のための少女展爛会異聞 Infinite BabeL' },
  { id: 'Shiranui', label: '不知火' },
  { id: 'ShinkuuGakuen', label: '真空学園' },
  { id: 'Cthulhu7th', label: '新クトゥルフ神話TRPG' },
  { id: 'ShinMegamiTenseiKakuseihen', label: '真・女神転生TRPG 覚醒篇' },
  { id: 'ScreamHighSchool', label: 'スクリームハイスクール' },
  { id: 'StarryDolls', label: 'スタリィドール' },
  { id: 'SRS', label: 'スタンダードRPGシステム' },
  { id: 'SteamPunkers', label: 'スチームパンカーズ' },
  { id: 'StellarLife', label: 'ステラーライフTRPG' },
  { id: 'StratoShout', label: 'ストラトシャウト' },
  { id: 'Siren', label: '終末アイドル育成TRPG セイレーン' },
  { id: 'EtrianOdysseySRS', label: '世界樹の迷宮SRS' },
  { id: 'ZettaiReido', label: '絶対隷奴' },
  { id: 'SevenFortressMobius', label: 'セブン＝フォートレス メビウス' },
  { id: 'TherapieSein', label: 'セラフィザイン' },
  { id: 'Sengensyou', label: '千幻抄' },
  { id: 'Villaciel', label: '蒼天のヴィラシエル' },
  { id: 'SwordWorld', label: 'ソード・ワールドRPG' },
  { id: 'SwordWorld2.0', label: 'ソード・ワールド2.0' },
  { id: 'SwordWorld2.5', label: 'ソード・ワールド2.5' },
  { id: 'ZombiLine', label: 'ゾンビライン' },
  { id: 'DarkSouls', label: 'ダークソウルTRPG' },
  { id: 'DarkDaysDrive', label: 'ダークデイズドライブ' },
  { id: 'DarkBlaze', label: 'ダークブレイズ' },
  { id: 'DiceOfTheDead', label: 'ダイス・オブ・ザ・デッド' },
  { id: 'DoubleCross', label: 'ダブルクロス2nd,3rd' },
  { id: 'DungeonsAndDragons', label: 'ダンジョンズ＆ドラゴンズ' },
  { id: 'DungeonsAndDragons5', label: 'ダンジョンズ＆ドラゴンズ第5版' },
  { id: 'Paradiso', label: 'チェレステ色のパラディーゾ' },
  { id: 'Chill', label: 'Chill' },
  { id: 'Chill3', label: 'Chill 3rd Edition' },
  { id: 'CrashWorld', label: '墜落世界' },
  { id: 'StrangerOfSwordCity', label: '剣の街の異邦人TRPG' },
  { id: 'DesperateRun', label: 'Desperate Run TRPG' },
  { id: 'DetatokoSaga', label: 'でたとこサーガ' },
  { id: 'DeadlineHeroes', label: 'デッドラインヒーローズRPG' },
  { id: 'DemonSpike', label: 'デモンスパイク' },
  { id: 'DemonParasite', label: 'デモンパラサイト' },
  { id: 'TenkaRyouran', label: '天下繚乱' },
  { id: 'TokyoGhostResearch', label: '東京ゴーストリサーチ' },
  { id: 'TokyoNova', label: 'トーキョーN◎VA' },
  { id: 'Torg', label: 'トーグ' },
  { id: 'Torg1.5', label: 'トーグ1.5版' },
  { id: 'TorgEternity', label: 'トーグ エタニティ' },
  { id: 'TokumeiTenkousei', label: '特命転攻生' },
  { id: 'ToshiakiHolyGrailWar', label: 'としあきの聖杯戦争TRPG' },
  { id: 'Dracurouge', label: 'ドラクルージュ' },
  { id: 'TrinitySeven', label: 'トリニティセブンRPG' },
  { id: 'TwilightGunsmoke', label: 'トワイライトガンスモーク' },
  { id: 'TunnelsAndTrolls', label: 'トンネルズ＆トロールズ' },
  { id: 'NightWizard', label: 'ナイトウィザード The 2nd Edition' },
  { id: 'NightWizard3rd', label: 'ナイトウィザード The 3rd Edition' },
  { id: 'NightmareHunterDeep', label: 'ナイトメアハンター=ディープ' },
  { id: 'NinjaSlayer', label: 'ニンジャスレイヤーTRPG' },
  { id: 'NinjaSlayer2', label: 'ニンジャスレイヤーTRPG 2版' },
  { id: 'NjslyrBattle', label: 'NJSLYRBATTLE' },
  { id: 'Nuekagami', label: '鵺鏡' },
  { id: 'Nechronica', label: 'ネクロニカ' },
  { id: 'NeverCloud', label: 'ネバークラウドTRPG' },
  { id: 'NobunagasBlackCastle', label: '信長の黒い城' },
  { id: 'HarnMaster', label: 'ハーンマスター' },
  { id: 'CastleInGray', label: '灰色城綺譚' },
  { id: 'Skynauts', label: '歯車の塔の探空士（六畳間幻想空間）' },
  { id: 'SkynautsBouken', label: '歯車の塔の探空士（冒険企画局）' },
  { id: 'Bakenokawa', label: 'バケノカワ' },
  { id: 'PastFutureParadox', label: 'パストフューチャーパラドックス' },
  { id: 'Pathfinder', label: 'Pathfinder' },
  { id: 'BadLife', label: 'バッドライフ' },
  { id: 'HatsuneMiku', label: '初音ミクTRPG ココロダンジョン' },
  { id: 'BattleTech', label: 'バトルテック' },
  { id: 'ParasiteBlood', label: 'パラサイトブラッドRPG' },
  { id: 'Paranoia', label: 'パラノイア' },
  { id: 'ParanoiaRebooted', label: 'パラノイア リブーテッド' },
  { id: 'BarnaKronika', label: 'バルナ・クロニカ' },
  { id: 'PulpCthulhu', label: 'パルプ・クトゥルフ' },
  { id: 'HunterTheReckoning5th', label: 'Hunter: The Reckoning 5th Edition' },
  { id: 'Raisondetre', label: '叛逆レゾンデートル' },
  { id: 'HuntersMoon', label: 'ハンターズ・ムーン' },
  { id: 'Peekaboo', label: 'ピーカーブー' },
  { id: 'BeastBindTrinity', label: 'ビーストバインド トリニティ' },
  { id: 'BBN', label: 'BBNTRPG' },
  { id: 'Hieizan', label: '比叡山炎上' },
  { id: 'BeginningIdol', label: 'ビギニングアイドル' },
  { id: 'BeginningIdol2022', label: 'ビギニングアイドル（2022年改訂版）' },
  { id: 'Irisbane', label: '瞳逸らさぬイリスベイン' },
  { id: 'PhantasmAdventure', label: 'ファンタズム・アドベンチャー' },
  { id: 'Fiasco', label: 'フィアスコ' },
  { id: 'FilledWith', label: 'フィルトウィズ' },
  { id: 'FateCoreSystem', label: 'Fate Core System' },
  { id: 'FutariSousa', label: 'フタリソウサ' },
  { id: 'BlindMythos', label: 'ブラインド・ミトスRPG' },
  { id: 'BloodCrusade', label: 'ブラッド・クルセイド' },
  { id: 'BloodMoon', label: 'ブラッドムーン' },
  { id: 'Bloodorium', label: 'ブラドリウム' },
  { id: 'FullFace', label: 'フルフェイス' },
  { id: 'FullMetalPanic', label: 'フルメタル・パニック！RPG' },
  { id: 'BladeOfArcana', label: 'ブレイド・オブ・アルカナ' },
  { id: 'Strave', label: '碧空のストレイヴ' },
  { id: 'PersonaO', label: 'ペルソナTRPG-O' },
  { id: 'Pendragon', label: 'ペンドラゴン' },
  { id: 'HouraiGakuen', label: '蓬莱学園の冒険!!' },
  { id: 'MagicaLogia', label: 'マギカロギア' },
  { id: 'MamonoScramble', label: 'マモノスクランブル' },
  { id: 'InfiniteFantasia', label: '無限のファンタジア' },
  { id: 'MeikyuKingdom', label: '迷宮キングダム' },
  { id: 'MeikyuKingdomBasic', label: '迷宮キングダム 基本ルールブック' },
  { id: 'MeikyuDays', label: '迷宮デイズ' },
  { id: 'MetallicGuardian', label: 'メタリックガーディアンRPG' },
  { id: 'MetalHead', label: 'メタルヘッド' },
  { id: 'MetalHeadExtream', label: 'メタルヘッドエクストリーム' },
  { id: 'MonotoneMuseum', label: 'モノトーンミュージアムRPG' },
  { id: 'YankeeYogSothoth', label: 'ヤンキー＆ヨグ＝ソトース' },
  { id: 'GoldenSkyStories', label: 'ゆうやけこやけ' },
  { id: 'Liminal', label: 'リミナル' },
  { id: 'Ryutama', label: 'りゅうたま' },
  { id: 'RyuTuber', label: 'リューチューバーとちいさな奇跡' },
  { id: 'RuinBreakers', label: 'ルーインブレイカーズ' },
  { id: 'RuneQuest', label: 'ルーンクエスト' },
  { id: 'RuneQuestRoleplayingInGlorantha', label: 'ルーンクエスト：ロールプレイング・イン・グローランサ' },
  { id: 'RecordOfSteam', label: 'Record of Steam' },
  { id: 'RecordOfLodossWar', label: 'ロードス島戦記RPG' },
  { id: 'RoleMaster', label: 'ロールマスター' },
  { id: 'LogHorizon', label: 'ログ・ホライズンTRPG' },
  { id: 'RokumonSekai2', label: '六門世界RPG セカンドエディション' },
  { id: 'LostRecord', label: 'ロストレコード' },
  { id: 'LostRoyal', label: 'ロストロイヤル' },
  { id: 'WerewolfTheApocalypse5th', label: 'Werewolf: The Apocalypse 5th Edition' },
  { id: 'WaresBlade', label: 'ワースブレイド' },
  { id: 'WARPS', label: 'ワープス' },
  { id: 'WorldsEndFrontline', label: 'ワールドエンドフロントライン' },
  { id: 'WorldOfDarkness', label: 'ワールド・オブ・ダークネス' },
  { id: 'Cthulhu:ChineseTraditional', label: '克蘇魯神話' },
  { id: 'Cthulhu7th:ChineseTraditional', label: '克蘇魯神話第7版' },
  { id: 'KillDeathBusiness:Korean', label: 'Kill Death Business (한국어)' },
  { id: 'Nechronica:Korean', label: '네크로니카' },
  { id: 'DoubleCross:Korean', label: '더블크로스2nd,3rd' },
  { id: 'DetatokoSaga:Korean', label: '데타토코 사가' },
  { id: 'FutariSousa:Korean', label: '둘이서 수사' },
  { id: 'Dracurouge:Korean', label: '드라크루주' },
  { id: 'LogHorizon:Korean', label: '로그 호라이즌' },
  { id: 'MagicaLogia:Korean', label: '마기카로기아' },
  { id: 'MonotoneMuseum:Korean', label: '모노톤 뮤지엄' },
  { id: 'BeginningIdol:Korean', label: '비기닝 아이돌' },
  { id: 'StratoShout:Korean', label: '스트라토 샤우트' },
  { id: 'Amadeus:Korean', label: '아마데우스' },
  { id: 'StellarKnights:Korean', label: '은검의 스텔라나이츠' },
  { id: 'Insane:Korean', label: '인세인' },
  { id: 'Kamigakari:Korean', label: '카미가카리' },
  { id: 'Cthulhu:Korean', label: '크툴루' },
  { id: 'Cthulhu7th:Korean', label: '크툴루의 부름 7판' },
  { id: 'Fiasco:Korean', label: '피아스코' },
  { id: 'Cthulhu:SimplifiedChinese', label: '克苏鲁的呼唤 第六版' },
  { id: 'SwordWorld:SimplifiedChinese', label: '剑世界' },
  { id: 'SwordWorld2.0:SimplifiedChinese', label: '剑世界2.0' },
  { id: 'SwordWorld2.5:SimplifiedChinese', label: '剑世界2.5' },
  { id: 'MagicaLogia:SimplifiedChinese', label: '魔导书大战' }
];

const roomListEl = document.getElementById('roomList');

function buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {}) {
  select.innerHTML = '';
  if (noneLabel) {
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = noneLabel;
    select.appendChild(noneOpt);
  }
  options.forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt[valueKey];
    el.textContent = opt[labelKey];
    select.appendChild(el);
  });
}

function buildOccupiedCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';

  const header = document.createElement('div');
  header.className = 'room-card-header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'room-card-title';
  title.textContent = room.name || room.id;
  titleBlock.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'room-card-meta';
  const pluginLabel = room.activePlugin ? room.activePlugin : 'プラグインなし';
  const bcdiceLabel = BCDICE_SYSTEMS.find((s) => s.id === room.bcdiceSystem)?.label || room.bcdiceSystem;
  meta.textContent = `${pluginLabel} / ${bcdiceLabel}`;
  titleBlock.appendChild(meta);

  header.appendChild(titleBlock);

  const joinLink = document.createElement('a');
  joinLink.className = 'btn';
  joinLink.textContent = '入室';
  joinLink.href = `/combined_layout.html?room=${encodeURIComponent(room.id)}`;
  header.appendChild(joinLink);

  card.appendChild(header);
  return card;
}

function buildVacantCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card vacant';

  const header = document.createElement('div');
  header.className = 'room-card-header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'room-card-title';
  title.textContent = `${room.id}（空き部屋）`;
  titleBlock.appendChild(title);
  header.appendChild(titleBlock);

  const setupBtn = document.createElement('button');
  setupBtn.type = 'button';
  setupBtn.className = 'btn btn-secondary';
  setupBtn.textContent = '初期設定';
  setupBtn.addEventListener('click', () => {
    card.classList.toggle('open');
  });
  header.appendChild(setupBtn);

  card.appendChild(header);

  // --- 初期設定フォーム（名前・プラグイン・BCDiceシステム・全データ読み込み） ---
  const form = document.createElement('form');
  form.className = 'vacant-form';

  const nameGroup = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = '部屋名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.placeholder = room.id;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  const selectRow = document.createElement('div');
  selectRow.className = 'vacant-form-row';

  const pluginGroup = document.createElement('div');
  const pluginLabel = document.createElement('label');
  pluginLabel.textContent = 'プラグイン（システム）';
  const pluginSelect = document.createElement('select');
  buildSelectOptions(pluginSelect, listPlugins(), { noneLabel: '（プラグインなし）' });
  pluginGroup.appendChild(pluginLabel);
  pluginGroup.appendChild(pluginSelect);
  selectRow.appendChild(pluginGroup);

  const bcdiceGroup = document.createElement('div');
  const bcdiceLabel = document.createElement('label');
  bcdiceLabel.textContent = 'BCDiceのシステム';
  const bcdiceSelect = document.createElement('select');
  buildSelectOptions(bcdiceSelect, BCDICE_SYSTEMS);
  bcdiceGroup.appendChild(bcdiceLabel);
  bcdiceGroup.appendChild(bcdiceSelect);
  selectRow.appendChild(bcdiceGroup);

  form.appendChild(selectRow);

  const fileGroup = document.createElement('div');
  const fileLabel = document.createElement('label');
  fileLabel.textContent = '部屋の全データ読み込み（任意・以前保存したファイル）';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileGroup.appendChild(fileLabel);
  fileGroup.appendChild(fileInput);
  form.appendChild(fileGroup);

  const errorText = document.createElement('p');
  errorText.className = 'error-text';
  errorText.style.display = 'none';
  form.appendChild(errorText);

  const btnRow = document.createElement('div');
  btnRow.className = 'vacant-form-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => card.classList.remove('open'));
  btnRow.appendChild(cancelBtn);

  const createBtn = document.createElement('button');
  createBtn.type = 'submit';
  createBtn.className = 'btn';
  createBtn.textContent = '作成して入室';
  btnRow.appendChild(createBtn);

  form.appendChild(btnRow);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorText.style.display = 'none';

    let importedState;
    const file = fileInput.files?.[0];
    if (file) {
      try {
        importedState = JSON.parse(await file.text());
      } catch (error) {
        errorText.textContent = `ファイルの読み込みに失敗しました: ${error.message}`;
        errorText.style.display = 'block';
        return;
      }
    }

    createBtn.disabled = true;
    createBtn.textContent = '作成中...';

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.id,
          name: nameInput.value,
          activePlugin: pluginSelect.value || null,
          bcdiceSystem: bcdiceSelect.value,
          importedState
        })
      });

      const result = await response.json();
      if (!response.ok) {
        errorText.textContent = result.error || '部屋の作成に失敗しました。';
        errorText.style.display = 'block';
        createBtn.disabled = false;
        createBtn.textContent = '作成して入室';
        return;
      }

      window.location.href = `/combined_layout.html?room=${encodeURIComponent(room.id)}`;
    } catch (error) {
      errorText.textContent = `通信エラー: ${error.message}`;
      errorText.style.display = 'block';
      createBtn.disabled = false;
      createBtn.textContent = '作成して入室';
    }
  });

  card.appendChild(form);
  return card;
}

async function loadRooms() {
  try {
    const response = await fetch('/api/rooms');
    const data = await response.json();

    roomListEl.innerHTML = '';
    data.rooms.forEach((room) => {
      const card = room.occupied ? buildOccupiedCard(room) : buildVacantCard(room);
      roomListEl.appendChild(card);
    });
  } catch (error) {
    roomListEl.innerHTML = '';
    const errorEl = document.createElement('p');
    errorEl.style.color = '#f28b82';
    errorEl.textContent = `部屋一覧の取得に失敗しました: ${error.message}`;
    roomListEl.appendChild(errorEl);
  }
}

loadRooms();
