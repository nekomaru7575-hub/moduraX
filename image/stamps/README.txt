# スタンプ画像の置き場（js/stamp-catalog.js の file 名と一致させる）
# 推奨: 正方形・128px前後・背景透過。拡張子は .png / .svg / .webp / .gif が使える。
# ファイルが無い間は、画面側が枠とラベルだけで表示する（js/stamp-layer.js・js/stamp-panel.js）。
#
# プラグインが足すスタンプは、このフォルダの中のプラグイン専用フォルダに置く。
# フォルダ名は「プラグインidを小文字にしたもの」で、Core側が組み立てる（docs/plugin-guide.md 3.9）。
#   例) STELLA_KNIGHTS の { id:'seed', file:'seed.png' } → image/stamps/stella_knights/seed.png
