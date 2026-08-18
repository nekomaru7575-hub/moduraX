# 簡易トランプのカード画像の置き場（js/card-catalog.js のファイル名規則と一致させる）
#
# ファイル名の規則
#   通常のカード … card_<スート>_<2桁の数字>.png
#                  スートは spade / heart / diamond / club、数字は 01〜13（01=A、11=J、12=Q、13=K）
#                  例) card_spade_01.png（スペードのA）、card_heart_12.png（ハートのQ）
#   ジョーカー   … card_joker.png
#   裏面         … card_back.png
#
# 推奨: 縦横比 3:2（盤面では 4×6マス＝100×150px で描く）。拡張子は .png。
#
# ファイルが無い間は、画面側がスートと数字のテキストで描く（js/board-data-driven.js の
# applyCardAppearance）。1枚も置かなくても機能は動くので、絵は後から足してよい。
# 見た目を変えたいときは、同じ名前のファイルを置き換えるだけでよい。
#
# 本番はLinuxで大文字小文字を区別する。Windowsは区別しないので、ここがずれていると
# 手元では正しく見えて本番だけ画像が出ない（image/stamps/README.txt と同じ注意）。
