// 画面が読み込まれたら実行するおまじない
window.addEventListener('DOMContentLoaded', () => {
  // 盤面要素（はみ出し防止のブレーキ計算で使用）
  const board = document.getElementById('board');
  // 盤面上のすべてのコマ（class="token" がついた要素）を取得する
  const tokens = document.querySelectorAll('.token');

  // 【定数定義】仕様に基づくサイズ設定
  const GRID_SIZE = 50;       // マス目のサイズ
  const TOKEN_SIZE = 40;      // コマのサイズ
  const OFFSET_PADDING = 5;   // ①中央合わせ用余白: (50px - 40px) / 2 = 5px
  const MIN_VISIBLE_PX = 10;  // ③見失わないブレーキ用: 最低限盤面に残すピクセル数

  // 取得したコマの数だけ、1個ずつドラッグの仕組みをセットしていく
  tokens.forEach(token => {
    // マウスが押された瞬間のイベントをキャッチ
    token.addEventListener('mousedown', (event) => {
      // 選択された要素以外のテキスト選択などを防ぐ
      event.preventDefault();

      // ドラッグ開始時点の盤面の最新位置・サイズを取得（ブレーキ計算の基準）
      const boardRect = board.getBoundingClientRect();

      // 【共通ロジック：見失わないブレーキの限界値を計算する関数】
      // 左・上方向の限界値（コマの大部分が外に出ても、最低10pxは引っかかる位置：-30px）
      const minX = -(TOKEN_SIZE - MIN_VISIBLE_PX);
      const minY = -(TOKEN_SIZE - MIN_VISIBLE_PX);
      // 右・下方向の限界値（盤面の幅・高さから最低10px内側に入った位置）
      const maxX = boardRect.width - MIN_VISIBLE_PX;
      const maxY = boardRect.height - MIN_VISIBLE_PX;

      // 1. クリックされた位置と、コマの左上角との「ズレ（オフセット）」を計算する
      function offsetCalc(){
          return {
              offsetX : event.clientX - token.offsetLeft,
              offsetY : event.clientY - token.offsetTop
          }
      }

      const {offsetX, offsetY} = offsetCalc();

      // 2. マウスを動かしている最中の処理（盤面全体を見張る）
      function onMouseMove(moveEvent) {
        // マウスの現在位置から、最初に計算したズレを引いてコマの「仮の位置」を計算
        let newX = moveEvent.clientX - offsetX;
        let newY = moveEvent.clientY - offsetY;

        // 【方針③：ドラッグ中のはみ出しブレーキ】
        const clampedX = Math.max(minX, Math.min(newX, maxX));
        const clampedY = Math.max(minY, Math.min(newY, maxY));

        // 【方針①：ドラッグ中は1px単位で滑らかに動かす】
        token.style.left = `${clampedX}px`;
        token.style.top = `${clampedY}px`;
      }

      // 3. 盤面のどこかでマウスが離されたときの処理
      function onMouseUp() {
        // マウスが離された瞬間のコマの現在位置を取得
        const currentX = parseFloat(token.style.left);
        const currentY = parseFloat(token.style.top);

        // 【方針①＆②：リリース時に最も近いグリッドの中央へパチッと吸着】
        const snappedX = Math.round(currentX / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;
        const snappedY = Math.round(currentY / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;

        // 🔥【ここが改良ポイント！】🔥
        // 吸着させた後の座標（snappedX, snappedY）に対しても、再度ブレーキをかける
        // これにより、離した瞬間にさらに外側のグリッドへワープして消えるのを防ぎます！
        const finalX = Math.max(minX, Math.min(snappedX, maxX));
        const finalY = Math.max(minY, Math.min(snappedY, maxY));

        // 最終的に安全が保証された吸着座標を反映
        token.style.left = `${finalX}px`;
        token.style.top = `${finalY}px`;

        // 用が済んだので、動かしたとき・離したときの仕組みを解除する
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      // マウスが押されている間だけ、動かしたとき・離したときの仕組みを本登録する
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
});