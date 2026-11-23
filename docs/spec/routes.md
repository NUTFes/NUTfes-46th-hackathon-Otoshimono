# ページと API（段階A）

段階A で作るページ、API、テーブルの名前と担当。名前を変えるときは、このファイルを先に直す PR を出してから実装する。

画面の見た目は [DESIGN.md](../design/DESIGN.md) と `docs/design/screens/` の PNG を見る。

## 決まりごと

- ページはサーバーコンポーネントで DB を直接読む。API（Route Handlers）は書き込みだけに使う。例外は写真の本体を返す `GET /api/photos/[id]` だけ。
- URL は小文字とハイフン。リソース名は複数形。「回収する」「本登録する」のような操作は、`POST …/collect` のようにリソースの下に付ける。
- `/staff` と `/api/staff` の下は、すべて実行委員のログインが必要。サーバー側で確認する。
- `boxCode` は推測されにくいランダムな英数字8文字。QR から開く URL なので、連番にしない。
- 紛失届の `token` は推測できない長いランダム値。届け出た本人だけが状況のページを開けるようにする。

## テーブル

| テーブル | 内容 | 担当 |
|---|---|---|
| `categories` | カテゴリ（作成済み: `001_create_categories.sql`） | — |
| `boxes` | BOX の `code`（URL の `boxCode`）、名前、設置場所 | 担当1 |
| `items` | 拾得物。仮登録から受渡までの状態（下記）、管理番号（L-0042 の形）、不明の理由 | 担当1 |
| `item_photos` | 拾得物の写真（本体は永続ボリューム、ここには識別子） | 担当1 |
| `lost_reports` | 紛失届。番号（R-0018 の形）、`token`、確認状況（下記）、照合した `items` | 担当2（照合した `items` の列は担当1） |
| `handovers` | 受渡記録（氏名、電話番号、メール、本人確認メモ） | 担当2 |

拾得物の状態 `items.status` の値（不明にしたときは元の状態を `previous_status` に残す）:

| 値 | 画面での表示 |
|---|---|
| `provisional` | 仮登録済 |
| `collected` | 回収済 |
| `registered` | 本登録済 |
| `handed_over` | 受渡済 |
| `unknown` | 不明 |

紛失届の確認状況 `lost_reports.status` の値:

| 値 | 画面での表示 | いつ変わるか |
|---|---|---|
| `pending` | 確認待ち | 紛失届を受け付けたとき |
| `not_found_notified` | 該当なしを通知済み / 照合を継続 | 未発見のメール（E-NOTFOUND）を送ったとき |
| `found_notified` | 見つかった旨を通知済み | 受取案内のメール（E-FOUND）を送ったとき |

## 来場者のページ（ログインなし）

| ページ | 画面 | API（書き込み） | 担当 |
|---|---|---|---|
| `/b/[boxCode]` | V-DROP | `POST /api/drops`（画面の表示後に呼び、仮登録を作る。`dropId` は画面側で作って送り、同じ `dropId` は2件目にしない） | 担当1 |
| `/b/[boxCode]/camera` | V-CAMERA、V-PHOTO-READY | `POST /api/drops/[dropId]/photo` | 担当1 |
| `/b/[boxCode]/sent` | V-DROP-SENT（V-DROP の「写真を撮らずに送信」の後） | `PATCH /api/drops/[dropId]`（種類と貴重品の回答。送らなかった項目は変えない） | 担当1 |
| `/lost` → `/lost/review` | V-LOST → V-REVIEW | `POST /api/lost-reports` | 担当2 |
| `/lost/[token]` | V-STATUS、V-STATUS-ZERO（カテゴリ別の件数を出す。メールにもこの URL を載せる） | — | 担当2 |
| `/lost/[token]/pickup` | V-PICKUP | — | 担当2 |

## 実行委員のページ（ログインが必要）

| ページ | 画面 | API（書き込み） | 担当 |
|---|---|---|---|
| `/staff/login` | M-LOGIN | `POST /api/staff/login`、`POST /api/staff/logout` | 担当1 |
| `/staff` | （画面なし。ログインを確かめて `/staff/boxes` へ移す） | — | 担当1 |
| `/staff/boxes`、`/staff/boxes/[boxCode]` | M-BOXES、M-BOX | — | 担当1 |
| `/staff/scan` → `/staff/boxes/[boxCode]/collected` | M-SCAN → M-COLLECTED | `POST /api/staff/boxes/[boxCode]/collect` | 担当1 |
| `/staff/boxes/[boxCode]/unknown` | M-BOX-UNKNOWN、M-BOX-UNKNOWN-STATE | `POST`、`DELETE /api/staff/items/[id]/unknown` | 担当1 |
| `/staff/items`（`?q=`、`?state=`） | M-ITEMS | — | 担当1 |
| `/staff/items/queue` | M-QUEUE | — | 担当1 |
| `/staff/items/[id]/register` | M-PHOTO → M-REGISTER → M-REVIEW | `POST /api/staff/items/[id]/photos`、`POST /api/staff/items/[id]/register`（管理番号を採番） | 担当1 |
| `/staff/items/[id]`、`/staff/items/[id]/edit`、`/staff/items/[id]/unknown` | M-DETAIL、M-EDIT、M-PHOTO-EDIT、M-UNKNOWN、M-UNKNOWN-DETAIL | `PATCH /api/staff/items/[id]`、`POST`・`DELETE /api/staff/items/[id]/unknown` | 担当1 |
| `/staff/items/[id]/handover` | M-HANDOVER | `POST /api/staff/items/[id]/handover` | 担当2 |
| `/staff/handovers/[itemId]` → `/staff/handovers/[itemId]/contact` | M-RECEIPT（氏名・連絡先は伏せ字）→ M-REVEAL（伏せずに表示）。受渡済の一覧は物品一覧（M-ITEMS）の状態で絞り込んで見る | — | 担当2 |
| `/staff/handovers/[itemId]/undo` | M-UNDO（受渡の取り消し確認） | `DELETE /api/staff/items/[id]/handover` | 担当2 |
| `/staff/reports`（`?status=`） | M-REPORTS、M-REPORTS-NOTIFIED、M-REPORTS-SEARCHING | — | 担当2 |
| `/staff/reports/[id]` | M-REPORT-DETAIL | `POST /api/staff/reports/[id]/found-notice`（E-FOUND）、`POST /api/staff/reports/[id]/not-found-notice`（E-NOTFOUND） | 担当1 |
| — | 写真の表示 | `GET /api/photos/[id]`（実行委員だけ） | 担当1 |

紛失届を受け付けたときのメール（E-RECEIVED）は、`POST /api/lost-reports` から送る。メール送信の関数は担当1が作り、担当2が呼び出す。

## 未決

- **巡回の QR 読み取り（M-SCAN）**: 次のどちらにするか、担当1が巡回の Issue で決める。どちらでも `POST /api/staff/boxes/[boxCode]/collect` は変わらない。
  - アプリの中でカメラを使って読み取る。iOS Safari には BarcodeDetector がないので、jsQR などのライブラリを1つ追加する。
  - 来場者用の `/b/[boxCode]` を使い、実行委員としてログインしていれば回収の画面を出す（M-SCAN は不要になる）。ログインが切れていると、仮登録が1件作られてしまう点に注意する。
