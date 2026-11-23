import { db } from "@/lib/db";
import { isDropId } from "@/lib/drops";
import { MAX_PHOTO_BYTES, PHOTO_CONTENT_TYPE, deletePhotoFile, normalizePhoto, savePhotoFile } from "@/lib/photos";

/** 本文を最大 limit バイトまで読む。超えたら読むのをやめて null。 */
async function readAtMost(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
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

// 拾得者が撮った写真を、自分の仮登録に付ける（要件定義v2 要求1）。
// 本文は JPEG そのもの（画面側で縮小して送る）。1件の仮登録につき1枚で、送り直したら差し替える。
export async function POST(request: Request, ctx: RouteContext<"/api/drops/[dropId]/photo">) {
  const { dropId } = await ctx.params;
  if (!isDropId(dropId)) {
    return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES) {
    return Response.json({ error: { message: "写真が大きすぎます" } }, { status: 413 });
  }
  const bytes = await readAtMost(request, MAX_PHOTO_BYTES);
  if (!bytes) {
    return Response.json({ error: { message: "写真が大きすぎます" } }, { status: 413 });
  }
  // ログインのいらない API なので、無い仮登録あてには写真を展開もファイルの書き込みもしない
  const exists = await db.query("SELECT 1 FROM items WHERE id = $1 AND status = 'provisional'", [dropId]);
  if (exists.rowCount === 0) {
    return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
  }
  // 途中で切れたなど、開けない写真で差し替えて元の写真を失わないよう、保存の前に展開して確かめる
  const photo = await normalizePhoto(bytes);
  if (!photo) {
    return Response.json({ error: { message: "JPEG の写真を送ってください" } }, { status: 415 });
  }

  // 先に DB へつないでからファイルを書く（つなげずに、DB に紐づかないファイルが残らないように）
  const client = await db.connect();
  let saved: { id: string; fileKey: string } | null = null;
  let replaced: string[] = [];
  try {
    saved = await savePhotoFile(photo);
    const { id, fileKey } = saved;
    await client.query("BEGIN");
    // 実行委員が回収したあとの物には、拾得者から写真を足せないようにする
    const item = await client.query(
      "SELECT 1 FROM items WHERE id = $1 AND status = 'provisional' FOR UPDATE",
      [dropId],
    );
    if (item.rowCount === 0) {
      await client.query("ROLLBACK");
      await deletePhotoFile(fileKey);
      return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
    }
    const old = await client.query<{ file_key: string }>(
      "DELETE FROM item_photos WHERE item_id = $1 AND kind = 'drop' RETURNING file_key",
      [dropId],
    );
    replaced = old.rows.map((row) => row.file_key);
    await client.query(
      "INSERT INTO item_photos (id, item_id, kind, file_key, content_type) VALUES ($1, $2, 'drop', $3, $4)",
      [id, dropId, fileKey, PHOTO_CONTENT_TYPE],
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
  return new Response(null, { status: 204 });
}
