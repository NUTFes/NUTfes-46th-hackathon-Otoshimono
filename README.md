# NUTfes-46th-hackathon-Otoshimono
落とし物管理アプリ：落とし物を誰でも簡単に届けられ、見つけられる仕組み（46th NUTMEGハッカソン）
チーム：Jarvis

## 仕様とデザイン

仕様とデザインの正本は `docs/` です。変更するときは `docs/` を直して PR を出します。

| 内容 | 正本 | 移行元（以後は更新しない） |
|---|---|---|
| 要件定義v2 | [docs/spec/requirements.md](docs/spec/requirements.md) | [Notion](https://app.notion.com/p/nutfes-nutmeg/20261118-v2-41c41f19206380b9817bee64986b49c6) |
| 技術スタック | [docs/spec/tech-stack.md](docs/spec/tech-stack.md) | [Notion](https://app.notion.com/p/nutfes-nutmeg/20261123-42041f1920638038aadfe3ba0994d7e5) |
| デザイン | [docs/design/DESIGN.md](docs/design/DESIGN.md) と [docs/design/screens/](docs/design/screens/) | [Figma](https://www.figma.com/design/fEtGRXwFKjfE8rXuIMWKmu/)「要件定義v2反映最終版（本当の） / 2026.11.20」ページ |

Figma で画面を変えたとき（モダンデザインへの切り替えを含む）は、同じ PR で `docs/design/screens/` の PNG と `DESIGN.md` を書き出し直します。

## 開発環境

Docker Compose、Node.js 22、npm を使用します。以下のコマンドはリポジトリ直下から実行します。

### PostgreSQL を Docker で起動し、Next.js をローカルで開発する

```sh
docker compose up --wait db
cd web
cp .env.example .env.local
npm ci
npm run db:migrate
npm run dev
```

PowerShell では `cp .env.example .env.local` の代わりに `Copy-Item .env.example .env.local` を使えます。`.env.local` が作成済みの場合はコピーを省略できます。

[http://127.0.0.1:3000](http://127.0.0.1:3000) を開きます。Next.js はファイルの変更を開発サーバーに反映します。PostgreSQL には `127.0.0.1:5432` で接続します。`.env.example` の認証情報はローカル開発用です。

`npm run db:migrate` は、`web/db/migrations` のSQLのうち未適用のものだけを適用します。`main` を取り込んで新しいSQLが増えたときも、同じコマンドを実行します。

### Next.js と PostgreSQL を Docker Compose で起動する

ローカルの開発サーバーが動いている場合は、先に `Ctrl+C` で停止して 3000 番ポートを空けます。

```sh
docker compose up --build --wait
docker compose ps
```

[http://127.0.0.1:3000](http://127.0.0.1:3000) を開きます。この構成では Next.js が Compose 内部の `db:5432` に接続し、接続設定は Compose から渡されます。マイグレーションはコンテナの起動時に自動で適用されます。コンテナを停止するにはリポジトリ直下で `docker compose down` を実行します。
