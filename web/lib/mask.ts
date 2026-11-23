// 受渡記録の氏名・連絡先を一覧などで伏せる（要件定義v2 要求14）。
// 伏せ字の画面には、この関数を通した値だけを渡し、元の値をブラウザーに送らない。

/** 「山田 太郎」→「山田 ●●」。空白がなければ最初の1文字だけ残す。 */
export function maskName(name: string): string {
  const trimmed = name.trim();
  const space = trimmed.search(/[\s　]/);
  if (space === -1) {
    const chars = [...trimmed];
    return (chars[0] ?? "") + "●".repeat(Math.max(chars.length - 1, 0));
  }
  const rest = trimmed.slice(space).replace(/[^\s　]/g, "●");
  return trimmed.slice(0, space) + rest;
}

/** 「090-0000-0000」→「090-****-0000」。ハイフンがなければ最初の3桁と最後の4桁を残す。 */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  const parts = trimmed.split("-");
  if (parts.length >= 3) {
    return [parts[0], ...parts.slice(1, -1).map((p) => "*".repeat(p.length)), parts.at(-1)].join("-");
  }
  if (trimmed.length <= 7) return "*".repeat(trimmed.length);
  return trimmed.slice(0, 3) + "*".repeat(trimmed.length - 7) + trimmed.slice(-4);
}

/** 「sample@example.com」→「s*****@example.com」。 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "*".repeat(trimmed.length);
  return trimmed[0] + "*".repeat(at - 1) + trimmed.slice(at);
}
