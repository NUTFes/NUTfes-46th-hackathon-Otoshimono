import { db } from "@/lib/db";
import { isItemId, validateHandover } from "@/lib/handovers";
import { rejectUnlessStaff } from "@/lib/staff-auth";

function error(message: string, status: number, extra?: object) {
  return Response.json({ error: { message, ...extra } }, { status });
}

// 受渡を記録し、拾得物を「受渡済」にする（本登録済の物だけ）。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/handover">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isItemId(id)) return error("物品が見つかりません。", 404);

  const body = await request.json().catch(() => null);
  const result = validateHandover(body);
  if (!result.ok) return error("入力内容を確認してください。", 400, { errors: result.errors });
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
    if (rows[0].status === "handed_over") {
      // 前回の記録が保存されたあとに応答だけが届かず、送り直された場合など。記録の確認先を案内する
      await client.query("ROLLBACK");
      return error("この物品はすでに受渡済として記録されています。受渡記録を確認してください。", 409, {
        code: "already_handed_over",
        receiptHref: `/staff/handovers/${id}`,
      });
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

// 受渡を取り消し、拾得物を「本登録済」に戻す（受渡済の物だけ）。管理番号は変えない。
// 受渡記録の行は消さずに「取り消し済み」（cancelled_at）にする（要件定義v2 要求10: 情報は削除しない）。
export async function DELETE(_request: Request, ctx: RouteContext<"/api/staff/items/[id]/handover">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isItemId(id)) return error("物品が見つかりません。", 404);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ status: string }>(
      "SELECT status FROM items WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return error("物品が見つかりません。", 404);
    }
    if (rows[0].status !== "handed_over") {
      await client.query("ROLLBACK");
      return error("受渡済の物品だけ取り消せます。", 409);
    }

    await client.query(
      "UPDATE handovers SET cancelled_at = now() WHERE item_id = $1 AND cancelled_at IS NULL",
      [id],
    );
    await client.query(
      "UPDATE items SET status = 'registered', updated_at = now() WHERE id = $1",
      [id],
    );
    await client.query("COMMIT");
    return Response.json({ itemId: id }, { status: 200 });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("受渡の取り消しに失敗しました", e);
    return error("取り消せませんでした。もう一度お試しください。", 500);
  } finally {
    client.release();
  }
}
