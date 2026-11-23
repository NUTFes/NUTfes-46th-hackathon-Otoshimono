# AGENTS.md

技大祭（46th NUTMEGハッカソン）の落とし物管理システム。生成AIでコードを書くときは、このファイルの前提とルールに従う。Next.js 固有の注意は [web/AGENTS.md](web/AGENTS.md) を読む。

## 仕様の参照先

仕様とデザインの正本は `docs/`。Notion と Figma は移行元で、そちらは見なくてよい。

- 要件定義v2: [docs/spec/requirements.md](docs/spec/requirements.md)
- 技術スタック: [docs/spec/tech-stack.md](docs/spec/tech-stack.md)
- ページ・API・テーブルの名前と担当: [docs/spec/routes.md](docs/spec/routes.md)。ここにない名前を勝手に作らない。
- デザイン: [docs/design/DESIGN.md](docs/design/DESIGN.md)（色・文字・余白・部品と、画面の一覧）。画面を作るときは、DESIGN.md と `docs/design/screens/` の該当する PNG を見て、並び順と文言を合わせる。
- 画面と要件定義が食い違うときは、要件定義を優先する。
- 段階C（ファイル名が `C_` の画面）は見本として置いているだけで、作らない。
- 作業単位は GitHub の Issue。Issue の「完了条件」を満たすところまでを実装範囲とし、範囲外の機能は足さない。

## 開発の段階

- ミニマム版を作る。画面はスマホのブラウザー向けのみ。アプリの機能としてAIは使わず、照合などの作業は実行委員が手で行う。
- **段階A**（核）: 「拾う → 回収 → 登録 → 届け出 → 照合 → 受渡」の一本道。先に最後まで通して動かす。
- **段階B**: Aの動作確認が済んでから足す（撮影後の確認画面、回収数の不一致への対応、紛失届の取り消し、説明用ホーム画面）。
- 段階C（マキシマム版: PCの管理画面、AIの利用など）は作らない。

## 担当

2人で分担する。ページごとの担当は [docs/spec/routes.md](docs/spec/routes.md) の「担当」の列に従い、ほかの担当のファイルは触らない。

- **担当1（@parsley001）**: 共通の土台（`boxes`・`items` テーブル、実行委員の認証、UI 部品、伏せ字の関数）、写真の保存、メール送信、ボックスQRからの仮登録、巡回と回収、本登録と管理番号の採番、物品の詳細と編集、不明状態の管理、紛失届と拾得物の照合とメール連絡。
- **担当2（@26sakuzawanutfes-max）**: 紛失届の入力・確認・受付完了とカテゴリ別件数、受け取りのご案内、紛失届一覧、受渡記録の入力・表示・取り消し。
- 実行委員向けの画面・API は、担当1が作る認証の確認関数を使う。独自の認証を作らない。
- 受渡記録の氏名・連絡先を伏せる処理と、メールの送信は、担当1が作る関数を使う。
- メール連絡と受渡には、担当1が本登録時に発行する管理番号を使う。

### 共通の部品と関数（担当1が持つ。使う側は中身を変えず、足りなければ担当1に頼む）

- **ページ・API の置き場所**: routes.md のパスがそのまま `web/app/` 以下のフォルダーになる（例: `/staff/items/[id]/handover` → `web/app/staff/items/[id]/handover/page.tsx`、`POST /api/staff/items/[id]/handover` → `web/app/api/staff/items/[id]/handover/route.ts`）。フォルダーの担当は routes.md の「担当」の列。
- **UI 部品**: `web/components/ui/`（`StaffHeader`、`Page`、`PageHeading`、`Button`、`ButtonLink`、`Field`、`Input`、`Select`、`Textarea`、`Checkbox`、`Notice`、`StaffTabs`、`DefinitionList`）。見本は開発中だけ `/dev/ui` で見られる。画面ごとの配置は各ページの `page.module.css` に書く。
- **色・余白などの値**: `web/app/globals.css` の CSS 変数（`var(--color-primary)` など）。値を直接書かない。
- **実行委員の認証**: `web/lib/staff-auth.ts`。ページでは `<Suspense>` の中のコンポーネントで最初に `await requireStaff()` を呼ぶ（未ログインならログイン画面へ移る）。Route Handler では最初に `const rejected = await rejectUnlessStaff(); if (rejected) return rejected;` を書く（未ログインなら 401）。
- **伏せ字**: `web/lib/mask.ts` の `maskName`、`maskPhone`、`maskEmail`。
- **メール**: `web/lib/mail.ts` の `sendLostReportReceived`（E-RECEIVED）、`sendItemFound`（E-FOUND）、`sendNotFound`（E-NOTFOUND）。サーバー側（Route Handler）からだけ呼ぶ。例外は投げず、`{ ok: true }` か `{ ok: false, error }` を返すので、送れなかったときにどうするか（保存は取り消さない、状態を変えない、など）は呼ぶ側で決める。宛先と紛失届の `token` を渡せば、リンクの URL は関数が作る（環境変数 `APP_ORIGIN` から。リクエストの Host からは作らない）。開発中は Mailpit が受け取るだけで外には送らず、[http://127.0.0.1:8025](http://127.0.0.1:8025) で見られる。
- **Next.js の注意**: `cacheComponents` が有効なので、Cookie や DB を読む処理と `await params`・`await searchParams` は `<Suspense>` の中のコンポーネントに置く。ページの `export default` 自体は同期のままにする（例: `web/app/staff/login/page.tsx`）。

## 技術スタック

- `web/` が Next.js（App Router、React、TypeScript）。画面とAPIを1つのプロジェクトにまとめる。
- 画面のスタイルは CSS Modules（`*.module.css`）。UIライブラリやCSSフレームワークは追加しない。
- API は Route Handlers（`app/**/route.ts`）。
- DB は PostgreSQL。`web/lib/db.ts` の `db`（`pg` の Pool）から、**パラメータ付きSQL**（`$1`, `$2`…）で操作する。値を文字列連結でSQLに埋め込まない。ORM やクエリビルダーは使わない。
- 依存パッケージを追加するときは、PR本文に理由を書く。

## DBとマイグレーション

- テーブル定義は `web/db/migrations/NNN_説明.sql`（3桁の連番、英小文字とアンダースコア）で管理する。例: `002_create_boxes.sql`
- 適用は `npm run db:migrate`（`web/` で実行）。未適用のファイルだけを番号順に、1ファイルずつトランザクションで適用する。Docker Compose の `app` は起動時に自動で適用する。
- 番号は、ブランチを作った時点の `main` にある最大番号 + 1 を使う。並行作業で番号がぶつかったら、**後からマージする側**が番号を振り直す（重複していると `db:migrate` がエラーにする）。振り直した人の手元のDBは、下の手順で作り直す（`db:migrate` もその手順を案内する）。
- **適用済みのSQLファイルは書き換えない**（書き換えると `db:migrate` がエラーにする）。変更は新しい番号のファイルで `ALTER TABLE` などを書く。
- 開発中にDBを作り直したいときは、リポジトリ直下で `docker compose down -v` → `docker compose up --wait db` → `npm run db:migrate`。

## 共通の定義

- **カテゴリ**（拾得物の本登録と紛失届で共用）: `web/lib/categories.ts` と `categories` テーブル（`001_create_categories.sql`）。財布、スマホ、鍵、カード類、イヤホン、バッグ、傘、衣類、水筒、その他の10種類。
  - DBには `code`（例: `wallet`）を保存し、画面には `label` を表示する。カテゴリを持つテーブルは `category text NOT NULL REFERENCES categories(code)` とする。
  - 「その他」のときは何を落とした/拾ったかの自由記述を必須にする（`requiresDescription`）。
  - 「その他」はカテゴリ別の件数を出さない（`showsCount`）。
  - 選択肢を変えるときは、TSの定義と新しい番号のSQLの両方を直す。
- **色**（紛失届）: `web/lib/colors.ts`。単一選択で、「その他」を選んだときの自由記述は任意。色が2色以上あるときは「その他」を選び、自由記述に書いてもらう（Figma の V-LOST にある「複数選択可」は採らない）。一覧は仮のもので、チームで確定したら直す。
- 拾得物の状態は「仮登録済 / 回収済 / 本登録済 / 受渡済 / 不明」の5つ（要件定義v2 要求11）。「無効」の状態や、途中受渡（本登録を経ずに受渡済）は作らない。

## 実装の注意

- 入力の検証は、画面だけでなく必ずサーバー側（Route Handler）でも行う。
- 実行委員向けのAPIと、受渡記録（氏名・連絡先）の閲覧は、サーバー側で権限を確認する。氏名・連絡先は一覧では伏せる。
- 画面を開いただけで記録が残る処理（QRからの仮登録など）は、GETリクエストやリンクのプレビュー、ブラウザーの先読みで発生しないように、画面の表示後にPOSTで送る。開発モードでは React の StrictMode により `useEffect` が2回実行されるので、二重に登録されないことも確認する。
- 来場者にアカウント登録やアプリのインストールを求めない。来場者への連絡はメールで行う。
- 位置情報は使わない。場所はQRからボックスを特定して記録する。
- 文言は日本語。`<html lang="ja">`。

## 作業とPRの進め方

- `main` から `feat/<issue番号>-<短い説明>` などのブランチを切り、PRで `main` にマージする。マージは Squash。
- PRを出す前に `web/` で `npm run lint` と `npm run build` が通ることを確認する。
- PR本文には、対応する Issue（`Closes #番号`）と、Issue の完了条件ごとの確認手順・結果（画面の操作とDBに保存された内容）を書く。
- DBの中身の確認には `psql` を使う: `docker compose exec db psql -U otoshimono -d otoshimono`
