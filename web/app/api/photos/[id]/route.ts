import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { readPhotoFile } from "@/lib/photos";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 拾得物の写真を返す。実行委員だけが見られる（来場者には見せない）。
export async function GET(_request: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const { rows } = await db.query<{ file_key: string; content_type: string }>(
    "SELECT file_key, content_type FROM item_photos WHERE id = $1",
    [id],
  );
  if (rows.length === 0) return new Response(null, { status: 404 });

  const bytes = await readPhotoFile(rows[0].file_key).catch(() => null);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": rows[0].content_type,
      // 写真は差し替えると id が変わるので、同じ id の中身は変わらない
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
