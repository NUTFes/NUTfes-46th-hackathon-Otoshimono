import { db } from "@/lib/db";
import { isDropId } from "@/lib/drops";
import { normalizePhoto, readPhotoBody, replaceItemPhoto } from "@/lib/photos";

// 拾得者が撮った写真を、自分の仮登録に付ける（要件定義v2 要求1）。
// 本文は JPEG そのもの（画面側で縮小して送る）。1件の仮登録につき1枚で、送り直したら差し替える。
export async function POST(request: Request, ctx: RouteContext<"/api/drops/[dropId]/photo">) {
  const { dropId } = await ctx.params;
  if (!isDropId(dropId)) {
    return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
  }

  const bytes = await readPhotoBody(request);
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

  // 実行委員が回収したあとの物には、拾得者から写真を足せないようにする
  const saved = await replaceItemPhoto(dropId, "drop", ["provisional"], photo);
  if (!saved) {
    return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
