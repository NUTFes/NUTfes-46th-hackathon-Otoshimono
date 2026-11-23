import type { Metadata } from "next";
import { Page, PageHeading } from "@/components/ui";
import { LostReportForm } from "./lost-form";

export const metadata: Metadata = {
  title: "紛失届の登録 | 技大祭 落とし物管理",
};

// V-LOST: 紛失届の登録
export default function LostPage() {
  return (
    <Page>
      <PageHeading title="紛失届の登録" description="なくした物の特徴を教えてください。" />
      <LostReportForm />
    </Page>
  );
}
