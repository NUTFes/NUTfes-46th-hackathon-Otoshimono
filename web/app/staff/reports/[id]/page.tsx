import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, DefinitionList, Notice, Page, PageHeading, StaffHeader } from "@/components/ui";
import { categoryLabel, isCategoryCode, OTHER_CATEGORY } from "@/lib/categories";
import { colorLabel, isColorCode } from "@/lib/colors";
import { db } from "@/lib/db";
import { isLostReportStatus, lostReportStatusLabel } from "@/lib/lost-reports";
import { isReportId } from "@/lib/report-notices";
import { requireStaff } from "@/lib/staff-auth";
import { ReportActions, type MatchCandidate } from "./report-actions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "紛失届の内容 | 技大祭 落とし物管理",
};

// M-REPORT-DETAIL: 紛失届の内容を見て、保管中の物と人の目で照合し、結果をメールで知らせる（要件定義v2 要求6・9）。
export default function ReportDetailPage(props: PageProps<"/staff/reports/[id]">) {
  return (
    <>
      <StaffHeader backHref="/staff/reports" />
      <Page>
        <Suspense fallback={<PageHeading title="紛失届の内容" />}>
          <ReportDetail params={props.params} />
        </Suspense>
      </Page>
    </>
  );
}

type Report = {
  id: string;
  report_number: string;
  status: string;
  category: string;
  item_description: string | null;
  color: string | null;
  color_note: string | null;
  features: string;
  lost_place: string | null;
  lost_time: string | null;
  email: string;
  matched_item_id: string | null;
  matched_number: string | null;
};

type Candidate = {
  id: string;
  management_number: string;
  category: string;
  category_note: string | null;
  storage_location: string;
};

async function ReportDetail({ params }: Pick<PageProps<"/staff/reports/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  if (!isReportId(id)) notFound();

  const { rows } = await db.query<Report>(
    `SELECT r.id, r.report_number, r.status, r.category, r.item_description, r.color, r.color_note,
            r.features, r.lost_place, r.lost_time, r.email, r.matched_item_id,
            i.management_number AS matched_number
       FROM lost_reports r LEFT JOIN items i ON i.id = r.matched_item_id
      WHERE r.id = $1`,
    [id],
  );
  const report = rows[0];
  if (!report) notFound();

  // 選べるのは本登録済の物だけ。カテゴリの登録違いもあり得るので、同じカテゴリの物を先に並べて残りも出す
  const candidates = await db.query<Candidate>(
    `SELECT id, management_number, category, category_note, storage_location
       FROM items
      WHERE status = 'registered'
      ORDER BY (category = $1) DESC, management_number`,
    [report.category],
  );

  return (
    <>
      <PageHeading title="紛失届の内容" description={report.report_number} />
      <DefinitionList
        title="届け出られた内容"
        items={[
          { label: "カテゴリ・色", value: describeCategoryAndColor(report) },
          { label: "特徴・備考", value: <span className={styles.multiline}>{report.features}</span> },
          { label: "場所・日時", value: [report.lost_place, report.lost_time].filter(Boolean).join(" / ") || "—" },
          { label: "連絡先", value: report.email },
        ]}
      />
      {report.status !== "pending" && isLostReportStatus(report.status) && (
        <Notice title={describeStatus(report.status, report.matched_number)} />
      )}
      <p className={styles.muted}>
        保管中の現物と特徴を人が照合します。合う物が見つかったら、その管理番号を選んで連絡してください。
      </p>
      <ButtonLink href="/staff/items?state=registered" variant="secondary">
        保管中の物品を確認する
      </ButtonLink>
      <ReportActions
        reportId={report.id}
        email={report.email}
        status={report.status}
        matchedItemId={report.matched_item_id}
        candidates={candidates.rows.map(toCandidate)}
      />
    </>
  );
}

function itemName(category: string, note: string | null): string {
  if (!isCategoryCode(category)) return category;
  return category === OTHER_CATEGORY && note ? `${categoryLabel(category)}（${note}）` : categoryLabel(category);
}

function describeCategoryAndColor(report: Report): string {
  const color = report.color && isColorCode(report.color) ? colorLabel(report.color) : null;
  const colorText = color && report.color_note ? `${color}（${report.color_note}）` : color;
  return [itemName(report.category, report.item_description), colorText].filter(Boolean).join(" / ");
}

function describeStatus(status: Parameters<typeof lostReportStatusLabel>[0], matchedNumber: string | null): string {
  const label = lostReportStatusLabel(status);
  return status === "found_notified" && matchedNumber ? `${label}（${matchedNumber}）` : label;
}

function toCandidate(row: Candidate): MatchCandidate {
  return {
    id: row.id,
    managementNumber: row.management_number,
    label: `${row.management_number}　${itemName(row.category, row.category_note)} / ${row.storage_location}`,
    storageLocation: row.storage_location,
  };
}
