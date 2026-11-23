// 拾得物の本登録の入力と検証（要件定義v2 要求4）。
// 画面（/staff/items/[id]/register）と API（POST /api/staff/items/[id]/register）で同じ検証を使う。
import { categoryLabel, isCategoryCode, OTHER_CATEGORY, requiresDescription, type CategoryCode } from "./categories";
import { colorLabel, isColorCode, OTHER_COLOR, type ColorCode } from "./colors";
import { isStorageLocation, type StorageLocation } from "./storage-locations";

/** 画面の入力欄の値。すべて文字列で、未入力は空文字。 */
export type RegistrationInput = {
  category: string;
  categoryNote: string;
  color: string;
  colorNote: string;
  description: string;
  storageLocation: string;
};

export type RegistrationField = keyof RegistrationInput;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

/** 検証を通った値。DB にはこの形で保存する。 */
export type Registration = {
  category: CategoryCode;
  categoryNote: string | null;
  color: ColorCode | null;
  colorNote: string | null;
  description: string | null;
  storageLocation: StorageLocation;
};

export const REGISTRATION_MAX_LENGTH = {
  categoryNote: 100,
  colorNote: 100,
  description: 1000,
} as const;

function text(source: Record<string, unknown>, field: RegistrationField): string {
  const value = source[field];
  return typeof value === "string" ? value.trim() : "";
}

export function validateRegistration(
  raw: unknown,
): { ok: true; value: Registration } | { ok: false; errors: RegistrationErrors } {
  const source = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const input: RegistrationInput = {
    category: text(source, "category"),
    categoryNote: text(source, "categoryNote"),
    color: text(source, "color"),
    colorNote: text(source, "colorNote"),
    description: text(source, "description"),
    storageLocation: text(source, "storageLocation"),
  };
  const errors: RegistrationErrors = {};

  if (!isCategoryCode(input.category)) {
    errors.category = "カテゴリを選んでください。";
  } else if (requiresDescription(input.category) && input.categoryNote === "") {
    errors.categoryNote = "何の落とし物かを入力してください。";
  }
  if (input.color !== "" && !isColorCode(input.color)) errors.color = "色を選び直してください。";
  if (!isStorageLocation(input.storageLocation)) errors.storageLocation = "保管場所を選んでください。";
  for (const field of Object.keys(REGISTRATION_MAX_LENGTH) as (keyof typeof REGISTRATION_MAX_LENGTH)[]) {
    if (!errors[field] && input[field].length > REGISTRATION_MAX_LENGTH[field]) {
      errors[field] = `${REGISTRATION_MAX_LENGTH[field]}文字以内で入力してください。`;
    }
  }

  if (Object.keys(errors).length > 0 || !isCategoryCode(input.category) || !isStorageLocation(input.storageLocation)) {
    return { ok: false, errors };
  }
  const color = isColorCode(input.color) ? input.color : null;
  return {
    ok: true,
    value: {
      category: input.category,
      // 「その他」以外では使わない欄なので保存しない
      categoryNote: input.category === OTHER_CATEGORY ? input.categoryNote : null,
      color,
      colorNote: color === OTHER_COLOR && input.colorNote !== "" ? input.colorNote : null,
      description: input.description || null,
      storageLocation: input.storageLocation,
    },
  };
}

/** 「財布」「その他（帽子）」の形。 */
export function describeCategory(category: CategoryCode, note: string | null): string {
  return category === OTHER_CATEGORY && note ? `${categoryLabel(category)}（${note}）` : categoryLabel(category);
}

/** 「黒」「その他（青と白）」の形。色がなければ null。 */
export function describeItemColor(color: ColorCode | null, note: string | null): string | null {
  if (color === null) return null;
  return note ? `${colorLabel(color)}（${note}）` : colorLabel(color);
}
