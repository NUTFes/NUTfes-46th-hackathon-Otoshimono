import type { Metadata } from "next";
import { Page } from "@/components/ui";
import { LostReportReview } from "./review";

export const metadata: Metadata = {
  title: "登録内容の確認 | 技大祭 落とし物管理",
};

// V-REVIEW: 紛失届の内容確認と送信
export default function LostReviewPage() {
  return (
    <Page>
      <LostReportReview />
    </Page>
  );
}
