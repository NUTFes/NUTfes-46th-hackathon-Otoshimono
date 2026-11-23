// 受渡記録の入力の形と検証（要件定義v2 要求10）
// 画面（/staff/items/[id]/handover）と API（POST /api/staff/items/[id]/handover）で同じ検証を使う。

export type HandoverInput = {
  recipientName: string;
  phone: string;
  email: string;
  identityNote: string;
  confirmed: boolean;
};

export type HandoverField = keyof HandoverInput;
export type HandoverErrors = Partial<Record<HandoverField, string>>;

/** 検証を通った値。DB にはこの形で保存する。 */
export type Handover = {
  recipientName: string;
  phone: string;
  email: string | null;
  identityNote: string | null;
};

export const EMPTY_HANDOVER_INPUT: HandoverInput = {
  recipientName: "",
  phone: "",
  email: "",
  identityNote: "",
  confirmed: false,
};

export const HANDOVER_MAX_LENGTH = {
  recipientName: 100,
  phone: 20,
  email: 254,
  identityNote: 500,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 数字・ハイフン・括弧・空白・先頭の + だけ。数字は 6 桁以上
const PHONE_PATTERN = /^\+?[0-9()\- ]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** items.id（UUID）の形か。 */
export function isItemId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** handovers.id（bigint の連番）。pg は bigint を文字列で返すので、文字列で扱う。 */
export function isHandoverId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value);
}

function text(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  return typeof value === "string" ? value.trim() : "";
}

export function validateHandover(
  raw: unknown,
): { ok: true; value: Handover } | { ok: false; errors: HandoverErrors } {
  const source = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const input = {
    recipientName: text(source, "recipientName"),
    phone: text(source, "phone"),
    email: text(source, "email"),
    identityNote: text(source, "identityNote"),
  };
  const errors: HandoverErrors = {};

  if (input.recipientName === "") errors.recipientName = "氏名を入力してください。";

  if (input.phone === "") {
    errors.phone = "電話番号を入力してください。";
  } else if (!PHONE_PATTERN.test(input.phone) || input.phone.replace(/\D/g, "").length < 6) {
    errors.phone = "電話番号を数字とハイフンで入力してください。";
  }

  if (input.email !== "" && !EMAIL_PATTERN.test(input.email)) {
    errors.email = "メールアドレスの形式で入力してください。";
  }

  for (const field of Object.keys(HANDOVER_MAX_LENGTH) as (keyof typeof HANDOVER_MAX_LENGTH)[]) {
    if (!errors[field] && input[field].length > HANDOVER_MAX_LENGTH[field]) {
      errors[field] = `${HANDOVER_MAX_LENGTH[field]}文字以内で入力してください。`;
    }
  }

  if (source.confirmed !== true) {
    errors.confirmed = "本人確認と受渡が済んだら、チェックを付けてください。";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      recipientName: input.recipientName,
      phone: input.phone,
      email: input.email || null,
      identityNote: input.identityNote || null,
    },
  };
}
