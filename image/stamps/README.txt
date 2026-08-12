# スタンプ画像の置き場（js/stamp-catalog.js の file 名と一致させる）
# 推奨: 正方形・128px前後・背景透過。拡張子は .png / .svg / .webp / .gif が使える。
# ファイルが無い間は、画面側が枠とラベルだけで表示する（js/stamp-layer.js・js/stamp-panel.js）。
#
# プラグインが足すスタンプは、このフォルダの中のプラグイン専用フォルダに置く。
# フォルダ名はプラグインidと一字一句同じ（大文字のまま）。docs/plugin-guide.md 3.9 参照。
#   例) STELLA_KNIGHTS の { id:'seed', file:'seed.png' } → image/stamps/STELLA_KNIGHTS/seed.png
# 本番はLinuxで大文字小文字を区別する。Windowsは区別しないので、ここがずれていると
# 手元では正しく見えて本番だけ画像が出ない。
