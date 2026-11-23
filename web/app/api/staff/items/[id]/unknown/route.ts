import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { rejectUnlessStaff } from "@/lib/staff-auth";
import { UNKNOWN_FROM_STATUSES, validateUnknown } from "@/lib/unknown";

function error(message: string, status: number, extra?: object) {
  return Response.json({ error: { message, ...extra } }, { status });
}

/** 行が無ければ 404、あれば（状態が合わないので）409。 */
async function notApplicable(id: string, message: string): Promise<Response> {
  const exists = await db.query("SELECT 1 FROM items WHERE id = $1", [id]);
  return exists.rowCount === 0 ? error("物品が見つかりません。", 404) : error(message, 409);
}

// 見当たらない物を理由付きで「不明」にする（要件定義v2 要求12）。不明にする前の状態を previous_status に残す。
// 時間がたったら自動で不明にする仕組みは作らない。1つの UPDATE で状態を確かめて変えるので、同時に押しても1回だけ効く。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/unknown">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const result = validateUnknown(await request.json().catch(() => null));
  if (!result.ok) return error("入力内容を確認してください。", 400, { errors: result.errors });

  const { rowCount } = await db.query(
    `UPDATE items
        SET previous_status = status, status = 'unknown',
            unknown_reason = $2, unknown_note = $3, updated_at = now()
      WHERE id = $1 AND status = ANY($4)`,
    [id, result.value.reason, result.value.note, UNKNOWN_FROM_STATUSES],
  );
  if (rowCount === 0) return notApplicable(id, "この物品は不明にできません。");
  return Response.json({ status: "unknown" });
}

// 見つかった物を、不明にする前の状態に戻す。理由と補足は消す。
export async function DELETE(_request: Request, ctx: RouteContext<"/api/staff/items/[id]/unknown">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const { rows } = await db.query<{ status: string }>(
    `UPDATE items
        SET status = previous_status, previous_status = NULL,
            unknown_reason = NULL, unknown_note = NULL, updated_at = now()
      WHERE id = $1 AND status = 'unknown'
      RETURNING status`,
    [id],
  );
  if (!rows[0]) return notApplicable(id, "この物品は不明になっていません。");
  return Response.json({ status: rows[0].status });
}
