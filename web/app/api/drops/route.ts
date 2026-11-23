import { db } from "@/lib/db";
import { isBoxCode, isDropId } from "@/lib/drops";

// 拾得者の画面（/b/[boxCode]）が表示された後に呼ばれ、そのBOXに仮登録を1件作る。
// URL を開いただけ（GET・リンクのプレビュー・先読み）では呼ばれない。
// dropId は画面側で作って送る。回線が切れてやり直したときに同じ dropId なら2件目を作らない。
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { boxCode, dropId } =
    body !== null && typeof body === "object" ? (body as { boxCode?: unknown; dropId?: unknown }) : {};
  if (!isBoxCode(boxCode) || !isDropId(dropId)) {
    return Response.json({ error: { message: "送信内容が正しくありません" } }, { status: 400 });
  }

  const inserted = await db.query(
    `INSERT INTO items (id, box_id)
     SELECT $1, id FROM boxes WHERE code = $2
     ON CONFLICT (id) DO NOTHING`,
    [dropId, boxCode],
  );
  if (inserted.rowCount === 1) {
    return Response.json({ dropId }, { status: 201 });
  }

  // 同じ dropId がすでにある（やり直し）か、BOX が無いか
  const existing = await db.query(
    `SELECT 1 FROM items i JOIN boxes b ON b.id = i.box_id WHERE i.id = $1 AND b.code = $2`,
    [dropId, boxCode],
  );
  if (existing.rowCount === 1) {
    return Response.json({ dropId }, { status: 200 });
  }
  return Response.json({ error: { message: "BOX が見つかりません" } }, { status: 404 });
}
