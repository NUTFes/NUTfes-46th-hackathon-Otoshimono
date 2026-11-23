import { isUuid } from "@/lib/drops";
import { sendItemFound } from "@/lib/mail";
import { isReportId, mailFailed, withLockedReport } from "@/lib/report-notices";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 見つかった物の管理番号を選んで、受取案内（E-FOUND）を送る。照合した物を紛失届に記録する。
// 確認待ち・該当なしを通知済みから送れる。見つかった旨を通知済みでも、取り違えの訂正のために送り直せる。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/reports/[id]/found-notice">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isReportId(id)) return Response.json({ error: { message: "紛失届が見つかりません。" } }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const itemId = body !== null && typeof body === "object" ? (body as { itemId?: unknown }).itemId : undefined;
  if (!isUuid(itemId)) {
    return Response.json({ error: { message: "見つかった物の管理番号を選んでください。" } }, { status: 400 });
  }

  return withLockedReport(id, async (report, client) => {
    // 本登録済の物だけ。メールを送っている間に受渡などで状態が変わらないよう押さえる
    const { rows } = await client.query<{ management_number: string; storage_location: string }>(
      `SELECT management_number, storage_location
         FROM items WHERE id = $1 AND status = 'registered' FOR SHARE`,
      [itemId],
    );
    const item = rows[0];
    if (!item) return { ok: false, status: 409, message: "本登録済の物品だけ選べます。" };

    const result = await sendItemFound({
      to: report.email,
      token: report.token,
      managementNumber: item.management_number,
      storageLocation: item.storage_location,
    });
    const failed = mailFailed(result);
    if (failed) return failed;

    await client.query(
      "UPDATE lost_reports SET status = 'found_notified', matched_item_id = $2 WHERE id = $1",
      [report.id, itemId],
    );
    return { ok: true, body: { status: "found_notified", managementNumber: item.management_number } };
  });
}
