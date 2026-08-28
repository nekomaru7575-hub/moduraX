// codemap.mjs — エージェント向けコードマップ生成器
//
// js/ と server/ の .js を走査して docs/codemap/ にインデックスを生成する。
// 構造（シグネチャ・行番号・依存グラフ）は毎回作り直し、人が書いた散文だけを引き継ぐ。
//
//   node tools/codemap.mjs                        全ファイル再生成
//   node tools/codemap.mjs --files js/main.js     指定ファイルのノートだけ更新（INDEX は常に全体）
//   node tools/codemap.mjs --check                書かずに、散文が要更新のファイルだけ報告
//   node tools/codemap.mjs --accept js/main.js    散文を書き直した印を付ける（prose_sha を更新）
//   node tools/codemap.mjs --sync-vault           生成後に Obsidian Vault へコピー
//
// 依存パッケージは追加しない。Node 標準のみ。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = process.cwd();
const OUT_DIR = 'docs/codemap';
const FILES_DIR = `${OUT_DIR}/files`;
const SOURCE_RE = /^(js|server)\/.*\.js$/;
// --sync-vault の同期先。個人の環境に依存するので既定値は持たない。
// 使う人が CODEMAP_VAULT に自分の置き場所を入れる。
const DEFAULT_VAULT = null;
// 本体が大きすぎてローカルLLMに渡せない目安。1関数がこの行数を超えたらINDEXで印を付ける。
const BIG_FN_LINES = 200;
const EMPTY_PROSE = '_(未記入)_';

// ---------------------------------------------------------------- 字句スキャン

// 文字列・テンプレート・コメント・正規表現リテラルを飛ばしながら、
// 対応する閉じ括弧の位置を返す。見つからなければ -1。
function matchBracket(src, start, open, close) {
  let depth = 0;
  let i = start;
  // 直前の非空白文字。`/` が除算か正規表現かの判定に使う。
  let prev = '';
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '/' && c2 === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) return -1;
      continue;
    }
    if (c === '/' && c2 === '*') {
      i = src.indexOf('*/', i + 2);
      if (i < 0) return -1;
      i += 2;
      continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%~^<>]/.test(prev)) {
      i = skipRegex(src, i);
      prev = '/';
      continue;
    }
    if (c === '"' || c === "'") {
      i = skipQuoted(src, i, c);
      prev = c;
      continue;
    }
    if (c === '`') {
      i = skipTemplate(src, i);
      prev = '`';
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return -1;
}

function skipQuoted(src, i, quote) {
  i++;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === quote) return i + 1;
    if (src[i] === '\n') return i; // 未閉鎖。行末で諦める
    i++;
  }
  return i;
}

function skipTemplate(src, i) {
  i++;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') return i + 1;
    if (src[i] === '$' && src[i + 1] === '{') {
      const end = matchBracket(src, i + 1, '{', '}');
      if (end < 0) return src.length;
      i = end + 1;
      continue;
    }
    i++;
  }
  return i;
}

function skipRegex(src, i) {
  i++;
  let inClass = false;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '[') inClass = true;
    else if (src[i] === ']') inClass = false;
    else if (src[i] === '/' && !inClass) return i + 1;
    else if (src[i] === '\n') return i; // 正規表現ではなかった。除算とみなして戻す
    i++;
  }
  return i;
}

// ---------------------------------------------------------------- 説明の転記

// 宣言の直前にある JSDoc / // コメントを1行の説明に畳む。
function descriptionAbove(lines, declIndex) {
  let i = declIndex - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  if (i < 0) return '';

  if (lines[i].trim().endsWith('*/')) {
    let start = i;
    while (start >= 0 && !lines[start].includes('/**') && !lines[start].includes('/*')) start--;
    if (start < 0) return '';
    const body = lines.slice(start, i + 1)
      .map((l) => l.replace(/^\s*\/\*+/, '').replace(/\*+\/\s*$/, '').replace(/^\s*\*\s?/, '').trim())
      .filter((l) => l && !l.startsWith('@'));
    return firstSentence(body.join(' '));
  }

  if (lines[i].trim().startsWith('//')) {
    let start = i;
    while (start > 0 && lines[start - 1].trim().startsWith('//')) start--;
    const body = lines.slice(start, i + 1).map((l) => l.trim().replace(/^\/\/\s?/, '').trim());
    return firstSentence(body.join(' '));
  }

  return '';
}

// 括弧の内側の「。」では切らない（「（UIは持たない。表示は…）」を途中で落とさないため）。
function firstSentence(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  let depth = 0;
  for (let i = 0; i < t.length && i < 120; i++) {
    const c = t[i];
    if (c === '（' || c === '(' || c === '「' || c === '【') depth++;
    else if (c === '）' || c === ')' || c === '」' || c === '】') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (c === '。' || c === '．')) return t.slice(0, i + 1);
    else if (depth === 0 && c === '.' && /\s/.test(t[i + 1] || ' ')) return t.slice(0, i + 1);
  }
  return t.length > 110 ? `${t.slice(0, 108)}…` : t;
}

// ファイル冒頭のコメントブロック（summary の初期値）。
// 1行目が自分のパスを書いているだけの場合（このリポジトリの慣習）は落とす。
function headerComment(lines, file) {
  const body = headerCommentRaw(lines);
  const base = path.posix.basename(file);
  // 1行まるごとがパスのときだけ落とす。「BCdice.js の中身を〜」のような文の頭は残す。
  if (body.length && (body[0] === file || body[0] === base)) body.shift();
  return firstSentence(body.join(' '));
}

// 冒頭コメントを行の配列で返す。
function headerCommentRaw(lines) {
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return [];
  const first = lines[i].trim();
  if (first.startsWith('/*')) {
    let end = i;
    while (end < lines.length && !lines[end].includes('*/')) end++;
    const body = lines.slice(i, end + 1)
      .map((l) => l.replace(/^\s*\/\*+/, '').replace(/\*+\/\s*$/, '').replace(/^\s*\*\s?/, '').trim())
      .filter((l) => l && !l.startsWith('@'));
    return body;
  }
  if (first.startsWith('//')) {
    let end = i;
    while (end + 1 < lines.length && lines[end + 1].trim().startsWith('//')) end++;
    const body = lines.slice(i, end + 1).map((l) => l.trim().replace(/^\/\/\s?/, '').trim());
    return body;
  }
  return [];
}

// ---------------------------------------------------------------- 宣言の抽出

const DECL_RE = /^(export\s+)?(?:(async)\s+)?(function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/;

function extractSymbols(src, file) {
  const lines = src.split('\n');
  const offsets = [];
  let acc = 0;
  for (const l of lines) { offsets.push(acc); acc += l.length + 1; }

  const symbols = [];
  const reexported = new Set();

  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) reexported.add(name);
    }
  }

  lines.forEach((line, i) => {
    const m = line.match(DECL_RE);
    if (!m) return;
    const [, exp, asyncKw, kindRaw, name] = m;
    const isFunction = kindRaw.startsWith('function');
    const kind = isFunction ? 'fn' : kindRaw === 'class' ? 'class' : 'const';

    let signature = `${name}`;
    let endLine = i;

    if (isFunction || kindRaw === 'class') {
      // 本体の `{` を探し始める位置。分割代入の引数 `({ a, b })` を本体と取り違えないよう、
      // 引数リストが読めたときはその閉じ括弧の後ろから探す（取り違えると行数が数行に化ける）。
      let bodyFrom = offsets[i];
      const parenAt = src.indexOf('(', offsets[i]);
      if (isFunction && parenAt >= 0 && parenAt < offsets[i] + line.length + 400) {
        const close = matchBracket(src, parenAt, '(', ')');
        if (close > 0) {
          const params = src.slice(parenAt, close + 1).replace(/\s+/g, ' ').trim();
          signature = `${asyncKw ? 'async ' : ''}${name}${params}`;
          bodyFrom = close;
        }
      }
      const braceAt = src.indexOf('{', bodyFrom);
      if (braceAt >= 0) {
        const close = matchBracket(src, braceAt, '{', '}');
        if (close > 0) endLine = lineOf(offsets, close);
      }
    } else {
      // const foo = (a, b) => ... / const foo = function (a) {...}
      const arrow = line.match(/=\s*(?:(async)\s*)?\(([^)]*)\)\s*=>/);
      if (arrow) signature = `${arrow[1] ? 'async ' : ''}${name}(${arrow[2].trim()})`;
      else signature = name;
    }

    symbols.push({
      name,
      kind,
      line: i + 1,
      endLine: endLine + 1,
      bodyLines: endLine - i + 1,
      signature,
      exported: Boolean(exp) || reexported.has(name),
      description: descriptionAbove(lines, i),
    });
  });

  return { symbols, header: headerComment(lines, file), lineCount: lines.length };
}

function lineOf(offsets, pos) {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= pos) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// ---------------------------------------------------------------- 依存グラフ

// import に加えて、名指しの再export（export { x } from './y.js'）も依存として数える。
// 数えないと、再exportでしか使われていないモジュールが「誰からもimportされない」＝
// エントリポイントとして並んでしまい、地図を読む人に消してよいものだと誤解させる
// （js/store/ids.js が実際にそう出た）。
function extractImports(src, file) {
  const dir = path.posix.dirname(file);
  const out = new Set();
  const re = /^(?:import|export)\s+(?:[^;'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  const multiline = /^(?:import|export)\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/gms;
  for (const m of [...src.matchAll(re), ...src.matchAll(multiline)]) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    out.add(path.posix.normalize(path.posix.join(dir, spec)));
  }
  return [...out];
}

// ---------------------------------------------------------------- ノート入出力

const noteName = (file) => file.replace(/\.js$/, '').split('/').join('.');
const notePath = (file) => `${FILES_DIR}/${noteName(file)}.md`;

const PROSE_KEYS = ['summary', 'role', 'notes'];

// proseSha が null のときは「ノートが無い」= 新規。新規は陳腐化ではなく未記入として扱う。
function readExisting(file) {
  const p = path.join(REPO, notePath(file));
  if (!fs.existsSync(p)) return { prose: {}, descriptions: {}, proseSha: null };
  // CRLF で checkout されている場合がある（worktree など）。改行を正規化しないと
  // 下の `-->\n` が一致せず、散文を読み落として全ノートが「未記入」に戻る。
  const md = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

  const prose = {};
  for (const key of PROSE_KEYS) {
    const m = md.match(new RegExp(`<!-- prose:${key} -->\\n([\\s\\S]*?)\\n<!-- /prose:${key} -->`));
    if (m) prose[key] = m[1].trim();
  }

  // export 表の説明列を symbol 名で拾う（コードにコメントが無いものの受け皿）。
  // 2列目の種別で export 表に限定する。候補表も5列なので、これが無いと export 列を説明と誤読する。
  const descriptions = {};
  for (const m of md.matchAll(/^\| *\d+ *\| *(?:fn|class|const) *\| *`?([A-Za-z_$][\w$]*)`? *\|[^|]*\|([^|]*)\|/gm)) {
    const desc = m[2].trim();
    if (desc) descriptions[m[1]] = desc;
  }

  const shaMatch = md.match(/^prose_sha: *(\S*)/m);
  return { prose, descriptions, proseSha: shaMatch ? shaMatch[1] : '' };
}

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function renderNote(info) {
  const { file, lineCount, exports: exp, topFns, imports, importedBy, apiSha, proseSha, prose } = info;

  const proseBlock = (key, fallback) =>
    `<!-- prose:${key} -->\n${prose[key] || fallback || EMPTY_PROSE}\n<!-- /prose:${key} -->`;

  const out = [];
  out.push('---');
  out.push(`source: ${file}`);
  out.push(`lines: ${lineCount}`);
  out.push(`exports: ${exp.length}`);
  out.push(`imported_by: ${importedBy.length}`);
  out.push(`api_sha: ${apiSha}`);
  out.push(`prose_sha: ${proseSha}`);
  out.push(`generated: ${new Date().toISOString().slice(0, 10)}`);
  out.push('tags: [codemap]');
  out.push('---');
  out.push('');
  out.push(`# ${file}`);
  out.push('');
  out.push(proseBlock('summary', info.header));
  out.push('');
  out.push('## 役割');
  out.push('');
  out.push(proseBlock('role'));
  out.push('');

  out.push(`## export（${exp.length}）`);
  out.push('');
  if (exp.length === 0) {
    out.push('なし（エントリポイント、または副作用のみのモジュール）。');
  } else {
    out.push('| 行 | 種別 | 名前 | シグネチャ | 説明 |');
    out.push('|---:|---|---|---|---|');
    for (const s of exp) {
      out.push(`| ${s.line} | ${s.kind} | ${cell(s.name)} | \`${cell(s.signature)}\` | ${cell(s.description)} |`);
    }
  }
  out.push('');

  out.push(`## トップレベル関数（LOCAL TASKS 候補）（${topFns.length}）`);
  out.push('');
  if (topFns.length === 0) {
    out.push('なし（`function 名(...) {}` 宣言がトップレベルに無い）。');
  } else {
    out.push('トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**');
    out.push(`行数が大きいもの（${BIG_FN_LINES} 行以上、太字）はローカルLLMに渡せない。`);
    out.push('');
    out.push('| 行 | 名前 | シグネチャ | 行数 | export |');
    out.push('|---:|---|---|---:|:-:|');
    for (const s of topFns) {
      const size = s.bodyLines >= BIG_FN_LINES ? `**${s.bodyLines}**` : String(s.bodyLines);
      out.push(`| ${s.line} | ${cell(s.name)} | \`${cell(s.signature)}\` | ${size} | ${s.exported ? '✓' : ''} |`);
    }
  }
  out.push('');

  out.push('## 依存');
  out.push('');
  const link = (f) => `[[${noteName(f)}]]`;
  out.push(`- import → ${imports.length ? imports.map(link).join(', ') : 'なし'}`);
  out.push(`- imported by → ${importedBy.length ? importedBy.map(link).join(', ') : 'なし（エントリポイント）'}`);
  out.push('');

  out.push('## 注意');
  out.push('');
  out.push(proseBlock('notes'));
  out.push('');

  return out.join('\n');
}

function renderIndex(all) {
  const totalExports = all.reduce((s, f) => s + f.exports.length, 0);
  const totalFns = all.reduce((s, f) => s + f.symbols.filter((x) => x.kind === 'fn').length, 0);
  const stale = all.filter((f) => f.apiSha !== f.proseSha);
  const entries = all.filter((f) => f.importedBy.length === 0);

  const out = [];
  out.push('---');
  out.push('tags: [codemap, index]');
  out.push(`generated: ${new Date().toISOString().slice(0, 10)}`);
  out.push('---');
  out.push('');
  out.push('# trpg-app コードマップ');
  out.push('');
  out.push('エージェントが**ソースを読まずに**構造を把握するためのインデックス。');
  out.push('`node tools/codemap.mjs` で生成される。表の内容を手で直しても次回の生成で消える。');
  out.push('');
  out.push('## 使い方');
  out.push('');
  out.push('- ノートのパスはソースパスから決まる: `js/parameters/dx3.js` → `docs/codemap/files/js.parameters.dx3.md`');
  out.push('  この表を読まずに直接 Read してよい。');
  out.push('- symbol の**説明はコード側のコメントが正**。説明を良くしたいときはコードのコメントを直す。');
  out.push('  コメントが無い symbol の説明だけノートに保存される。');
  out.push('- `## 役割` `## 注意` はノート側にのみ存在する。書き換えてよい（生成時に引き継がれる）。');
  out.push('');
  out.push('## 全体');
  out.push('');
  const unwritten = all.filter((f) => f.unwritten);
  out.push(`| ファイル | export | トップレベル関数 | 役割が未記入 | 散文が要更新 |`);
  out.push('|---:|---:|---:|---:|---:|');
  out.push(`| ${all.length} | ${totalExports} | ${totalFns} | ${unwritten.length} | ${stale.length} |`);
  out.push('');
  out.push(`エントリポイント（誰からも import されない）: ${entries.map((f) => `\`${f.file}\``).join(', ')}`);
  out.push('');

  out.push('## ファイル一覧');
  out.push('');
  out.push('| ファイル | 紹介 | export | 被import |');
  out.push('|---|---|---:|---:|');
  for (const f of [...all].sort((a, b) => a.file.localeCompare(b.file))) {
    const summary = (f.prose.summary && f.prose.summary !== EMPTY_PROSE ? f.prose.summary : f.header) || '';
    out.push(`| [[${noteName(f.file)}\\|${f.file}]] | ${cell(summary)} | ${f.exports.length} | ${f.importedBy.length} |`);
  }
  out.push('');

  out.push('## 依存の要所');
  out.push('');
  out.push('| ファイル | 被import |');
  out.push('|---|---:|');
  for (const f of [...all].sort((a, b) => b.importedBy.length - a.importedBy.length).slice(0, 10)) {
    out.push(`| [[${noteName(f.file)}\\|${f.file}]] | ${f.importedBy.length} |`);
  }
  out.push('');

  if (stale.length) {
    out.push('## 散文が要更新');
    out.push('');
    out.push('export の顔ぶれかシグネチャが変わったのに `## 役割` が書き直されていないファイル。');
    out.push('');
    for (const f of stale) out.push(`- [[${noteName(f.file)}\\|${f.file}]]`);
    out.push('');
  }

  return out.join('\n');
}

// ---------------------------------------------------------------- 本体

function collect() {
  const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter((f) => SOURCE_RE.test(f));

  const parsed = tracked.map((file) => {
    const src = fs.readFileSync(path.join(REPO, file), 'utf8');
    const { symbols, header, lineCount } = extractSymbols(src, file);
    return { file, src, symbols, header, lineCount, imports: extractImports(src, file) };
  });

  const importedBy = {};
  for (const f of parsed) {
    for (const target of f.imports) (importedBy[target] ||= []).push(f.file);
  }

  return parsed.map((f) => {
    const exports = f.symbols.filter((s) => s.exported);
    // export の有無で絞らない。implement.md 手順1の条件は「トップレベルの function 宣言」だけで、
    // export 済みかどうかは入っていない（T-007 で export 関数を候補外と誤読された）。
    const topFns = f.symbols.filter((s) => s.kind === 'fn');
    const apiSha = sha(JSON.stringify(exports.map((s) => [s.name, s.kind, s.signature])));
    const existing = readExisting(f.file);

    for (const s of exports) {
      if (!s.description) s.description = existing.descriptions[s.name] || '';
    }

    return {
      ...f,
      exports,
      topFns,
      apiSha,
      // 新規ノートは api_sha を刻んで生まれる（要更新にはしない）。未記入は別集計。
      proseSha: existing.proseSha === null ? apiSha : existing.proseSha,
      prose: existing.prose,
      unwritten: !existing.prose.role || existing.prose.role === EMPTY_PROSE,
      importedBy: (importedBy[f.file] || []).sort(),
      imports: f.imports.filter((t) => tracked.includes(t)).sort(),
    };
  });
}

function syncVault(vaultDir) {
  fs.rmSync(vaultDir, { recursive: true, force: true });
  fs.cpSync(path.join(REPO, OUT_DIR), vaultDir, { recursive: true });
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const valuesAfter = (name) => {
    const i = argv.indexOf(name);
    if (i < 0) return null;
    const out = [];
    for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j].replace(/\\/g, '/'));
    return out;
  };

  const all = collect();
  const staleList = all.filter((f) => f.apiSha !== f.proseSha);

  if (flag('--check')) {
    if (staleList.length === 0) {
      console.log('codemap: 散文の要更新なし');
      process.exit(0);
    }
    console.log(`codemap: 散文が要更新 ${staleList.length} 件`);
    for (const f of staleList) console.log(`  ${f.file}  → ${notePath(f.file)}`);
    process.exit(1);
  }

  const accept = valuesAfter('--accept');
  const only = valuesAfter('--files');
  const targets = only && only.length
    ? all.filter((f) => only.includes(f.file))
    : all;

  fs.mkdirSync(path.join(REPO, FILES_DIR), { recursive: true });

  for (const f of targets) {
    const stamped = accept && accept.includes(f.file) ? f.apiSha : f.proseSha;
    f.proseSha = stamped;
    fs.writeFileSync(path.join(REPO, notePath(f.file)), renderNote(f), 'utf8');
  }

  // 生成対象外のノートも INDEX の集計には入るので、INDEX は常に全体で書き直す。
  fs.writeFileSync(path.join(REPO, `${OUT_DIR}/INDEX.md`), renderIndex(all), 'utf8');

  // 消えたソースのノートを掃除する。
  const valid = new Set(all.map((f) => `${noteName(f.file)}.md`));
  for (const name of fs.readdirSync(path.join(REPO, FILES_DIR))) {
    if (!valid.has(name)) fs.rmSync(path.join(REPO, FILES_DIR, name));
  }

  const vault = process.env.CODEMAP_VAULT || DEFAULT_VAULT;
  if (flag('--sync-vault')) {
    if (!vault) {
      console.error('codemap: --sync-vault には同期先が要ります。CODEMAP_VAULT に置き場所を入れてください。');
      console.error('  例) CODEMAP_VAULT="D:/Obsidian/trpg-app" node tools/codemap.mjs --sync-vault');
      process.exit(2);
    }
    syncVault(vault);
    console.log(`codemap: Vault へ同期 ${vault}`);
  }

  const remaining = all.filter((f) => f.apiSha !== f.proseSha);
  console.log(`codemap: ${targets.length} ノート更新 / 全 ${all.length} ファイル`);
  if (remaining.length) {
    console.log(`codemap: 散文が要更新 ${remaining.length} 件`);
    for (const f of remaining) console.log(`  ${f.file}  → ${notePath(f.file)}`);
  }
}

main();
