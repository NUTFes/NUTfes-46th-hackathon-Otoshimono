/** 「38分前」「2時間5分前」の形。巡回の目安なので分単位で十分。 */
export function minutesAgo(minutes: number): string {
  if (minutes < 60) return `${Math.max(0, minutes)}分前`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours}時間前` : `${hours}時間${minutes % 60}分前`;
}
