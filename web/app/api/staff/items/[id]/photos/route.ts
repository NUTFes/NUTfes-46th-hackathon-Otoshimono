import { isUuid } from "@/lib/drops";
import { normalizePhoto, readPhotoBody, replaceItemPhoto } from "@/lib/photos";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 本登録の写真（M-PHOTO）。本文は JPEG そのもの（画面側で縮小して送る）。1つの物に1枚で、撮り直したら差し替える。
// 拾得者の写真（kind = 'drop'）とは別に持つ。本登録の途中（回収済）の物だけ。
// 本登録の後に届いた古い送信で、確定した写真を上書きしないため。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/photos">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: { message: "物品が見つかりません。" } }, { status: 404 });

  const bytes = await readPhotoBody(request);
  if (!bytes) return Response.json({ error: { message: "写真が大きすぎます。" } }, { status: 413 });
  const photo = await normalizePhoto(bytes);
  if (!photo) return Response.json({ error: { message: "写真を開けませんでした。撮り直してください。" } }, { status: 415 });

  const saved = await replaceItemPhoto(id, "register", ["collected"], photo);
  if (!saved) {
    return Response.json({ error: { message: "回収済の物品だけ写真を登録できます。" } }, { status: 409 });
  }
  return Response.json({ photoId: saved.id }, { status: 201 });
}
