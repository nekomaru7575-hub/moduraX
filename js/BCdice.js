// BCdice.js の中身をこれに丸ごと差し替えてみてください
export async function rollBCDice(system, command) {
  // ⭕ 確実に稼働している別の公開サーバーの住所です
  const baseUrl = "https://bcdice.trpg.net";

  // URLに余計なスペースや古い文字が混ざらないよう、安全に組み立てます
  const url = `${baseUrl}/v2/game_system/${system}/roll?command=${encodeURIComponent(command)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("サーバーエラー");

    const data = await response.json();
    return {
      success: true,
      resultText: data.text,
      diceValues: data.rands // 🆕 サーバーから届いた生の出目配列（rands）をそのまま渡す
    };
  } catch (error) {
    console.error("BCDice通信失敗:", error);
    return { success: false, resultText: "⚠️ 通信に失敗しました" };
  }
}