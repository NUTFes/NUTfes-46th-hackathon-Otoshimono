// 落とし主へのメール（要件定義v2 要求6・7）。SMTP で送る。
// 文面は docs/design/screens/ の E-RECEIVED、E-FOUND、E-NOTFOUND。HTML と同じ内容のテキストを両方入れる。
// どの関数も例外を投げず、送れたかを MailResult で返す。失敗したときの扱いは呼び出す側が決める。
// shortcut: 送れなかったメールを溜めて送り直す仕組みはない。取りこぼしが問題になったら、未送信の一覧（テーブル）を足す。
import nodemailer from "nodemailer";
import { categoryLabel, OTHER_CATEGORY, type CategoryCode } from "./categories";

export type MailResult = { ok: true } | { ok: false; error: string };

// SMTP につながらないときに、画面を長く待たせない
const TIMEOUT_MS = 10_000;

type Config = {
  host: string;
  port: number;
  secure: boolean;
  user: string | undefined;
  pass: string | undefined;
  from: string;
  subjectPrefix: string;
  origin: string;
};

function readConfig(): Config | string {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_SUBJECT_PREFIX, APP_ORIGIN } =
    process.env;
  if (!SMTP_HOST) return "環境変数 SMTP_HOST が設定されていません";
  if (!MAIL_FROM) return "環境変数 MAIL_FROM が設定されていません";
  const port = Number(SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port <= 0) return "環境変数 SMTP_PORT が正しくありません";
  // リンクの頭はリクエストの Host からは作らない（書き換えられると、他のサイトへのリンクを送らされる）
  let origin: string;
  try {
    const url = new URL(APP_ORIGIN ?? "");
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    origin = url.origin;
  } catch {
    return "環境変数 APP_ORIGIN が設定されていないか、正しくありません";
  }
  return {
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE === "true",
    user: SMTP_USER || undefined,
    pass: SMTP_PASS || undefined,
    from: MAIL_FROM,
    subjectPrefix: MAIL_SUBJECT_PREFIX ?? "",
    origin,
  };
}

type Message = { subject: string; html: string; text: string };

async function send(to: string, build: (origin: string) => Message): Promise<MailResult> {
  const config = readConfig();
  if (typeof config === "string") {
    console.error("メールを送れませんでした:", config);
    return { ok: false, error: config };
  }
  const message = build(config.origin);
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
    await transport.sendMail({
      from: config.from,
      to,
      subject: `${config.subjectPrefix}【技大祭 落とし物窓口】${message.subject}`.trim(),
      html: message.html,
      text: message.text,
    });
    return { ok: true };
  } catch (error) {
    // 宛先（来場者のメールアドレス）はログに残さない
    console.error("メールを送れませんでした:", error);
    return { ok: false, error: "メールを送れませんでした" };
  }
}

function lostReportUrl(origin: string, token: string, path = ""): string {
  return `${origin}/lost/${encodeURIComponent(token)}${path}`;
}

function categoryText(category: CategoryCode, itemDescription?: string | null): string {
  const label = categoryLabel(category);
  return category === OTHER_CATEGORY && itemDescription ? `${label}（${itemDescription}）` : label;
}

/** E-RECEIVED: 紛失届を受け付けました。 */
export function sendLostReportReceived(input: {
  to: string;
  token: string;
  reportNumber: string;
  category: CategoryCode;
  itemDescription?: string | null;
}): Promise<MailResult> {
  return send(input.to, (origin) => {
    const url = lostReportUrl(origin, input.token);
    const category = categoryText(input.category, input.itemDescription);
    return {
      subject: "紛失届を受け付けました",
      html: layout("紛失届を受け付けました", [
        paragraph("ご登録いただきありがとうございます。実行委員が、届いている落とし物と特徴を照合します。"),
        definitionRow("カテゴリ", category),
        paragraph("下のリンクから、ご登録内容と確認状況をご覧いただけます。", { muted: true }),
        button("紛失届の状況を見る", url),
        caption(`受付番号 ${input.reportNumber}（お問い合わせの際にお伝えください）`),
      ]),
      text: [
        "紛失届を受け付けました",
        "",
        "ご登録いただきありがとうございます。実行委員が、届いている落とし物と特徴を照合します。",
        "",
        `カテゴリ: ${category}`,
        "",
        "下のリンクから、ご登録内容と確認状況をご覧いただけます。",
        `紛失届の状況を見る: ${url}`,
        "",
        `受付番号 ${input.reportNumber}（お問い合わせの際にお伝えください）`,
      ].join("\n"),
    };
  });
}

/** E-FOUND: 落とし物が見つかりました。管理番号を大きく見せる（受け取りのときに実行委員に見せる）。 */
export function sendItemFound(input: {
  to: string;
  token: string;
  managementNumber: string;
  storageLocation: string;
}): Promise<MailResult> {
  return send(input.to, (origin) => {
    const url = lostReportUrl(origin, input.token, "/pickup");
    return {
      subject: `落とし物が見つかりました（管理番号 ${input.managementNumber}）`,
      html: layout("落とし物が見つかりました", [
        paragraph("ご登録の紛失届と一致する物が見つかりました。下記の場所へ受け取りにお越しください。"),
        managementNumberCard(input.managementNumber, input.storageLocation),
        paragraph("このメールか、受け取り案内の画面を実行委員に見せてください。", { muted: true }),
        button("受け取り案内を開く", url),
      ]),
      text: [
        "落とし物が見つかりました",
        "",
        "ご登録の紛失届と一致する物が見つかりました。下記の場所へ受け取りにお越しください。",
        "",
        `管理番号: ${input.managementNumber}`,
        `保管場所: ${input.storageLocation}`,
        "",
        "このメールか、受け取り案内の画面を実行委員に見せてください。",
        `受け取り案内を開く: ${url}`,
      ].join("\n"),
    };
  });
}

/** E-NOTFOUND: 現在は見つかっていません。 */
export function sendNotFound(input: { to: string; token: string }): Promise<MailResult> {
  return send(input.to, (origin) => {
    const url = lostReportUrl(origin, input.token);
    return {
      subject: "現在は見つかっていません",
      html: layout("現在は見つかっていません", [
        paragraph("現在届いている物を確認しましたが、紛失届と一致する物は見つかりませんでした。"),
        paragraph("後から届いた物とも照合を続け、見つかった場合は改めてメールでお知らせします。"),
        button("紛失届の状況を見る", url),
        paragraph("ご自身で見つかった場合は、本部の実行委員へお知らせください。", { muted: true }),
      ]),
      text: [
        "現在は見つかっていません",
        "",
        "現在届いている物を確認しましたが、紛失届と一致する物は見つかりませんでした。",
        "",
        "後から届いた物とも照合を続け、見つかった場合は改めてメールでお知らせします。",
        "",
        `紛失届の状況を見る: ${url}`,
        "",
        "ご自身で見つかった場合は、本部の実行委員へお知らせください。",
      ].join("\n"),
    };
  });
}

// ---- HTML の組み立て ----
// メールソフトの多くは <style> や外部の CSS を読まないので、表で組み、見た目は style 属性に直接書く。
// 色と大きさは docs/design/DESIGN.md（web/app/globals.css）と同じ値。

const COLOR = {
  primary: "#254b3f",
  onPrimary: "#ffffff",
  text: "#1e1e1e",
  muted: "#757575",
  border: "#d9d9d9",
};
const FONT = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title: string, blocks: string[]): string {
  const rows = blocks.map((block) => `<tr><td style="padding-top:24px;">${block}</td></tr>`).join("");
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:16px 0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid ${COLOR.border};font-family:${FONT};color:${COLOR.text};">
<tr><td style="padding:32px 32px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-size:14px;line-height:22px;color:${COLOR.muted};">技大祭 落とし物窓口</td></tr>
<tr><td style="padding-top:24px;"><h1 style="margin:0;font-size:24px;line-height:32px;font-weight:500;">${escapeHtml(title)}</h1></td></tr>
${rows}
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function paragraph(text: string, { muted = false } = {}): string {
  return `<p style="margin:0;font-size:16px;line-height:26px;color:${muted ? COLOR.muted : COLOR.text};">${escapeHtml(text)}</p>`;
}

function definitionRow(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="116" valign="top" style="font-size:14px;line-height:22px;color:${COLOR.muted};">${escapeHtml(label)}</td>
<td valign="top" style="font-size:16px;line-height:26px;">${escapeHtml(value)}</td>
</tr></table>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="background:${COLOR.primary};border-radius:4px;">
<a href="${escapeHtml(url)}" style="display:block;padding:13px 16px;font-size:16px;line-height:22px;color:${COLOR.onPrimary};text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function caption(text: string): string {
  return `<p style="margin:0;font-size:12px;line-height:18px;color:${COLOR.muted};">${escapeHtml(text)}</p>`;
}

function managementNumberCard(managementNumber: string, storageLocation: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLOR.border};border-radius:4px;"><tr>
<td style="padding:16px 16px 20px;">
<p style="margin:0;font-size:16px;line-height:24px;font-weight:500;">管理番号</p>
<p style="margin:16px 0 12px;font-size:40px;line-height:48px;font-weight:500;color:${COLOR.primary};letter-spacing:0.02em;">${escapeHtml(managementNumber)}</p>
${definitionRow("保管場所", storageLocation)}
</td></tr></table>`;
}
