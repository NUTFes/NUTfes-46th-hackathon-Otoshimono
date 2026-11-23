import { isUuid } from "@/lib/drops";
import { normalizePhoto, readPhotoBody, replaceItemPhoto } from "@/lib/photos";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 本登録の写真（M-PHOTO）。本文は JPEG そのもの（画面側で縮小して送る）。1つの物に1枚で、撮り直したら差し替える。
// 拾得者の写真（kind = 'drop'）とは別に持つ。
// 画面は「どの状態の物の写真か」を ?status= で示し、物がその状態のときだけ差し替える。
// 本登録の途中（collected。指定なしも同じ）と、編集での写真の変更（registered）を取り違えないため
// （本登録の後に届いた本登録の途中の送信で、確定した写真を上書きしない）。
const STATUSES = ["collected", "registered"] as const;
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/photos">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: { message: "物品が見つかりません。" } }, { status: 404 });

  const bytes = await readPhotoBody(request);
  if (!bytes) return Response.json({ error: { message: "写真が大きすぎます。" } }, { status: 413 });
  const photo = await normalizePhoto(bytes);
  if (!photo) return Response.json({ error: { message: "写真を開けませんでした。撮り直してください。" } }, { status: 415 });

  const requested = new URL(request.url).searchParams.get("status") ?? "collected";
  const status = STATUSES.find((s) => s === requested);
  if (!status) return Response.json({ error: { message: "送信内容を読み取れませんでした。" } }, { status: 400 });

  const saved = await replaceItemPhoto(id, "register", [status], photo);
  if (!saved) {
    const message =
      status === "collected" ? "回収済の物品だけ写真を登録できます。" : "本登録済の物品だけ写真を変更できます。";
    return Response.json({ error: { message } }, { status: 409 });
  }
  return Response.json({ photoId: saved.id }, { status: 201 });
}
