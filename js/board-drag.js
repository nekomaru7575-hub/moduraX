// 画面が読み込まれたら実行するおまじない
window.addEventListener('DOMContentLoaded', () => {
  // 盤面上のすべてのコマ（class="token" がついた要素）を取得する
  const tokens = document.querySelectorAll('.token');

  // 取得したコマの数だけ、1個ずつドラッグの仕組みをセットしていく
  tokens.forEach(token => {
    // マウスが押された瞬間のイベントをキャッチ
    token.addEventListener('mousedown', (event) => {
      // 1. クリックされた位置と、コマの左上角との「ズレ（オフセット）」を計算する
      // これをしないと、ドラッグした瞬間にコマの左上角にマウスカーソルがワープしてしまいます
        function offsetCalc(){
            return {
                offsetX : event.clientX - token.offsetLeft,
                offsetY : event.clientY - token.offsetTop
            }
        }

      const {offsetX,offsetY} = offsetCalc();

      // 2. マウスを動かしている最中の処理（盤面全体を見張る）
      function onMouseMove(moveEvent) {
        // マウスの現在位置から、最初に計算したズレを引くことで、コマの新しい位置を計算
        const newX = moveEvent.clientX > offsetX ? moveEvent.clientX - offsetX : 0;
        const newY = moveEvent.clientY > offsetY ? moveEvent.clientY - offsetY : 0;

        // 【初心者向け・はみ出し防止処理】
        // コマが盤面の左や上からはみ出さないように、0未満になったら0で固定する

        // 計算した座標をコマのスタイル（CSS）にリアルタイム反映する
        token.style.left = `${newX}px`;
        token.style.top = `${newY}px`;
      }

      // 3. 盤面の上でマウスが動いたら、上記の動かす処理（onMouseMove）を実行する
      document.addEventListener('mousemove', onMouseMove);

      // 4. マウスのボタンが離された（ドロップした）瞬間の処理
      document.addEventListener('mouseup', () => {
        // マウスを動かしたときに見張るのをやめる（お仕事を解除する）
        document.removeEventListener('mousemove', onMouseMove);
      }, { once: true }); // once: true をつけると、このmouseupイベントは1回実行されたら自動消滅します
    });

    // 【オマケ】ブラウザ標準のドラッグ機能（画像などを引っ張る動き）と競合してガタつくのを防ぐ
    token.ondragstart = () => false;
  });
});

