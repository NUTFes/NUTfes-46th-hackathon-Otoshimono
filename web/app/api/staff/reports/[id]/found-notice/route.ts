import { isUuid } from "@/lib/drops";
import { sendItemFound } from "@/lib/mail";
import { isReportId, mailFailed, withLockedReport } from "@/lib/report-notices";
import { rejectUnlessStaff } from "@/lib/staff-auth";

// 見つかった物の管理番号を選んで、受取案内（E-FOUND）を送る。照合した物を紛失届に記録する。
// 確認待ち・該当なしを通知済みから送れる。見つかった旨を通知済みでも、取り違えの訂正のために別の物で送り直せる。
// 画面は表示していた照合済みの物（previousItemId）を送る。今の照合と違えば、ほかの実行委員が先に送ったので送らない
// （2人が同時に押しても、メールは1通だけ）。
export async function POST(request: Request, ctx: RouteContext<"/api/staff/reports/[id]/found-notice">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isReportId(id)) return Response.json({ error: { message: "紛失届が見つかりません。" } }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const { itemId, previousItemId } =
    body !== null && typeof body === "object" ? (body as { itemId?: unknown; previousItemId?: unknown }) : {};
  if (!isUuid(itemId)) {
    return Response.json({ error: { message: "見つかった物の管理番号を選んでください。" } }, { status: 400 });
  }
  if (previousItemId !== null && !isUuid(previousItemId)) {
    return Response.json({ error: { message: "送信内容を読み取れませんでした。" } }, { status: 400 });
  }

  return withLockedReport(id, async (report, client, progress) => {
    if (report.matched_item_id !== previousItemId) {
      return { ok: false, status: 409, message: "ほかの実行委員が先に連絡しました。画面を読み直してください。" };
    }
    if (report.matched_item_id === itemId) {
      return { ok: false, status: 409, message: "この物の受取案内はすでに送っています。" };
    }
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
    const failed = mailFailed(result, progress);
    if (failed) return failed;

    await client.query(
      "UPDATE lost_reports SET status = 'found_notified', matched_item_id = $2 WHERE id = $1",
      [report.id, itemId],
    );
    return { ok: true, body: { status: "found_notified", managementNumber: item.management_number } };
  });
}
