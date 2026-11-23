// 開発用のデータ（db/seed.sql）を入れ直す。本番では実行しない。
// 接続先は migrate.mjs と同じく PG* 環境変数。web/.env.local があれば読み込む。
// 使い方: npm run db:migrate のあとに npm run db:seed
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(path.join(WEB_DIR, ".env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("NODE_ENV=production では開発用のデータを入れません。");
  }

  const sql = await readFile(path.join(WEB_DIR, "db/seed.sql"), "utf8");
  const client = new pg.Client({ connectionTimeoutMillis: 5_000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`開発用のデータを入れられませんでした（先に npm run db:migrate を実行してください）: ${error.message}`);
  } finally {
    await client.end();
  }

  console.log("開発用のデータを入れ直しました");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
