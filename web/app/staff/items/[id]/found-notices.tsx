import Link from "next/link";
import { Notice } from "@/components/ui";

/** 受取案内を送った紛失届があることを知らせる（M-DETAIL・M-UNKNOWN）。無ければ何も出さない。 */
export function FoundNotices({
  reports,
  tone,
  children,
}: {
  reports: { id: string; report_number: string }[];
  tone?: "info" | "warning";
  children: React.ReactNode;
}) {
  if (reports.length === 0) return null;
  return (
    <Notice title="受取案内を送った紛失届があります" tone={tone}>
      <p>
        {reports.map((report, index) => (
          <span key={report.id}>
            {index > 0 && "、"}
            <Link href={`/staff/reports/${report.id}`}>{report.report_number}</Link>
          </span>
        ))}
        の届け出人に、この物の受け取りを案内しています。
      </p>
      <p>{children}</p>
    </Notice>
  );
}
