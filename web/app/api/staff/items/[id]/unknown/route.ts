import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { rejectUnlessStaff } from "@/lib/staff-auth";
import { STALE_UNKNOWN_MESSAGE, UNKNOWN_FROM_STATUSES, validateUnknown } from "@/lib/unknown";

function error(message: string, status: number, extra?: object) {
  return Response.json({ error: { message, ...extra } }, { status });
}

/** 行が無ければ 404、あれば（画面を開いた後に、ほかの実行委員が状態を変えたので）409。 */
async function notApplicable(id: string): Promise<Response> {
  const exists = await db.query("SELECT 1 FROM items WHERE id = $1", [id]);
  return exists.rowCount === 0 ? error("物品が見つかりません。", 404) : error(STALE_UNKNOWN_MESSAGE, 409);
}

// 見当たらない物を理由付きで「不明」にする（要件定義v2 要求12）。不明にする前の状態を previous_status に残す。
// 時間がたったら自動で不明にする仕組みは作らない。1つの UPDATE で状態を確かめて変えるので、同時に押しても1回だけ効く。
// 画面で見た状態（expectedStatus）が今と同じときだけ変える（開いた後に回収・本登録された物を、古い画面から不明にしない）。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/items/[id]/unknown">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const body = (await request.json().catch(() => null)) as { expectedStatus?: unknown } | null;
  const expectedStatus = body?.expectedStatus;
  if (!UNKNOWN_FROM_STATUSES.some((status) => status === expectedStatus)) {
    return error("画面で見た状態（expectedStatus）を送ってください。", 400);
  }
  const result = validateUnknown(body);
  if (!result.ok) return error("入力内容を確認してください。", 400, { errors: result.errors });

  const { rowCount } = await db.query(
    `UPDATE items
        SET previous_status = status, status = 'unknown',
            unknown_reason = $2, unknown_note = $3, updated_at = now()
      WHERE id = $1 AND status = $4`,
    [id, result.value.reason, result.value.note, expectedStatus],
  );
  if (rowCount === 0) return notApplicable(id);
  return Response.json({ status: "unknown" });
}

// 見つかった物を、不明にする前の状態に戻す。理由と補足は消す。
// 画面を作ったときの updated_at（expectedUpdatedAt、DB の文字列のまま）が今と同じときだけ戻す。
// 不明の間に updated_at が変わるのは戻して不明にし直したときだけなので、古い画面から新しい不明の記録を消さない。
export async function DELETE(request: Request, ctx: RouteContext<"/api/staff/items/[id]/unknown">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const body = (await request.json().catch(() => null)) as { expectedUpdatedAt?: unknown } | null;
  const expectedUpdatedAt = body?.expectedUpdatedAt;
  if (typeof expectedUpdatedAt !== "string" || expectedUpdatedAt === "" || expectedUpdatedAt.length > 64) {
    return error("画面を作ったときの更新時刻（expectedUpdatedAt）を送ってください。", 400);
  }

  const { rows } = await db.query<{ status: string }>(
    `UPDATE items
        SET status = previous_status, previous_status = NULL,
            unknown_reason = NULL, unknown_note = NULL, updated_at = now()
      WHERE id = $1 AND status = 'unknown' AND updated_at::text = $2
      RETURNING status`,
    [id, expectedUpdatedAt],
  );
  if (!rows[0]) return notApplicable(id);
  return Response.json({ status: rows[0].status });
}
