// js/character-snapshot.js
// コマ丸ごとの保存/復元（バックアップ用途）に使うJSON形式のマーカー・組み立て・
// ファイルI/Oをまとめた共有モジュール。js/board-data-driven.js（部屋の中）と
// js/character-builder.js（部屋を作らないコマ作成ページ）の両方から使う。
// マーカー文字列やスナップショットの形の定義をここ1箇所にまとめることで、
// 「保存側」と「読み込み側」の形式がズレて読み込めなくなる事故を防ぐ。

// 外部キャラクターシートツールのJSONや、本アプリの汎用インポート形式（{name, parameters}）とは
// 区別が必要なため、読み込み時はまずこのマーカーの有無で判定する。
export const TOKEN_SNAPSHOT_FORMAT = 'mojuraX-token-snapshot-v1';

export function isTokenSnapshot(json) {
  return !!json && json.__format === TOKEN_SNAPSHOT_FORMAT;
}

// コマの表示・パラメータ・エフェクト/コンボ等の構成要素・バフをすべて含む完全なスナップショットを作る。
// 盤面上の配置情報（id/x/y/バックヤード状態）は、読み込み側（既存コマへの上書き、または
// ドロップ位置での新規作成）が都度決めるものなので含めない。
export function buildTokenSnapshot(token) {
  return {
    __format: TOKEN_SNAPSHOT_FORMAT,
    name: token.name,
    color: token.color,
    image: token.image,
    imageCrop: token.imageCrop,
    size: token.size,
    textColor: token.textColor,
    visible: token.visible,
    parameters: token.parameters,
    components: token.components,
    buffs: token.buffs
  };
}

// JSONデータをファイルとしてダウンロードさせる
export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// JSONテキストをパースする。失敗時はアラートを出してnullを返す（右クリックメニュー・D&D・
// コマ作成ページ共通）
export function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    alert(`JSONの解析に失敗しました: ${error.message}`);
    return null;
  }
}
