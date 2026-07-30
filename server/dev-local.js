// server/dev-local.js
// 動作確認（検証）用の起動口。本番のUpstash Redis・Cloudflare R2へは一切つながず、
// server/rooms/room-N.json（ローカルファイル）だけで動かす。
//
//   npm run dev      （既定ポート8082。PORT環境変数で変更可）
//
// 通常の `npm start`（server/index.js）は .env を読むため、Upstashの接続情報が設定されて
// いると本番と同じデータを読み書きする。検証のつもりで起動したサーバーが本番の部屋を
// 書き換えてしまう事故が実際に起きたため、検証時は必ずこちらを使う。
//
// やっていること：
//   1. dotenvが .env を読まないようにする（存在しないパスを見させる）
//   2. それでも環境に残っている本番の接続情報を落とす
//   3. そのうえで本体（index.js）を読み込む
// import文は巻き上げられて先に実行されてしまうため、本体の読み込みは動的importで行う。

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dotenvはDOTENV_CONFIG_PATHで指定されたファイルを読む。存在しないパスにしておけば、
// 本体側の `import 'dotenv/config'` は何も読み込まない。
process.env.DOTENV_CONFIG_PATH = path.join(__dirname, 'dev-local.no-env');

const PRODUCTION_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL'
];

const cleared = PRODUCTION_KEYS.filter(key => process.env[key] !== undefined);
cleared.forEach(key => { delete process.env[key]; });

// 本番と同じ既定ポート(8081)だと、どちらを開いているのか分からなくなるのでずらす
process.env.PORT = process.env.PORT || '8082';

console.log('[dev-local] 検証モードで起動します：本番のRedis/R2には接続しません');
console.log('[dev-local] 部屋データの読み書きは server/rooms/room-N.json（gitignore対象）だけです');
if (cleared.length > 0) {
  console.log(`[dev-local] 環境から落とした接続情報: ${cleared.join(', ')}`);
}
console.log('[dev-local] 音源のアップロードはR2未設定のため無効です（URLでの追加は使えます）');

await import('./index.js');
