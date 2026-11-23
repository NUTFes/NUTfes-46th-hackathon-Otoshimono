import { db } from "@/lib/db";
import { isItemId, validateHandover } from "@/lib/handovers";
import { rejectUnlessStaff } from "@/lib/staff-auth";

function error(message: string, status: number, errors?: object) {
  return Response.json({ error: { message, ...(errors ? { errors } : {}) } }, { status });
}

// 受渡を記録し、拾得物を「受渡済」にする（本登録済の物だけ）。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/handover">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isItemId(id)) return error("物品が見つかりません。", 404);

  const body = await request.json().catch(() => null);
  const result = validateHandover(body);
  if (!result.ok) return error("入力内容を確認してください。", 400, result.errors);
  const handover = result.value;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // 同時に2人が記録しても二重にならないよう、物品の行を押さえてから状態を確かめる
    const { rows } = await client.query<{ status: string }>(
      "SELECT status FROM items WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return error("物品が見つかりません。", 404);
    }
    if (rows[0].status !== "registered") {
      await client.query("ROLLBACK");
      return error("本登録済の物品だけ受渡を記録できます。", 409);
    }

    await client.query(
      `INSERT INTO handovers (item_id, recipient_name, phone, email, identity_note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, handover.recipientName, handover.phone, handover.email, handover.identityNote],
    );
    await client.query(
      "UPDATE items SET status = 'handed_over', updated_at = now() WHERE id = $1",
      [id],
    );
    await client.query("COMMIT");
    return Response.json({ itemId: id }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("受渡の記録に失敗しました", e);
    return error("記録できませんでした。もう一度お試しください。", 500);
  } finally {
    client.release();
  }
}
