// 拾得物の本登録と紛失届で共用するカテゴリ（要件定義v2 要求4・7）
// DBの categories テーブル（db/migrations/001_create_categories.sql）と同じ内容にする。
// DBには code を保存し、画面には label を表示する。

export const CATEGORIES = [
  { code: "wallet", label: "財布" },
  { code: "smartphone", label: "スマホ" },
  { code: "key", label: "鍵" },
  { code: "card", label: "カード類" },
  { code: "earphones", label: "イヤホン" },
  { code: "bag", label: "バッグ" },
  { code: "umbrella", label: "傘" },
  { code: "clothing", label: "衣類" },
  { code: "water_bottle", label: "水筒" },
  { code: "other", label: "その他" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];

export const OTHER_CATEGORY = "other" satisfies CategoryCode;

const LABELS = new Map<string, string>(
  CATEGORIES.map((category) => [category.code, category.label]),
);

export function isCategoryCode(value: unknown): value is CategoryCode {
  return typeof value === "string" && LABELS.has(value);
}

export function categoryLabel(code: CategoryCode): string {
  return LABELS.get(code)!;
}

/** 「その他」のときは、何を落とした/拾ったかの自由記述を必須にする。 */
export function requiresDescription(code: CategoryCode): boolean {
  return code === OTHER_CATEGORY;
}

/** 紛失届の完了画面でカテゴリ別の件数を出すか。「その他」は件数を出さない。 */
export function showsCount(code: CategoryCode): boolean {
  return code !== OTHER_CATEGORY;
}
