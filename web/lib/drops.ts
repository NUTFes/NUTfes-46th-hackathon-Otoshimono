// 拾得者がBOXのQRから届ける「仮登録」（要件定義v2 要求1・3）。
// dropId は items.id（推測できない UUID）。

const BOX_CODE_PATTERN = /^[A-Za-z0-9]{8}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBoxCode(value: unknown): value is string {
  return typeof value === "string" && BOX_CODE_PATTERN.test(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export const isDropId = isUuid;
