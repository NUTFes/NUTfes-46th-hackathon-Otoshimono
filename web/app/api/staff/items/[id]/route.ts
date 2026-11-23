import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/drops";
import { validateRegistration, type Registration } from "@/lib/item-registration";
import { MAX_PHOTO_BYTES, normalizePhoto, replaceItemPhoto } from "@/lib/photos";
import { rejectUnlessStaff } from "@/lib/staff-auth";

function error(message: string, status: number, extra?: object) {
  return Response.json({ error: { message, ...extra } }, { status });
}

// 写真のほかに入る欄（登録情報の JSON など）の分の余裕
const FORM_OVERHEAD_BYTES = 64 * 1024;

function updateFields(client: PoolClient | typeof db, id: string, value: Registration) {
  return client.query(
    `UPDATE items
        SET category = $2, category_note = $3, color = $4, color_note = $5,
            description = $6, storage_location = $7, updated_at = now()
      WHERE id = $1 AND status = 'registered'`,
    [id, value.category, value.categoryNote, value.color, value.colorNote, value.description, value.storageLocation],
  );
}

/**
 * 本文を読む。写真も変えるときは multipart/form-data（fields: 登録情報の JSON、photo: JPEG）、
 * 登録情報だけのときは JSON。
 */
async function readBody(request: Request): Promise<{ fields: unknown; photo: Uint8Array | null } | Response> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return { fields: await request.json().catch(() => null), photo: null };
  }
  // 大きすぎる本文は読まない（長さの分からない本文も読まない）
  const length = Number(request.headers.get("content-length") ?? NaN);
  if (!(length <= MAX_PHOTO_BYTES + FORM_OVERHEAD_BYTES)) return error("写真が大きすぎます。", 413);
  const form = await request.formData().catch(() => null);
  if (!form) return error("送信内容を読み取れませんでした。", 400);
  const rawFields = form.get("fields");
  let fields: unknown = null;
  try {
    fields = typeof rawFields === "string" ? JSON.parse(rawFields) : null;
  } catch {
    fields = null;
  }
  const file = form.get("photo");
  if (file === null) return { fields, photo: null };
  if (!(file instanceof File)) return error("送信内容を読み取れませんでした。", 400);
  if (file.size > MAX_PHOTO_BYTES) return error("写真が大きすぎます。", 413);
  return { fields, photo: new Uint8Array(await file.arrayBuffer()) };
}

// 本登録済の物の登録情報（と写真）を直す（M-EDIT）。検証は本登録と同じ。管理番号は変えない。
// 写真も変えるときは、写真の差し替えと登録情報の更新を1つのトランザクションで行う（どちらかが失敗すれば両方とも元のまま）。
// 2人が同時に保存したら、後の保存が残る。
export async function PATCH(request: Request, ctx: RouteContext<"/api/staff/items/[id]">) {
  const rejected = await rejectUnlessStaff();
  if (rejected) return rejected;

  const { id } = await ctx.params;
  if (!isUuid(id)) return error("物品が見つかりません。", 404);

  const body = await readBody(request);
  if (body instanceof Response) return body;
  const result = validateRegistration(body.fields);
  if (!result.ok) return error("入力内容を確認してください。", 400, { errors: result.errors });
  const value = result.value;

  const photo = body.photo && (await normalizePhoto(body.photo));
  if (body.photo && !photo) return error("写真を開けませんでした。撮り直してください。", 415);

  let updated: boolean;
  try {
    if (photo) {
      // 物品の行を押さえて本登録済を確かめてから、写真と登録情報をまとめて保存する
      updated = (await replaceItemPhoto(id, "register", ["registered"], photo, async (client) => {
        await updateFields(client, id, value);
      })) !== null;
    } else {
      updated = ((await updateFields(db, id, value)).rowCount ?? 0) > 0;
    }
  } catch (e) {
    // 写真も登録情報も元のまま（写真の差し替えと同じトランザクションで失敗したため）
    console.error("物品の編集の保存に失敗しました", e);
    return error("保存できませんでした。写真と登録情報は変わっていません。もう一度お試しください。", 500);
  }
  if (!updated) {
    const exists = await db.query("SELECT 1 FROM items WHERE id = $1", [id]);
    return exists.rowCount === 0
      ? error("物品が見つかりません。", 404)
      : error("本登録済の物品だけ編集できます。", 409);
  }
  return new Response(null, { status: 204 });
}
