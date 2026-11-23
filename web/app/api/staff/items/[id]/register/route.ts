import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { validateRegistration } from "@/lib/item-registration";
import { rejectUnlessStaff } from "@/lib/staff-auth";

function error(message: string, status: number, extra?: object) {
  return Response.json({ error: { message, ...extra } }, { status });
}

// 回収済の物を本登録し、管理番号（L-0001 の形）を発行する（要件定義v2 要求4）。
// 番号は DB の連番から取るので、2人が同時に登録しても重ならない（失敗した登録の番号は欠番になる）。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/register">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const result = validateRegistration(await request.json().catch(() => null));
  if (!result.ok) return error("入力内容を確認してください。", 400, { errors: result.errors });
  const value = result.value;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // 同じ物を2人が同時に登録しても1回だけになるよう、行を押さえてから状態を確かめる
    const item = await client.query<{ status: string; box_id: number }>(
      "SELECT status, box_id FROM items WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!item.rows[0]) {
      await client.query("ROLLBACK");
      return error("物品が見つかりません。", 404);
    }
    if (item.rows[0].status !== "collected") {
      await client.query("ROLLBACK");
      return error("回収済の物品だけ本登録できます。", 409);
    }
    const photo = await client.query("SELECT 1 FROM item_photos WHERE item_id = $1 AND kind = 'register'", [id]);
    if (photo.rowCount === 0) {
      await client.query("ROLLBACK");
      return error("登録する物品の写真を撮ってください。", 400);
    }

    const updated = await client.query<{ management_number: string }>(
      `UPDATE items
          SET status = 'registered',
              management_number = (
                SELECT 'L-' || CASE WHEN n < 10000 THEN lpad(n::text, 4, '0') ELSE n::text END
                  FROM (SELECT nextval('item_management_number_seq') AS n) AS next
              ),
              category = $2, category_note = $3, color = $4, color_note = $5,
              description = $6, storage_location = $7,
              registered_at = now(), updated_at = now()
        WHERE id = $1
       RETURNING management_number`,
      [id, value.category, value.categoryNote, value.color, value.colorNote, value.description, value.storageLocation],
    );
    // 同じ BOX から回収した次の物（古い順）。画面はそのまま次の本登録へ進む
    const next = await client.query<{ id: string }>(
      `SELECT id FROM items WHERE box_id = $1 AND status = 'collected'
        ORDER BY dropped_at, id LIMIT 1`,
      [item.rows[0].box_id],
    );
    await client.query("COMMIT");
    return Response.json({ managementNumber: updated.rows[0].management_number, nextItemId: next.rows[0]?.id ?? null });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("本登録に失敗しました", e);
    return error("本登録できませんでした。もう一度お試しください。", 500);
  } finally {
    client.release();
  }
}
