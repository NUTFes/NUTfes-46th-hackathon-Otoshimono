// 紛失届の「色」の選択肢（要件定義v2 要求7）
// 仮の一覧。チームで確定したら直す。DBには code を保存し、画面には label を表示する。
// 「その他」を選んだときの自由記述は任意。

export const COLORS = [
  { code: "black", label: "黒" },
  { code: "white", label: "白" },
  { code: "gray", label: "グレー" },
  { code: "silver", label: "シルバー" },
  { code: "brown", label: "茶" },
  { code: "beige", label: "ベージュ" },
  { code: "red", label: "赤" },
  { code: "pink", label: "ピンク" },
  { code: "orange", label: "オレンジ" },
  { code: "yellow", label: "黄" },
  { code: "green", label: "緑" },
  { code: "blue", label: "青" },
  { code: "navy", label: "紺" },
  { code: "purple", label: "紫" },
  { code: "gold", label: "ゴールド" },
  { code: "other", label: "その他" },
] as const;

export type ColorCode = (typeof COLORS)[number]["code"];

export const OTHER_COLOR = "other" satisfies ColorCode;

const LABELS = new Map<string, string>(
  COLORS.map((color) => [color.code, color.label]),
);

export function isColorCode(value: unknown): value is ColorCode {
  return typeof value === "string" && LABELS.has(value);
}

export function colorLabel(code: ColorCode): string {
  return LABELS.get(code)!;
}
