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
# 【画像はこのリポジトリに入っていない】
# フリー素材を使うと、リポジトリに入れた時点で「使用」ではなく「再配布」になってしまう。
# そこで画像は外部の置き場（R2など）から配る。環境変数 ASSET_BASE_URL に置き場を設定し、
# その下の trump/ に上の規則の名前で置く（js/asset-base.js）。
#   例) ASSET_BASE_URL=https://assets.example.com
#       → https://assets.example.com/trump/card_spade_01.png
#
# ASSET_BASE_URL が未設定なら、画面側がスートと数字のテキストで描く
# （js/board-data-driven.js の applyCardAppearance）。1枚も置かなくても機能は動く。
# 素材の許諾を持たない人の環境で絵が出ないのは、不具合ではなく意図した挙動。
#
# 本番はLinuxで大文字小文字を区別する。Windowsは区別しないので、ここがずれていると
# 手元では正しく見えて本番だけ画像が出ない（image/stamps/README.txt と同じ注意）。
