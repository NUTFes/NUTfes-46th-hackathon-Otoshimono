import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { validateRegistration } from "@/lib/item-registration";
import { rejectUnlessStaff } from "@/lib/staff-auth";

function error(message: string, status: number, extra?: object) {
  return Response.json({ error: { message, ...extra } }, { status });
}

// 本登録済の物の登録情報を直す（M-EDIT）。検証は本登録と同じ。管理番号は変えない。
// 写真は先に POST /api/staff/items/[id]/photos で差し替える。2人が同時に保存したら、後の保存が残る。
export async function PATCH(request: Request, ctx: RouteContext<"/api/staff/items/[id]">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const result = validateRegistration(await request.json().catch(() => null));
  if (!result.ok) return error("入力内容を確認してください。", 400, { errors: result.errors });
  const value = result.value;

  const { rowCount } = await db.query(
    `UPDATE items
        SET category = $2, category_note = $3, color = $4, color_note = $5,
            description = $6, storage_location = $7, updated_at = now()
      WHERE id = $1 AND status = 'registered'`,
    [id, value.category, value.categoryNote, value.color, value.colorNote, value.description, value.storageLocation],
  );
  if (rowCount === 0) {
    const exists = await db.query("SELECT 1 FROM items WHERE id = $1", [id]);
    return exists.rowCount === 0
      ? error("物品が見つかりません。", 404)
      : error("本登録済の物品だけ編集できます。", 409);
  }
  return new Response(null, { status: 204 });
}
