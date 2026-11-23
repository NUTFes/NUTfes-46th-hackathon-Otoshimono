import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  isCorrectPasscode,
} from "@/lib/staff-auth";

// 移動先はパスだけで返す（request.url はサーバー内のホスト名になることがあり、スマホから開けない）
function seeOther(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}

// ログイン画面のフォームから送られる。JavaScript なしでも動くよう、結果は 303 で画面へ戻す。
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const passcode = form?.get("passcode");

  if (typeof passcode !== "string" || !isCorrectPasscode(passcode)) {
    return seeOther("/staff/login?error=1");
  }

  (await cookies()).set({
    name: SESSION_COOKIE,
    value: createSessionValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return seeOther("/staff/boxes");
}
