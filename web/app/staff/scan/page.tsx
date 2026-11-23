import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, PageHeading, StaffHeader } from "@/components/ui";
import { requireStaff } from "@/lib/staff-auth";
import { Scanner } from "./scanner";

export const metadata: Metadata = {
  title: "BOXのQRを読み取る | 技大祭 落とし物管理",
};

// M-SCAN: 巡回で BOX の QR を読み取り、回収を記録する。
export default function ScanPage() {
  return (
    <>
      <StaffHeader backHref="/staff/boxes" />
      <Page>
        <PageHeading title="BOXのQRを読み取る" description="回収する箱に貼られたQRを読み取ってください。" />
        <Suspense fallback={null}>
          <StaffScanner />
        </Suspense>
      </Page>
    </>
  );
}

async function StaffScanner() {
  await requireStaff();
  return <Scanner />;
}
