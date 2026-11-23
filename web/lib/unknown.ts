// 拾得物を「不明」にするときの理由と補足（要件定義v2 要求12）。
// 画面（BOX の不明・物品の不明）と API（POST /api/staff/items/[id]/unknown）で同じ検証を使う。
// 理由は選んだ文字のまま items.unknown_reason に保存する。

export const UNKNOWN_REASONS = ["回収時に見当たらない", "紛失", "その他"] as const;
export const OTHER_UNKNOWN_REASON = "その他";
export const UNKNOWN_NOTE_MAX_LENGTH = 500;

/** 不明にできる状態（受渡済は渡した後なので不明にしない）。 */
export const UNKNOWN_FROM_STATUSES = ["provisional", "collected", "registered"] as const;

export type UnknownInput = { reason: string; note: string };
export type UnknownErrors = Partial<Record<keyof UnknownInput, string>>;

export function validateUnknown(
  raw: unknown,
): { ok: true; value: { reason: string; note: string | null } } | { ok: false; errors: UnknownErrors } {
  const source = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const reason = typeof source.reason === "string" ? source.reason.trim() : "";
  const note = typeof source.note === "string" ? source.note.trim() : "";
  const errors: UnknownErrors = {};

  if (!UNKNOWN_REASONS.some((r) => r === reason)) errors.reason = "理由を選んでください。";
  // 「その他」のときは何があったのかを残す
  else if (reason === OTHER_UNKNOWN_REASON && note === "") errors.note = "「その他」のときは補足を入力してください。";
  if (!errors.note && note.length > UNKNOWN_NOTE_MAX_LENGTH) {
    errors.note = `${UNKNOWN_NOTE_MAX_LENGTH}文字以内で入力してください。`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { reason, note: note || null } };
}
