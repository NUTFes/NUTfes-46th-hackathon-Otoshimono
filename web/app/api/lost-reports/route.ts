import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { validateLostReport } from "@/lib/lost-reports";

// 紛失届を受け付ける（来場者向け、ログインなし）
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const result = validateLostReport(body);
  if (!result.ok) {
    return Response.json(
      { message: "入力内容を確認してください。", errors: result.errors },
      { status: 400 },
    );
  }

  const report = result.value;
  // 状況ページの URL に使う。推測できない長いランダム値
  const token = randomBytes(32).toString("base64url");

  try {
    const { rows } = await db.query<{ report_number: string; token: string }>(
      `INSERT INTO lost_reports
         (token, category, item_description, color, color_note, features, lost_place, lost_time, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING report_number, token`,
      [
        token,
        report.category,
        report.itemDescription,
        report.color,
        report.colorNote,
        report.features,
        report.lostPlace,
        report.lostTime,
        report.email,
      ],
    );
    return Response.json(
      { reportNumber: rows[0].report_number, token: rows[0].token },
      { status: 201 },
    );
  } catch (error) {
    console.error("紛失届の保存に失敗しました", error);
    return Response.json(
      { message: "受け付けられませんでした。時間をおいてもう一度お試しください。" },
      { status: 500 },
    );
  }
}
