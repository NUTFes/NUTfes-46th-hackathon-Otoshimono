import { sendNotFound } from "@/lib/mail";
import { isReportId, mailFailed, withLockedReport } from "@/lib/report-notices";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 現在は見つかっていないことを知らせる（E-NOTFOUND）。照合は続け、後から見つかれば受取案内を送れる。
// 同じ連絡を何度も送らないよう、確認待ちのときだけ送れる。
export async function POST(_request: Request, ctx: RouteContext<"/api/staff/reports/[id]/not-found-notice">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isReportId(id)) return Response.json({ error: { message: "紛失届が見つかりません。" } }, { status: 404 });

  return withLockedReport(id, async (report, client) => {
    if (report.status !== "pending") {
      return { ok: false, status: 409, message: "この紛失届には、すでに連絡しています。" };
    }

    const failed = mailFailed(await sendNotFound({ to: report.email, token: report.token }));
    if (failed) return failed;

    await client.query("UPDATE lost_reports SET status = 'not_found_notified' WHERE id = $1", [report.id]);
    return { ok: true, body: { status: "not_found_notified" } };
  });
}
