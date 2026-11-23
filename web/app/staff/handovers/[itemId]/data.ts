// 受渡記録の画面（伏せ字 / 氏名・連絡先 / 取り消し）で共通に使う読み込み。
// 伏せる前の値を返すので、サーバーコンポーネントからだけ使い、クライアントコンポーネントに渡さない。
import { isCategoryCode } from "@/lib/categories";
import { db } from "@/lib/db";
import { describeCategory } from "@/lib/item-registration";

export type HandoverRecord = {
  itemStatus: string;
  managementNumber: string | null;
  itemName: string | null;
  recipientName: string;
  phone: string;
  email: string | null;
  identityNote: string | null;
  handedOverAt: Date;
};

/** 物品と、その最新の受渡記録（取り消し済みは除く）。受渡記録がなければ null。 */
export async function getLatestHandover(itemId: string): Promise<HandoverRecord | null> {
  const { rows } = await db.query<{
    status: string;
    management_number: string | null;
    category: string | null;
    category_note: string | null;
    recipient_name: string;
    phone: string;
    email: string | null;
    identity_note: string | null;
    handed_over_at: Date;
  }>(
    `SELECT i.status, i.management_number, i.category, i.category_note,
            h.recipient_name, h.phone, h.email, h.identity_note, h.handed_over_at
       FROM items i
       JOIN handovers h ON h.item_id = i.id
      WHERE i.id = $1 AND h.cancelled_at IS NULL
      ORDER BY h.handed_over_at DESC, h.id DESC
      LIMIT 1`,
    [itemId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    itemStatus: row.status,
    managementNumber: row.management_number,
    itemName: row.category && isCategoryCode(row.category) ? describeCategory(row.category, row.category_note) : null,
    recipientName: row.recipient_name,
    phone: row.phone,
    email: row.email,
    identityNote: row.identity_note,
    handedOverAt: row.handed_over_at,
  };
}

/** 見出しの下に出す「L-0042 / 財布」。 */
export function summarize(record: HandoverRecord): string | undefined {
  return [record.managementNumber, record.itemName].filter(Boolean).join(" / ") || undefined;
}

export { formatDateTime } from "@/lib/format";
