"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";
import { ITEM_STATUSES } from "@/lib/item-status";

/** 「状態」で絞り込む。選んだ値を URL の ?state= に入れる（空ならすべて）。検索語（?q=）は残す。 */
export function ItemStatusFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Field label="状態" htmlFor="items-state">
      <Select
        id="items-state"
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams);
          if (event.target.value) params.set("state", event.target.value);
          else params.delete("state");
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname);
        }}
      >
        <option value="">すべて</option>
        {ITEM_STATUSES.map((status) => (
          <option key={status.code} value={status.code}>
            {status.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
