// 拾得物の状態（items.status）と画面での表示（docs/spec/routes.md の表、要件定義v2 要求11）。
export const ITEM_STATUSES = [
  { code: "provisional", label: "仮登録済" },
  { code: "collected", label: "回収済" },
  { code: "registered", label: "本登録済" },
  { code: "handed_over", label: "受渡済" },
  { code: "unknown", label: "不明" },
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number]["code"];

export function isItemStatus(value: unknown): value is ItemStatus {
  return ITEM_STATUSES.some((status) => status.code === value);
}

export function itemStatusLabel(status: string): string {
  return ITEM_STATUSES.find((s) => s.code === status)?.label ?? status;
}
