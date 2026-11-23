// 実行委員の共通パスコードによるログイン（要件定義v2 要求13）。
// セッションは「有効期限.署名」を HMAC で署名した Cookie に持ち、DB には保存しない。
// 全員を締め出したいときは SESSION_SECRET を変える。
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const SESSION_COOKIE = "staff_session";
// 技大祭の2日間、ログインし直さずに済む長さ
export const SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;

function requireEnv(name: "STAFF_PASSCODE" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

function sign(expiresAt: number): string {
  return createHmac("sha256", requireEnv("SESSION_SECRET"))
    .update(`staff.${expiresAt}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // 長さの違いで中身を推測されないよう、ハッシュをそろえてから比べる
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function isCorrectPasscode(passcode: string): boolean {
  return safeEqual(passcode, requireEnv("STAFF_PASSCODE"));
}

export function createSessionValue(now = Date.now()): string {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isValidSessionValue(value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const [expires, signature] = value.split(".");
  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !signature) return false;
  return safeEqual(signature, sign(expiresAt));
}

export async function hasStaffSession(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  // 有効期限の判定で現在時刻を読むので、事前描画ではなくリクエストごとに動かす
  await connection();
  return isValidSessionValue(value);
}

/** 実行委員のページで最初に呼ぶ。未ログインならログイン画面へ移す。<Suspense> の中で呼ぶこと。 */
export async function requireStaff(): Promise<void> {
  if (!(await hasStaffSession())) redirect("/staff/login");
}

/** 実行委員の Route Handler で使う。未ログインなら 401 の Response を返し、ログイン済みなら null。 */
export async function rejectUnlessStaff(): Promise<Response | null> {
  if (await hasStaffSession()) return null;
  return Response.json({ error: { message: "ログインが必要です" } }, { status: 401 });
}
