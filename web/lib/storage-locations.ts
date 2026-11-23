// 拾得物の保管場所の選択肢（要件定義v2 要求4）。
// 仮の一覧。チームで確定したら直す。DB（items.storage_location）には文字のまま保存する。
export const STORAGE_LOCATIONS = ["本部", "案内所A", "案内所B"] as const;

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export function isStorageLocation(value: unknown): value is StorageLocation {
  return STORAGE_LOCATIONS.some((location) => location === value);
}
