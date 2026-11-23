// 紛失届の照合結果をメールで知らせる処理（要件定義v2 要求6・9、#15）。
// 紛失届の行を FOR UPDATE で押さえたトランザクションの中でメールを送り、送れたときだけ状況を保存する。
// 2人の実行委員が同時に押しても、メールは二重に送られない。
// メールを送った後に保存で失敗したときは、送り直すと2通届くので、送ったことを伝えて確かめるよう案内する。
import type { PoolClient } from "pg";
import { db } from "./db";
import type { MailResult } from "./mail";

/** lost_reports.id（連番）の形か。 */
export function isReportId(value: string): boolean {
  return /^[1-9][0-9]{0,15}$/.test(value);
}

export type LockedReport = {
  id: string;
  token: string;
  email: string;
  status: string;
  matched_item_id: string | null;
};

export type NoticeOutcome = { ok: true; body: object } | { ok: false; status: number; message: string };

export const MAIL_FAILED_MESSAGE = "メールを送れませんでした。もう一度お試しください。";
const SAVE_FAILED_AFTER_MAIL_MESSAGE =
  "メールは送りましたが、送ったことを記録できませんでした。送り直すと同じメールがもう一度届きます。送り直す前に、画面を読み直して確認状況を確かめてください。";

/** メールを送れたか。送った後の失敗では、送り直しを案内しない。 */
export type NoticeProgress = { mailSent: boolean };

/**
 * 紛失届を押さえて decide を呼ぶ。decide がメールを送り、保存まで済ませて ok を返したらコミットする。
 * それ以外（メールが送れない、状況が合わないなど）はロールバックして、何も変えない。
 */
export async function withLockedReport(
  reportId: string,
  decide: (report: LockedReport, client: PoolClient, progress: NoticeProgress) => Promise<NoticeOutcome>,
): Promise<Response> {
  const progress: NoticeProgress = { mailSent: false };
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<LockedReport>(
      "SELECT id, token, email, status, matched_item_id FROM lost_reports WHERE id = $1 FOR UPDATE",
      [reportId],
    );
    const outcome: NoticeOutcome = rows[0]
      ? await decide(rows[0], client, progress)
      : { ok: false, status: 404, message: "紛失届が見つかりません。" };
    if (!outcome.ok) {
      await client.query("ROLLBACK");
      return Response.json({ error: { message: outcome.message } }, { status: outcome.status });
    }
    await client.query("COMMIT");
    return Response.json(outcome.body);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("照合結果の連絡に失敗しました", { mailSent: progress.mailSent }, error);
    const message = progress.mailSent ? SAVE_FAILED_AFTER_MAIL_MESSAGE : MAIL_FAILED_MESSAGE;
    return Response.json({ error: { message } }, { status: 500 });
  } finally {
    client.release();
  }
}

/** メールが送れなかったら、送り直しを案内する結果を返す。送れたら progress に記録して null。 */
export function mailFailed(result: MailResult, progress: NoticeProgress): NoticeOutcome | null {
  if (!result.ok) return { ok: false, status: 502, message: MAIL_FAILED_MESSAGE };
  progress.mailSent = true;
  return null;
}
