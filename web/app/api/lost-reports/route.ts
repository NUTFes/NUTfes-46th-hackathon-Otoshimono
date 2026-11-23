import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { isRequestId, validateLostReport } from "@/lib/lost-reports";
import { sendLostReportReceived } from "@/lib/mail";

type Saved = { report_number: string; token: string };

// 紛失届を受け付ける（来場者向け、ログインなし）
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  // 送り直しで二重に登録しないための ID。画面が届け出ごとに作り、送り直しても変えない
  const requestId =
    body !== null && typeof body === "object" ? (body as { requestId?: unknown }).requestId : undefined;
  if (!isRequestId(requestId)) {
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
    const inserted = await db.query<Saved>(
      `INSERT INTO lost_reports
         (token, request_id, category, item_description, color, color_note, features, lost_place, lost_time, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (request_id) DO NOTHING
       RETURNING report_number, token`,
      [
        token,
        requestId,
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
    const saved = inserted.rows[0];
    if (saved) {
      // 受付メール（E-RECEIVED）は、応答を返してから送る。メールサーバーにつながらなくても
      // 受付完了の画面を待たせず、紛失届の保存も取り消さない（送れなかったことは mail.ts がログに出す）。
      // 送り直し（下の 200）では送らないので、同じ届け出にメールが2通届くことはない
      after(() =>
        sendLostReportReceived({
          to: report.email,
          token: saved.token,
          reportNumber: saved.report_number,
          category: report.category,
          itemDescription: report.itemDescription,
        }),
      );
      return Response.json(toBody(saved), { status: 201 });
    }

    // 同じ ID ですでに受け付けている（前回の応答が届かずに送り直された）。前回の受付結果を返す
    const existing = await db.query<Saved>(
      "SELECT report_number, token FROM lost_reports WHERE request_id = $1",
      [requestId],
    );
    return Response.json(toBody(existing.rows[0]), { status: 200 });
  } catch (error) {
    console.error("紛失届の保存に失敗しました", error);
    return Response.json(
      { message: "受け付けられませんでした。時間をおいてもう一度お試しください。" },
      { status: 500 },
    );
  }
}

function toBody(saved: Saved) {
  return { reportNumber: saved.report_number, token: saved.token };
}
