import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { isDropId } from "@/lib/drops";

// 拾得者が任意で答える「種類」と「貴重品かも」を、自分の仮登録に足す（要件定義v2 要求1）。
// どちらも答えなくてよい。null は「答えない」。送られなかった項目は変えない。
export async function PATCH(request: Request, ctx: RouteContext<"/api/drops/[dropId]">) {
  const { dropId } = await ctx.params;
  if (!isDropId(dropId)) {
    return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return Response.json({ error: { message: "送信内容を読み取れませんでした" } }, { status: 400 });
  }
  const hasCategory = "reportedCategory" in body;
  const hasValuable = "isValuable" in body;
  const { reportedCategory = null, isValuable = null } = body as {
    reportedCategory?: unknown;
    isValuable?: unknown;
  };
  if (reportedCategory !== null && !isCategoryCode(reportedCategory)) {
    return Response.json({ error: { message: "種類が正しくありません" } }, { status: 400 });
  }
  if (isValuable !== null && typeof isValuable !== "boolean") {
    return Response.json({ error: { message: "貴重品の回答が正しくありません" } }, { status: 400 });
  }

  // 実行委員が回収したあとの物は、拾得者からは変えられないようにする
  const { rowCount } = await db.query(
    `UPDATE items
     SET reported_category = CASE WHEN $4 THEN $2 ELSE reported_category END,
         is_valuable       = CASE WHEN $5 THEN $3 ELSE is_valuable END,
         updated_at = now()
     WHERE id = $1 AND status = 'provisional'`,
    [dropId, reportedCategory, isValuable, hasCategory, hasValuable],
  );
  if (rowCount === 0) {
    return Response.json({ error: { message: "仮登録が見つかりません" } }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
