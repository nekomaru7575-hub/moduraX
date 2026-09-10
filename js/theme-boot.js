// js/theme-boot.js
// 明るい表示を選んでいる人の画面に、**最初の描画より前に** data-theme="light" を付ける。
// 色の値は css/tokens.css の :root[data-theme="light"]、切り替えそのものは js/theme.js。
//
// 【なぜ古典スクリプトなのか】`type="module"` は必ず遅延実行されるので、そちらで付けると
// 一瞬だけ暗い画面が出てから白へ切り替わる。CSPの script-src が 'self' だけなので
// インラインの<script>も書けない。head の中で同期実行されるファイルにする
// （js/boot-guard.js と同じ理由・同じ置き方）。
// import が使えない代わりに、他のどのファイルにも依存しない。保存のキー名と値だけは
// js/theme.js と揃えてある（変えるときは両方）。

(function () {
  'use strict';
  try {
    if (localStorage.getItem('mojulaX:theme') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {
    // プライベートモード等でlocalStorageが触れないときは、既定の暗い表示のまま
  }
})();
