// 紛失届の入力の形と検証（要件定義v2 要求7）
// 画面（/lost）と API（POST /api/lost-reports）の両方で同じ検証を使う。

import { isCategoryCode, requiresDescription, type CategoryCode } from "./categories";
import { colorLabel, isColorCode, OTHER_COLOR, type ColorCode } from "./colors";

/** 画面の入力欄の値。すべて文字列で、未入力は空文字。 */
export type LostReportInput = {
  category: string;
  itemDescription: string;
  color: string;
  colorNote: string;
  features: string;
  lostPlace: string;
  lostTime: string;
  email: string;
};

export type LostReportField = keyof LostReportInput;
export type LostReportErrors = Partial<Record<LostReportField, string>>;

/** 検証を通った値。DB にはこの形で保存する。 */
export type LostReport = {
  category: CategoryCode;
  itemDescription: string | null;
  color: ColorCode | null;
  colorNote: string | null;
  features: string;
  lostPlace: string | null;
  lostTime: string | null;
  email: string;
};

export const EMPTY_LOST_REPORT_INPUT: LostReportInput = {
  category: "",
  itemDescription: "",
  color: "",
  colorNote: "",
  features: "",
  lostPlace: "",
  lostTime: "",
  email: "",
};

export const MAX_LENGTH: Record<LostReportField, number> = {
  category: 32,
  itemDescription: 100,
  color: 32,
  colorNote: 100,
  features: 1000,
  lostPlace: 100,
  lostTime: 100,
  email: 254,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 状況ページ（/lost/[token]）の token の形か。API が作る 32 バイトの乱数（base64url で 43 文字）。 */
export function isLostReportToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** 送り直しで二重に登録しないために、画面が届け出ごとに作る ID（UUID）か。 */
export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** 2つの入力が同じ内容か（前後の空白は無視する）。 */
export function sameLostReportInput(a: LostReportInput, b: LostReportInput): boolean {
  const x = toLostReportInput(a);
  const y = toLostReportInput(b);
  return (Object.keys(x) as LostReportField[]).every((field) => x[field] === y[field]);
}

/** どんな値が来ても、入力欄の形（前後の空白を除いた文字列）にそろえる。 */
export function toLostReportInput(raw: unknown): LostReportInput {
  const source =
    raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const input = { ...EMPTY_LOST_REPORT_INPUT };
  for (const field of Object.keys(input) as LostReportField[]) {
    const value = source[field];
    input[field] = typeof value === "string" ? value.trim() : "";
  }
  return input;
}

export function validateLostReport(
  raw: unknown,
): { ok: true; value: LostReport } | { ok: false; errors: LostReportErrors } {
  const input = toLostReportInput(raw);
  const errors: LostReportErrors = {};

  if (!isCategoryCode(input.category)) {
    errors.category = "カテゴリを選んでください。";
  } else if (requiresDescription(input.category) && input.itemDescription === "") {
    errors.itemDescription = "なくした物を入力してください。";
  }

  if (input.color !== "" && !isColorCode(input.color)) {
    errors.color = "色を選び直してください。";
  }

  if (input.features === "") {
    errors.features = "特徴・備考を入力してください。";
  }

  if (input.email === "") {
    errors.email = "連絡先メールを入力してください。";
  } else if (!EMAIL_PATTERN.test(input.email)) {
    errors.email = "メールアドレスの形式で入力してください。";
  }

  for (const field of Object.keys(MAX_LENGTH) as LostReportField[]) {
    if (!errors[field] && input[field].length > MAX_LENGTH[field]) {
      errors[field] = `${MAX_LENGTH[field]}文字以内で入力してください。`;
    }
  }

  if (Object.keys(errors).length > 0 || !isCategoryCode(input.category)) {
    return { ok: false, errors };
  }

  const color = isColorCode(input.color) ? input.color : null;
  return {
    ok: true,
    value: {
      category: input.category,
      // 「その他」以外では使わない欄なので保存しない
      itemDescription: requiresDescription(input.category) ? input.itemDescription : null,
      color,
      colorNote: color === OTHER_COLOR && input.colorNote !== "" ? input.colorNote : null,
      features: input.features,
      lostPlace: input.lostPlace || null,
      lostTime: input.lostTime || null,
      email: input.email,
    },
  };
}

/** 確認画面に出す「色」の文字。「その他」で自由記述があれば添える。 */
export function describeColor(report: LostReport): string | null {
  if (report.color === null) return null;
  const label = colorLabel(report.color);
  return report.colorNote ? `${label}（${report.colorNote}）` : label;
}
