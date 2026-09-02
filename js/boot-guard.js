// js/boot-guard.js
// ページに必要なファイルが1本でも届かなかったとき、**利用者に分かる形で知らせる**。
//
// 【なぜ要るか】このアプリはESモジュールで100本近いJSを並列に読む。1本でも届かないと
// そこから先のモジュールが全部止まるが、**画面そのものは出てしまう**。実測すると、
// 盤面は普通に描かれ、チャット欄も並び、通信状態だけが「● 接続中...」のまま永久に
// 止まる。エラーは開発者コンソールにしか出ない。
//
// つまり利用者から見ると「開いたのに、いつまでも繋がらない部屋」になる。原因が
// 一時的な通信の失敗でも、**再読み込みすれば直ることが分からない**のが一番の問題。
// 実際に本番で2回起きている（サーバー再起動の瞬間に当たった1本が520で落ちた）。
//
// 【なぜ古典スクリプトなのか】`type="module"` は必ず遅延実行される。それだと、監視を
// 始める前に他のモジュールの読み込みが失敗しうる。**head の先頭で同期実行される
// 古典スクリプト**にすることで、モジュールのscript要素が作られる前に見張りを始められる。
// import が使えない代わりに、他のどのファイルにも依存しない（依存したら本末転倒）。
//
// 【キャッシュで解決しないのか】しない。Service Workerはこのアプリでは意図的に
// JS・CSSをキャッシュしていない（sw.jsの冒頭。ファイル名にハッシュが無いので、
// キャッシュするとデプロイ後もその人だけ古いJSで動き続け、同期プロトコルがずれる）。
// そこは速さより確実さを取った判断なので、こちらで肩代わりはしない。

(function () {
  'use strict';

  // 何度も出さない。1本目が落ちれば、依存している後続も芋づるで落ちる。
  var shown = false;

  // 出す対象を絞る。**画像の失敗では出さない**——コマの絵が1枚欠けただけで
  // 「読み込みに失敗しました」を全画面に出したら、そちらの方が事故。
  // 止まるのはJS（モジュールの連鎖が切れる）と、見た目が壊れるCSSだけ。
  function breaksThePage(target) {
    if (!target || !target.tagName) return false;
    if (target.tagName === 'SCRIPT') return true;
    return target.tagName === 'LINK' && target.rel === 'stylesheet';
  }

  function show(failedUrl) {
    if (shown) return;
    shown = true;

    // CSSも落ちている可能性があるので、見た目は全部この場で指定する（クラスに頼らない）。
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    var s = box.style;
    s.position = 'fixed';
    s.inset = '0';
    s.zIndex = '2147483647';
    s.display = 'flex';
    s.alignItems = 'center';
    s.justifyContent = 'center';
    s.padding = '24px';
    s.boxSizing = 'border-box';
    s.backgroundColor = 'rgba(20, 20, 20, 0.96)';
    s.color = '#e0e0e0';
    s.font = '16px/1.7 system-ui, sans-serif';
    s.textAlign = 'center';

    var inner = document.createElement('div');
    inner.style.maxWidth = '30em';

    var title = document.createElement('p');
    title.textContent = '読み込みに失敗しました';
    title.style.margin = '0 0 12px';
    title.style.fontSize = '1.25em';
    title.style.fontWeight = 'bold';

    var body = document.createElement('p');
    body.textContent = 'このページに必要なファイルの一部が届きませんでした。'
      + '通信が不安定なときや、サーバーが再起動した直後に起きます。'
      + '再読み込みすれば直ることがほとんどです。';
    body.style.margin = '0 0 20px';
    body.style.fontSize = '0.95em';

    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = '再読み込み';
    var b = button.style;
    b.backgroundColor = '#007acc';
    b.color = '#fff';
    b.border = 'none';
    b.borderRadius = '4px';
    b.padding = '10px 24px';
    b.fontSize = '1em';
    b.fontWeight = 'bold';
    b.cursor = 'pointer';
    button.addEventListener('click', function () { window.location.reload(); });

    // 何が届かなかったかも出す。問い合わせを受けたときに、これがあるだけで話が早い。
    var detail = document.createElement('p');
    detail.textContent = failedUrl || '';
    detail.style.margin = '20px 0 0';
    detail.style.fontSize = '0.75em';
    detail.style.color = '#999';
    detail.style.wordBreak = 'break-all';

    inner.appendChild(title);
    inner.appendChild(body);
    inner.appendChild(button);
    if (failedUrl) inner.appendChild(detail);
    box.appendChild(inner);

    // bodyがまだ無い段階で落ちることもある。その場合は組み上がってから差し込む。
    if (document.body) {
      document.body.appendChild(box);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(box);
      });
    }
  }

  // 読み込み失敗はバブルしないので、捕捉フェーズ（第3引数true）で拾う。
  window.addEventListener('error', function (event) {
    if (!breaksThePage(event.target)) return;
    show(event.target.src || event.target.href || '');
  }, true);
}());
