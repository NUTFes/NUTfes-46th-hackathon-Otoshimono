"use client";

import { usePathname, useRouter } from "next/navigation";
import { Field, Select } from "@/components/ui";
import { LOST_REPORT_STATUSES } from "@/lib/lost-reports";

/** 「確認状況」で絞り込む。選んだ値を URL の ?status= に入れる（空ならすべて）。 */
export function StatusFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Field label="確認状況" htmlFor="report-status">
      <Select
        id="report-status"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          router.replace(next ? `${pathname}?status=${encodeURIComponent(next)}` : pathname);
        }}
      >
        <option value="">すべて</option>
        {LOST_REPORT_STATUSES.map((status) => (
          <option key={status.code} value={status.code}>
            {status.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
