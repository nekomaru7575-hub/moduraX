// BCdice.js の中身をこれに丸ごと差し替えてみてください
export async function rollBCDice(system, command) {
  // ⭕ 確実に稼働している別の公開サーバーの住所です
  const baseUrl = "https://bcdice.onlinesession.app";

  // URLに余計なスペースや古い文字が混ざらないよう、安全に組み立てます
  const url = `${baseUrl}/v2/game_system/${system}/roll?command=${encodeURIComponent(command)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // BCDiceは、見た目はダイスコマンドらしい文字列（例: "aaaa"）でも、その
      // システムの構文として解釈できない場合、通信自体は成功した上でHTTP 400 +
      // {ok:false, reason:"unsupported command"}を返す。これは通信障害ではなく
      // 「コマンドとして認識されなかった」ことを表すため、呼び出し側が区別して
      // 扱えるようunsupportedフラグを立てて返す。
      const data = await response.json().catch(() => null);
      const unsupported = response.status === 400 && data?.ok === false;
      return {
        success: false,
        unsupported,
        resultText: unsupported ? "コマンドとして認識されませんでした" : "⚠️ 通信に失敗しました"
      };
    }

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