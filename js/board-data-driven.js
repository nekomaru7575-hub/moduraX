// 画面が読み込まれたら実行する
window.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('board');
  if (!board) return;

  // 【仕様に基づく定数定義】
  const GRID_SIZE = 50;       // マス目のサイズ
  const TOKEN_SIZE = 40;      // コマのサイズ
  const OFFSET_PADDING = 5;   // 中央合わせ用余白: (50px - 40px) / 2 = 5px
  const MIN_VISIBLE_PX = 10;  // 見失わないブレーキ用: 最低限盤面に残すピクセル数

  /**
   * 1. アプリケーションの「状態（State）」
   * 画面上のすべてのコマの「データ」はここに集約されます。
   */
  const rawTokensState = {
    // コマのIDをキーにして、座標データを管理
    'token-lily': { x: 100, y: 150, elementId: 'token-lily' },
    'token-ragna': { x: 300, y: 200, elementId: 'token-ragna' }
  };

  /**
   * 2. データ駆動の核心：Proxy（プロキシ）による監視機構
   * データの数値が変わった瞬間を検知し、自動でHTML（DOM）へ反映させます。
   */
  const createTokenProxy = (tokenData) => {
    return new Proxy(tokenData, {
      set(target, prop, value) {
        // まずデータを書き換える
        target[prop] = value;

        // 書き換わったデータが x または y の場合、自動で対応するHTMLの見た目を更新する（追従）
        if (prop === 'x' || prop === 'y') {
          const element = document.getElementById(target.elementId);
          if (element) {
            if (prop === 'x') element.style.left = `${value}px`;
            if (prop === 'y') element.style.top = `${value}px`;
          }
        }
        return true;
      }
    });
  };

  // すべてのコマのデータをProxy化して管理するオブジェクト
  const tokensState = {};
  Object.keys(rawTokensState).forEach(id => {
    tokensState[id] = createTokenProxy(rawTokensState[id]);
    
    // 初期位置をHTMLに強制反映（初期化の同期）
    tokensState[id].x = rawTokensState[id].x;
    tokensState[id].y = rawTokensState[id].y;
  });

  /**
   * 3. ドラッグ＆ドロップの操作ロジック
   * ここではHTMLのスタイルは直接いじらず、「tokensStateのデータ」だけを更新します。
   */
  const tokens = document.querySelectorAll('.token');

  tokens.forEach(token => {
    // HTML要素側から、自分のデータIDを紐付けるためにID属性を付与（事前にHTML側にあれば不要）
    // 例として、名前やクラスからIDを特定できるようにします
    const tokenName = token.querySelector('.token-name').textContent;
    const tokenId = tokenName === 'リリィ' ? 'token-lily' : 'token-ragna';
    token.id = tokenId; // DOMにIDをセット

    token.addEventListener('mousedown', (event) => {
      event.preventDefault();

      // このコマの「データ（Proxy）」を取得
      const state = tokensState[tokenId];
      if (!state) return;

      // 最新の盤面サイズを取得（ブレーキ計算用）
      const boardRect = board.getBoundingClientRect();

      // ブレーキ限界値の計算（クロージャ内部で保持）
      const minX = -TOKEN_SIZE + MIN_VISIBLE_PX;
      const maxX = boardRect.width - MIN_VISIBLE_PX;
      const minY = -TOKEN_SIZE + MIN_VISIBLE_PX;
      const maxY = boardRect.height - MIN_VISIBLE_PX;

      // クリックした位置のズレ（オフセット）を計算
      // ※データ（state.x, state.y）を基準にオフセットを割り出す
      const offsetX = event.clientX - state.x;
      const offsetY = event.clientY - state.y;

      // ドラッグ中の処理
      function onMouseMove(e) {
        const newX = e.clientX - offsetX;
        const newY = e.clientY - offsetY;

        // 【はみ出しブレーキ】
        const clampedX = Math.max(minX, Math.min(newX, maxX));
        const clampedY = Math.max(minY, Math.min(newY, maxY));

        // 🔥【ここがデータ駆動！】🔥
        // HTML要素を直接いじるのではなく、Proxyデータに数値を代入するだけ！
        // これにより自動的にProxyのsetトラップが走り、HTMLが追従します。
        state.x = clampedX;
        state.y = clampedY;
      }

      // マウスを離した時の吸着処理
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // 現在のデータ上の座標から、最も近いグリッド位置を計算
        const snappedX = Math.round(state.x / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;
        const snappedY = Math.round(state.y / GRID_SIZE) * GRID_SIZE + OFFSET_PADDING;

        // 吸着後の位置にもブレーキを適用
        const finalX = Math.max(minX, Math.min(snappedX, maxX));
        const finalY = Math.max(minY, Math.min(snappedY, maxY));

        // データを最終位置に更新（ここでもHTMLが勝手に吸着アニメーションのように追従）
        state.x = finalX;
        state.y = finalY;
      }

      // イベントの登録
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  /**
   * 💡 データ駆動のメリット証明：外部からのデータ変更テスト
   * 例えば、コンソールから `window.moveToken('token-lily', 500, 300)` を実行したり、
   * 将来的にダイス機能や通信機能からこの関数を呼び出すだけで、ドラッグ以外の要因でもコマが動かせます。
   */
  window.moveToken = (id, newX, newY) => {
    if (tokensState[id]) {
      tokensState[id].x = newX;
      tokensState[id].y = newY;
    }
  };
});