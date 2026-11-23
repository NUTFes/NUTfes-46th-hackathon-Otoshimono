// 拾得物の写真の保存と読み出し（要件定義v2 要求1・4）。
// 本体は web/data/photos（Docker では /app/data/photos の永続ボリューム）に <写真の id>.jpg で置き、
// DB の item_photos には file_key だけを記録する。
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "./db";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_CONTENT_TYPE = "image/jpeg";

// 場所を固定しておくと、ビルドがプロジェクト全体を本番の出力に含めずに済む
function photoDir(): string {
  return path.join(process.cwd(), "data", "photos");
}

function filePath(fileKey: string): string {
  // file_key はこちらで作った値だけだが、念のためフォルダーの外を指せないようにする
  if (!/^[0-9a-f-]{36}\.jpg$/.test(fileKey)) throw new Error(`写真の file_key が正しくありません: ${fileKey}`);
  return path.join(process.cwd(), "data", "photos", fileKey);
}

/** JPEG の先頭（FF D8 FF）で始まるか。Content-Type ではなく中身で確かめる。 */
function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// 画面側では長い辺 1280px に縮めて送るので、それより大きい画像は API を直接呼んだもの
const MAX_EDGE = 1280;
// 画素数の大きすぎる画像で、展開のメモリーを使い切らないようにする
const MAX_INPUT_PIXELS = 4096 * 4096;

/**
 * JPEG として最後まで展開できるかを確かめ、保存用の JPEG に作り直す。開けなければ null。
 * 作り直すので、撮影場所（GPS）などの情報は画面側で消し忘れても（API を直接呼ばれても）残らない。
 */
export async function normalizePhoto(bytes: Uint8Array): Promise<Buffer | null> {
  if (!isJpeg(bytes)) return null;
  try {
    return await sharp(bytes, { failOn: "truncated", limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

/** 写真を保存して、DB に記録する id と file_key を返す。 */
export async function savePhotoFile(bytes: Uint8Array): Promise<{ id: string; fileKey: string }> {
  const id = randomUUID();
  const fileKey = `${id}.jpg`;
  await mkdir(photoDir(), { recursive: true });
  // ディスクがいっぱいなどで途中まで書けたファイルは消す（DB に紐づかないファイルを残さない）
  await writeFile(filePath(fileKey), bytes, { flag: "wx" }).catch(async (error) => {
    await deletePhotoFile(fileKey);
    throw error;
  });
  return { id, fileKey };
}

export async function readPhotoFile(fileKey: string): Promise<Buffer> {
  return readFile(filePath(fileKey));
}

/** 消せなくても処理は続ける（DB からは外れているので、表示されることはない）。 */
export async function deletePhotoFile(fileKey: string): Promise<void> {
  await unlink(filePath(fileKey)).catch((error) => {
    console.error("写真のファイルを消せませんでした", fileKey, error);
  });
}

/** 写真の本文を MAX_PHOTO_BYTES まで読む。超えたら読むのをやめて null（長さを付けずに分割して送られても止める）。 */
export async function readPhotoBody(request: Request): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) return null;
  if (!request.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_PHOTO_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/**
 * 拾得物の写真（kind ごとに1枚）を差し替える。物の状態が statuses のどれでもなければ何もせず null。
 * 先に DB へつないでからファイルを書き、失敗したら書いたファイルを消す（DB に紐づかないファイルを残さない）。
 * 古いファイルはコミットの後に消す。
 */
export async function replaceItemPhoto(
  itemId: string,
  kind: "drop" | "register",
  statuses: readonly string[],
  photo: Uint8Array,
): Promise<{ id: string } | null> {
  const client = await db.connect();
  let saved: { id: string; fileKey: string } | null = null;
  let replaced: string[] = [];
  try {
    saved = await savePhotoFile(photo);
    await client.query("BEGIN");
    const item = await client.query("SELECT 1 FROM items WHERE id = $1 AND status = ANY($2) FOR UPDATE", [
      itemId,
      statuses,
    ]);
    if (item.rowCount === 0) {
      await client.query("ROLLBACK");
      await deletePhotoFile(saved.fileKey);
      return null;
    }
    const old = await client.query<{ file_key: string }>(
      "DELETE FROM item_photos WHERE item_id = $1 AND kind = $2 RETURNING file_key",
      [itemId, kind],
    );
    replaced = old.rows.map((row) => row.file_key);
    await client.query(
      "INSERT INTO item_photos (id, item_id, kind, file_key, content_type) VALUES ($1, $2, $3, $4, $5)",
      [saved.id, itemId, kind, saved.fileKey, PHOTO_CONTENT_TYPE],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (saved) await deletePhotoFile(saved.fileKey);
    throw error;
  } finally {
    client.release();
  }
  await Promise.all(replaced.map(deletePhotoFile));
  return { id: saved.id };
}
