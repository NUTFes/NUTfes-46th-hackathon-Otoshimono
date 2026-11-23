// db/migrations の連番付きSQLを、未適用のものだけ番号順に適用する。
// 接続先は PG* 環境変数（PGHOST など）で指定する。
// 使い方: npm run db:migrate
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../db/migrations",
);
const FILE_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/;
// 同時に複数のプロセスが適用しないようにするためのロックID（任意の固定値）
const LOCK_ID = 46_2026_1123;

async function loadMigrations() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const byVersion = new Map();
  for (const name of files) {
    const match = FILE_PATTERN.exec(name);
    if (!match) {
      throw new Error(
        `ファイル名が規則に合いません: ${name}（例: 002_create_boxes.sql）`,
      );
    }
    const version = match[1];
    if (byVersion.has(version)) {
      throw new Error(
        `番号 ${version} が重複しています: ${byVersion.get(version).name} と ${name}。後からマージする側が番号を振り直してください。`,
      );
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
    // Windows の git が改行を CRLF に変えても同じファイルとみなすため、LF にそろえてから計算する
    const checksum = createHash("sha256")
      .update(sql.replace(/\r\n/g, "\n"))
      .digest("hex");
    byVersion.set(version, { version, name, sql, checksum });
  }
  return [...byVersion.values()];
}

async function main() {
  const migrations = await loadMigrations();
  const client = new pg.Client({ connectionTimeoutMillis: 5_000 });
  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        name       text NOT NULL,
        checksum   text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query(
      "SELECT version, name, checksum FROM schema_migrations",
    );
    const applied = new Map(rows.map((row) => [row.version, row]));

    let count = 0;
    for (const migration of migrations) {
      const done = applied.get(migration.version);
      if (done) {
        if (done.checksum !== migration.checksum) {
          throw new Error(
            `適用済みの ${done.name} が書き換えられています。適用済みのSQLは直さず、新しい番号のSQLを追加してください。`,
          );
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
          [migration.version, migration.name, migration.checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${migration.name} の適用に失敗しました: ${error.message}`);
      }
      console.log(`適用: ${migration.name}`);
      count += 1;
    }

    console.log(count === 0 ? "適用するマイグレーションはありません" : `${count} 件適用しました`);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
