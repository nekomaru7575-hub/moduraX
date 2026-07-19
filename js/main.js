// ========================================================
// 0. 外部モジュールのインポート (第4段階: モジュール化)
// ========================================================
import { rollBCDice } from './BCdice.js';

// ========================================================
// 1. 脳と神経のパーツ：簡易EventBusの実装 (Coreの設計思想)
// ========================================================
const EventBus = {
  listeners: {},
  subscribe(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  },
  emit(eventName, payload) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => callback(payload));
    }
  }
};

// ========================================================
// 2. 画面の部品（DOM）を取得する
// ========================================================
const sendBtn = document.getElementById('sendBtn');
const gameSystemSelect = document.getElementById('gameSystem');
const commandInput = document.getElementById('commandInput');
const logContainer = document.getElementById('logContainer');

// ========================================================
// 3. データ駆動UI：EventBusの通知を受けて画面を書き換える
// ========================================================
EventBus.subscribe('DiceRolled', diceRollProcess);
  
async function  diceRollProcess({system,rawInput}){
    // 送信ボタンを一時的に無効化（連打・多重送信防止）
  sendBtn.disabled = true;
  sendBtn.textContent = "ダイスを振っています...";

  try {
    // 【スマート・コマンド抽出】スペースで区切って「コマンド」と「コメント」に分ける
    const spaceIndex = splitForSpace(rawInput);
    const command = spaceIndex[0];
    const comment = spaceIndex.slice(1).join(" ");

    const isDiceCommand = /^[A-Za-z0-9+\-*/()<>=\[\]:]+$/.test(command);

    
    if(!isDiceCommand){
        applyLog({system : system, resultText : rawInput});
        return;
    }
    
    // 【BCDice API連携】インポートした関数に処理を丸投げ！
    const {success,resultText,diceValues} = await rollBCDice(system, command);
    
    // 関数内部で通信エラー等があった場合のチェック
    if (!success) {
      throw new Error(resultText);
    }

    // BCDice.js側のAPIがエラー（対応していないコマンド等）を返していないか確認
    // 通常、結果テキストが空、もしくはエラーメッセージの場合はここでハンドリング
    if (!resultText || resultText.includes("と認識されませんでした")) {
      alert(`ダイスエラー: 正しいコマンドを入力してください。\n(入力されたもの: ${command})`);
      commandInput.value = "";
      return;
    }

    // 【出目内訳の可視化】BCdice.jsが返した diceValues (rands) の配列を文字列に成形
    // 例: [{side: 100, value: 45}] -> "45"

    const diceDetail = diceValues && diceValues.length > 0 ?
        diceValues.map(d => d.value).join(', ') : "内訳データなし"

    applyLog({system : system,comment : comment,resultText : resultText,diceDetail : diceDetail});

    // 入力欄をきれいに空にする
    commandInput.value = "";

  } catch (error) {
    console.error(error);
    alert(`エラーが発生しました: ${error.message}`);
  } finally {
    // ボタンを元に戻す
    sendBtn.disabled = false;
    sendBtn.textContent = "ダイスを振る";
  }
}

// ========================================================
// 4. アプリのメインロジック：ボタンクリック時の非同期処理
// ========================================================
sendBtn.addEventListener('click', async () => {
  const selectedSystem = gameSystemSelect.value;
  const rawInput = commandInput.value.trim();

  if (rawInput === "") {
    alert("コマンドを入力してください！");
    return;
  }
  // 【EventBusへの通知】結果をひとまとめにして通知を飛ばす！
    EventBus.emit('DiceRolled', {
      system: selectedSystem,
      rawInput: rawInput
    });
  
});

function splitForSpace(string){
    const processedStr = string.trim().replaceAll("　"," ");
    return processedStr.split(" ");
}

function applyLog({system = "", comment = "",resultText, diceDetail = ""}){
    const newLog = document.createElement('div');
    const detail = diceDetail ?  `<small style="color: #888;">出目内訳: [${diceDetail}]</small>
    ` : ""
    
    newLog.className = 'log-item';
    newLog.innerHTML = `
    <strong style="color: #007acc;">[${system}]</strong> ${comment ? `<span style="color: #aaa;">(${comment})</span>` : ''}<br>
    <span style="font-size: 1.1rem; color: #fff;">${resultText}</span><br> 
    ${detail}`;
    
    logContainer.appendChild(newLog);
    logContainer.scrollTop = logContainer.scrollHeight;
}