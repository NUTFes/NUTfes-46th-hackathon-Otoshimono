const DATE_TIME = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 「11/23 13:42」の形（紛失届一覧と同じ）。 */
export function formatDateTime(date: Date): string {
  return DATE_TIME.format(date);
}
