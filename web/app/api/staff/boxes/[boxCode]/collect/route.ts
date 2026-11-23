import { db } from "@/lib/db";
import { isBoxCode } from "@/lib/drops";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 巡回で BOX の QR を読んだら、その BOX の「仮登録済」をまとめて「回収済」にする（要件定義v2 要求4）。
// 回収数の入力は待たない（数の確認は段階B）。続けて読んでも、もう仮登録済の物がないので二重には数えない。
export async function POST(_request: Request, ctx: RouteContext<"/api/staff/boxes/[boxCode]/collect">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { boxCode } = await ctx.params;
  if (!isBoxCode(boxCode)) {
    return Response.json({ error: { message: "BOX が見つかりません。" } }, { status: 404 });
  }

  const { rows } = await db.query<{ box_found: boolean; collected: string }>(
    `WITH box AS (SELECT id FROM boxes WHERE code = $1),
          updated AS (
            UPDATE items SET status = 'collected', collected_at = now(), updated_at = now()
             WHERE box_id = (SELECT id FROM box) AND status = 'provisional'
            RETURNING 1
          )
     SELECT EXISTS (SELECT 1 FROM box) AS box_found, (SELECT count(*) FROM updated) AS collected`,
    [boxCode],
  );
  if (!rows[0].box_found) {
    return Response.json({ error: { message: "BOX が見つかりません。" } }, { status: 404 });
  }
  return Response.json({ collected: Number(rows[0].collected) });
}
