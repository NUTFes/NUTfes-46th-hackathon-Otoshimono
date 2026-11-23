import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/staff-auth";

// /staff を開いたら、ログインを確かめてから巡回の画面へ移す。
export default function StaffIndexPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToBoxes />
    </Suspense>
  );
}

async function RedirectToBoxes(): Promise<null> {
  await requireStaff();
  redirect("/staff/boxes");
}
