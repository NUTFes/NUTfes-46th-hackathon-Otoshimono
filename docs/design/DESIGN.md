---
name: 技大祭 落とし物管理
description: 来場者と実行委員がスマホのブラウザーで使う、落とし物の届け出・管理アプリ
colors:
  primary: "#254B3F"
  on-primary: "#FFFFFF"
  text: "#1E1E1E"
  text-muted: "#757575"
  surface: "#FFFFFF"
  surface-subtle: "#F5F5F5"
  border: "#D9D9D9"
  photo-placeholder: "#EEEEEA"
  camera-preview: "#222823"
  notice-bg: "#F8F2E7"
  notice-text: "#805C24"
  error: "#B3261E"
typography:
  display:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: "48px"
  headline:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "32px"
  title:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
  body-large:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "26px"
  body:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "22px"
  small:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  caption:
    fontFamily: "Noto Sans JP, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "46px"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "40px"
  textarea:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "80px"
  select-options:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-large}"
    rounded: "{rounded.md}"
    padding: "8px"
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    padding: "12px"
    height: "64px"
  notice:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    padding: "12px"
---

<!--
Figma「無題」（https://www.figma.com/design/fEtGRXwFKjfE8rXuIMWKmu/）の
ページ「要件定義v2反映最終版（本当の） / 2026.11.20」から 2026-11-23 に読み取ったもの。
値は A・B の画面で実際に使われているものを写している。
以後はこのファイルと screens/ の PNG が正本。Figma で画面を変えたときは、同じ PR で PNG とこのファイルを書き出し直す。
-->

# Design System: 技大祭 落とし物管理

## Overview

白地に深い緑を1色だけ差す、落ち着いた業務用の見た目。来場者はQRから1画面だけ開いて閉じ、実行委員は巡回の合間に片手で操作するので、装飾より「次に押すもの」が一目でわかることを優先している。

画面はスマホ（390 × 844）向けのみ。PC の管理画面（1920 × 1080）は段階C の見本で、今は作らない。

**Key Characteristics:**
- 白い面と灰色の 1px の線で区切る、影をほぼ使わない平らな画面
- 主な操作は画面下部の、幅いっぱいで高さ 48px の緑のボタン
- 文字は Noto Sans JP の Regular と Medium の2種類だけ
- 余白と間隔は 4px の倍数

## Colors

白と灰色の中立色に、主色の深い緑を1色だけ使う。

### Primary
- **深い緑**（primary）: 主なボタンの背景、選択中のタブ、ヘッダーと「戻る」ボタンの文字。画面の中で「押せるもの」と「今いる場所」を示す色で、それ以外には使わない。

### Neutral
- **墨色**（text）: 見出しと本文の文字。
- **灰色の文字**（text-muted）: 補足、項目名、件数などの二次的な文字。
- **白**（surface）: 画面の背景、カード、入力欄、ヘッダー。
- **薄い灰色の面**（surface-subtle）: 「結果はメールでお知らせします」のような案内の枠。
- **線の灰色**（border）: 入力欄、カード、ヘッダー下端、白いボタンの枠線。
- **写真の下地**（photo-placeholder）: 撮影した写真を出す枠。写真がないときの下地。
- **カメラの背景**（camera-preview）: 撮影画面のカメラのプレビュー部分。

### Tertiary
- **注意の面と文字**（notice-bg、notice-text）: 気をつけてほしいことを伝える枠。数は少なく、1画面に1つまで。
- **エラーの文字**（error）: 入力の誤りを伝える文字と、誤りのある入力欄の枠線。Figma には無いので、実装のときに足した（白地でのコントラスト 6.5:1）。

### Named Rules
**The One Green Rule.** 緑は「押せるもの」と「選択中」だけに使う。見出しや装飾を緑にしない。

Figma には `GIDAISAI / Product` という色の変数（teal、mint、ink、canvas、amber、sand、redSoft、blue、blueInk、photo）も定義されている。ただし画面の多くは変数ではなく上の値を直接使っているので、実装は上の値に合わせる。

## Typography

**Body Font:** Noto Sans JP（Regular 400 / Medium 500）

**Character:** 日本語の読みやすさを優先した、癖のない1書体。太さは2段階だけで、強弱は大きさと Medium で付ける。

### Hierarchy
- **Display**（Medium、40px、行の高さ 48px）: 管理番号（例: L-0042）を大きく見せるところだけに使う。受け取りのご案内（V-PICKUP）、物品詳細（M-DETAIL）、メール（E-FOUND）。
- **Headline**（Medium、24px、32px）: 各画面のページ見出し。
- **Title**（Medium、16px、24px）: カードや区切りの見出し。
- **Body Large**（Regular、16px、26px）: 選択肢の一覧、説明の段落。
- **Body**（Regular、14px、22px）: 本文、入力欄、ボタンの文字。画面で一番多い。
- **Label**（Medium、14px、22px）: 項目名、案内枠の文字。
- **Small**（Regular、13px、20px）: カテゴリ、保管場所、色などの補足情報。
- **Caption**（Regular、12px、18px）: 写真の注記など、一番小さい文字。

Figma の文字スタイル名は `GIDAISAI / caption`、`small`、`body`、`label`、`bodyLarge`、`strong`、`h3`、`h2`、`h1`、`display`。

## Layout

- 画面の幅は 390px を基準にする。左右の余白は 24px で、本文の幅は 342px。
- 上から順に、ヘッダー（高さ 64px）、ページ見出し、スクロールする本文、画面下部の操作ボタンと並べる。共通のフッターやタブバーは置かない（要件定義v2 で削除した）。
- 主な操作ボタンは本文の幅いっぱいに置く。2つ並べるときは縦に積み、間隔は 8px。
- 間隔は 4、8、12、16、20、24px を使う。一番多いのは 8px。

## Elevation & Depth

影は使わず、白い面と 1px の灰色の線、薄い灰色の面で区切る。唯一の例外は、選択肢を開いたときのドロップダウン（`0 1px 4px` の黒 5%）。

## Shapes

- 角丸はほぼすべて 4px（ボタン、入力欄、タブ）。ドロップダウンの選択肢の枠だけ 8px。
- 枠線は 1px。アイコンの線は 1.6px。

## Components

### Buttons
- **Shape:** 角丸 4px、高さ 48px、本文の幅いっぱい。
- **Primary:** 深い緑の地に白い文字。画面で一番進めてほしい操作に1つだけ使う（「この写真を送る」「入力内容を確認する」など）。
- **Secondary:** 白い地に灰色の枠線、緑の文字。「戻る」など、主な操作の脇に置く操作。

### Inputs / Fields
- **Style:** 白い地、1px の灰色の枠線、角丸 4px、内側の余白は上下 12px・左右 16px。
- 1行の入力欄は高さ 46px、選択（Select）は 40px、複数行（Textarea）は 80px。
- 選択肢を開くと、角丸 8px の枠に一覧を出す（文字は 16px）。

### Cards / Containers
- **Background:** 白。案内には薄い灰色の面を使う。
- **Border:** 1px の灰色。
- **Internal Padding:** 12px または 16px。

### Navigation
- **Header:** 高さ 64px の白い帯で、下端に灰色の線を引く。実行委員の画面ではここに画面名と操作を置く。拾得者の画面にはヘッダーを置かない（要件定義v2 で削除した）。
- **Tabs:** 選択中は深い緑の地に白い文字、選択していないものは白い地。

### 写真の枠
- 撮影した写真は、写真の下地の色の枠（342px 幅）に出す。カメラのプレビューは暗い背景の枠に出す。

## Do's and Don'ts

### Do:
- **Do** 画面を作る前に、下の一覧から該当する PNG を開いて、並び順と文言を合わせる。
- **Do** 色、文字、角丸、余白は、このファイルの先頭にある値を CSS Modules で使う。
- **Do** 画面と [要件定義](../spec/requirements.md) が食い違うときは、要件定義を優先する（例: 「30分での自動不明」は Figma のメモに残っているが、要件定義v2 で削除された）。

### Don't:
- **Don't** 段階C の画面を作らない（PNG は見本として置いているだけ）。
- **Don't** 緑を見出しや装飾に使わない。
- **Don't** 共通のフッターや、拾得者の画面のヘッダーを足さない。
- **Don't** 影を足さない（ドロップダウンを除く）。

## Screens

PNG は `screens/<段階>_<画面ID>.png`。スマホの画面とメール（幅 600px）は2倍、PC の画面とダイアログは等倍で書き出している。画面 ID の頭文字は、V が来場者（拾得者・落とし主）、M が実行委員のスマホ、E がメール、P が PC、X が AI などの拡張、D が PC のダイアログ。

### A（核。先に作る）

（※）Figma ではフレーム名に A/B/C が付いていないが、A の画面のボタンからつながっていて、要件定義でも A の機能なので A とした。同じく接頭辞のない B-BOX-AUTO（30分で自動的に不明）は、要件定義v2 で削除された機能なので取り込んでいない。

| ファイル | 画面 |
|---|---|
| [A_V-DROP.png](screens/A_V-DROP.png) | QR受付 / 写真は任意 |
| [A_V-DROP-SENT.png](screens/A_V-DROP-SENT.png) | 拾得情報の送信後 |
| [A_V-CAMERA.png](screens/A_V-CAMERA.png) | 拾得物の撮影 |
| [A_V-PHOTO-READY.png](screens/A_V-PHOTO-READY.png) | 拾得物の撮影（撮影後） |
| [A_V-LOST.png](screens/A_V-LOST.png) | 紛失届の登録 |
| [A_V-REVIEW.png](screens/A_V-REVIEW.png) | 紛失届の内容確認 |
| [A_V-STATUS.png](screens/A_V-STATUS.png) | 紛失届 / 受付・確認状況 |
| [A_V-STATUS-ZERO.png](screens/A_V-STATUS-ZERO.png) | 紛失届 / 受付・確認状況（0件） |
| [A_V-PICKUP.png](screens/A_V-PICKUP.png) | 受け取りのご案内 |
| [A_M-LOGIN.png](screens/A_M-LOGIN.png) | 実行委員ログイン |
| [A_M-BOXES.png](screens/A_M-BOXES.png) | 巡回 / BOX一覧 |
| [A_M-BOX.png](screens/A_M-BOX.png) | BOXごとの通知と写真 |
| [A_M-BOX-UNKNOWN.png](screens/A_M-BOX-UNKNOWN.png) | BOXの通知を不明にする（※） |
| [A_M-BOX-UNKNOWN-STATE.png](screens/A_M-BOX-UNKNOWN-STATE.png) | BOXの不明通知と復帰（※） |
| [A_M-SCAN.png](screens/A_M-SCAN.png) | 巡回用QR読み取り |
| [A_M-COLLECTED.png](screens/A_M-COLLECTED.png) | 回収完了 |
| [A_M-ITEMS.png](screens/A_M-ITEMS.png) | 物品一覧 |
| [A_M-QUEUE.png](screens/A_M-QUEUE.png) | 回収済の物を本登録（※） |
| [A_M-PHOTO.png](screens/A_M-PHOTO.png) | 本登録 / 写真を撮る |
| [A_M-REGISTER.png](screens/A_M-REGISTER.png) | 本登録 / 手入力 |
| [A_M-REVIEW.png](screens/A_M-REVIEW.png) | 本登録の内容確認 |
| [A_M-DETAIL.png](screens/A_M-DETAIL.png) | 本登録済の物品詳細 |
| [A_M-EDIT.png](screens/A_M-EDIT.png) | 登録情報の編集 |
| [A_M-PHOTO-EDIT.png](screens/A_M-PHOTO-EDIT.png) | 編集時の写真変更 |
| [A_M-REPORTS.png](screens/A_M-REPORTS.png) | 紛失届一覧 |
| [A_M-REPORTS-NOTIFIED.png](screens/A_M-REPORTS-NOTIFIED.png) | 紛失届一覧（受取案内を通知済み） |
| [A_M-REPORTS-SEARCHING.png](screens/A_M-REPORTS-SEARCHING.png) | 未発見・照合を継続 |
| [A_M-REPORT-DETAIL.png](screens/A_M-REPORT-DETAIL.png) | 紛失届の内容とメール連絡（照合）（※） |
| [A_M-HANDOVER.png](screens/A_M-HANDOVER.png) | 通常の受渡記録 |
| [A_M-RECEIPT.png](screens/A_M-RECEIPT.png) | 受渡記録 / 伏せ字 |
| [A_M-REVEAL.png](screens/A_M-REVEAL.png) | 受渡記録 / 個人情報表示 |
| [A_M-UNDO.png](screens/A_M-UNDO.png) | 受渡の取り消し確認 |
| [A_M-UNKNOWN.png](screens/A_M-UNKNOWN.png) | 不明にする / 理由入力 |
| [A_M-UNKNOWN-DETAIL.png](screens/A_M-UNKNOWN-DETAIL.png) | 不明 / 元の状態に戻す |
| [A_E-RECEIVED.png](screens/A_E-RECEIVED.png) | メール: 紛失届を受け付けました |
| [A_E-FOUND.png](screens/A_E-FOUND.png) | メール: 落とし物が見つかりました |
| [A_E-NOTFOUND.png](screens/A_E-NOTFOUND.png) | メール: 現在は見つかっていません |

### B（A が動いてから足す）

| ファイル | 画面 |
|---|---|
| [B_V-HOME.png](screens/B_V-HOME.png) | ホーム |
| [B_B-DROP.png](screens/B_B-DROP.png) | QR受付 / 写真は任意（B 版。文言は A と同じ） |
| [B_B-CAMERA.png](screens/B_B-CAMERA.png) | 拾得物の撮影（B 版。文言は A と同じ） |
| [B_V-PREVIEW.png](screens/B_V-PREVIEW.png) | 拾得物の写真確認 |
| [B_B-STATUS.png](screens/B_B-STATUS.png) | 紛失届の確認（受付・確認状況に、届け出の内容を足した版） |
| [B_V-CANCEL.png](screens/B_V-CANCEL.png) | 紛失届の取り消し確認 |
| [B_V-CANCEL-DONE.png](screens/B_V-CANCEL-DONE.png) | 紛失届の取り消し完了 |
| [B_M-COUNT.png](screens/B_M-COUNT.png) | 回収数の入力 |
| [B_M-COUNT-DIFF.png](screens/B_M-COUNT-DIFF.png) | 回収数の入力（数が合わない） |
| [B_M-MISMATCH.png](screens/B_M-MISMATCH.png) | 回収数の不一致確認 |
| [B_M-COLLECTED-DIFF.png](screens/B_M-COLLECTED-DIFF.png) | 回収完了（数が合わない） |

### C（マキシマム版。今は作らない）

| ファイル | 画面 |
|---|---|
| [C_V-MAP.png](screens/C_V-MAP.png) | BOXの設置場所 |
| [C_V-SCAN.png](screens/C_V-SCAN.png) | BOXのQR読み取り |
| [C_M-REMOVE.png](screens/C_M-REMOVE.png) | 登録の取り消し確認 |
| [C_C-DIRECT-PHOTO.png](screens/C_C-DIRECT-PHOTO.png) | 直接登録 / 写真を撮る |
| [C_C-DIRECT-REGISTER.png](screens/C_C-DIRECT-REGISTER.png) | 直接登録 / 手入力 |
| [C_C-DIRECT-REVIEW.png](screens/C_C-DIRECT-REVIEW.png) | 直接登録の内容確認 |
| [C_C-AI-REVIEW.png](screens/C_C-AI-REVIEW.png) | 本登録の内容確認（AI 入力） |
| [C_X-PHOTO.png](screens/C_X-PHOTO.png) | 写真から自動入力 |
| [C_X-AI-PROCESS.png](screens/C_X-AI-PROCESS.png) | 特徴の読み取り中 |
| [C_X-AI-REGISTER.png](screens/C_X-AI-REGISTER.png) | AI提案の確認・修正 |
| [C_X-AI-MATCH.png](screens/C_X-AI-MATCH.png) | AIによる照合候補 |
| [C_X-DETAIL.png](screens/C_X-DETAIL.png) | 状態・保管場所の操作 |
| [C_X-MOVE.png](screens/C_X-MOVE.png) | 保管場所の変更 |
| [C_P-LOGIN.png](screens/C_P-LOGIN.png) | PC: 実行委員ログイン |
| [C_P-ITEMS.png](screens/C_P-ITEMS.png) | PC: 物品一覧 |
| [C_P-REGISTER.png](screens/C_P-REGISTER.png) | PC: 物品の本登録 |
| [C_P-REVIEW.png](screens/C_P-REVIEW.png) | PC: 本登録の内容確認 |
| [C_P-DETAIL.png](screens/C_P-DETAIL.png) | PC: 物品の詳細と受渡 |
| [C_P-EDIT.png](screens/C_P-EDIT.png) | PC: 登録情報の編集 |
| [C_P-MATCH.png](screens/C_P-MATCH.png) | PC: 紛失届との照合 |
| [C_P-RECEIPT.png](screens/C_P-RECEIPT.png) | PC: 受渡記録 |
| [C_P-BOXES.png](screens/C_P-BOXES.png) | PC: 巡回状況 |
| [C_D-PII.png](screens/C_D-PII.png) | PC: 受渡記録の氏名・連絡先 |
| [C_D-UNDO.png](screens/C_D-UNDO.png) | PC: 受渡の取り消し確認 |
| [C_D-REMOVE.png](screens/C_D-REMOVE.png) | PC: 登録の取り消し確認 |
