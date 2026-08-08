// js/log-export.js
// チャットログを「読み物として読めるHTML」へ書き出す。UIは持たない組み立て専用モジュール
// （タブの選択はlog-export-dialog.js、ダウンロードはmain.js側が行う）。
//
// アプリのログ欄（main.jsのbuildLogHtml）は暗背景前提のインラインstyleを吐くため流用せず、
// 白背景・黒文字のテキストログに「キャラ名だけコマのチャット色を付ける」形式で組み立てる。

// キャラ名の色が未設定のログ用の既定色。白背景でも読める濃さにしてある
// （画面側の既定色#4caf50は白背景だと薄い）。
const DEFAULT_NAME_COLOR = '#2e7d32';

// 書き出したHTMLは他人にも渡すファイルなので、発言内容はエスケープしてから埋め込む
// （画面側は従来どおり生のまま扱うが、ここでは崩れ・混入を避ける）。
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ログ1件を行のHTMLへ。キャラ名が無いエントリ（システム通知など）は本文だけの行にする。
// システム名（[Cthulhu7th]等）は読み物としては不要なので出さない。
function buildEntryHtml({ character = '', comment = '', resultText = '', diceDetail = '', color = null, time }) {
  const bodyHtml = escapeHtml(resultText).replace(/\n/g, '<br>');
  const nameHtml = character
    ? `<span class="log-name" style="color: ${color || DEFAULT_NAME_COLOR};">${escapeHtml(character)}</span>：`
    : '';
  const commentHtml = comment ? ` <span class="log-comment">(${escapeHtml(comment)})</span>` : '';
  const detailHtml = diceDetail
    ? `\n    <div class="log-detail">出目内訳: [${escapeHtml(diceDetail)}]</div>`
    : '';

  let timeHtml = "";
  if (typeof time === "number" && isFinite(time)) {
    timeHtml = `<span class="log-time">${new Date(time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} </span>`;
  }

  return `    <div class="log-line">${timeHtml}${nameHtml}${bodyHtml}${commentHtml}</div>${detailHtml}`;
}

function buildTabHtml(tab, entries) {
  const heading = `    <h2>${escapeHtml(tab.name)}</h2>`;
  if (entries.length === 0) {
    return `${heading}\n    <div class="log-empty">（ログなし）</div>`;
  }
  return `${heading}\n${entries.map(buildEntryHtml).join('\n')}`;
}

/**
 * 選択されたタブのログを、単体で開ける1枚のHTML文書にまとめて返す。
 *
 * @param {{
 *   roomName: string,
 *   tabs: {id: string, name: string}[],   // 書き出し対象のタブ（chatTabsの並び順のまま渡す）
 *   chatLogs: Record<string, object[]>
 * }} options
 * @returns {string} <!DOCTYPE html>から始まる完結したHTML
 */
export function buildLogExportHtml({ roomName, tabs, chatLogs }) {
  const title = `${roomName || '部屋'} チャットログ`;
  const dateStr = new Date().toISOString().slice(0, 10);
  const body = tabs.map(tab => buildTabHtml(tab, chatLogs[tab.id] || [])).join('\n\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body {
    background-color: #fff;
    color: #222;
    font-family: "Helvetica Neue", Arial, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    line-height: 1.7;
    margin: 24px auto;
    max-width: 800px;
    padding: 0 16px;
  }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  h2 {
    font-size: 1.1rem;
    margin-top: 32px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
  }
  .export-date { color: #888; font-size: 0.85rem; margin-top: 0; }
  .log-line { margin: 4px 0; }
  .log-time { color: #888; font-size: 0.85rem; }
  .log-name { font-weight: bold; }
  .log-detail { color: #888; font-size: 0.85rem; margin: 0 0 4px 2em; }
  .log-comment { color: #888; font-size: 0.9rem; }
  .log-empty { color: #888; }
</style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    <p class="export-date">書き出し日: ${dateStr}</p>

${body}
</body>
</html>
`;
}
