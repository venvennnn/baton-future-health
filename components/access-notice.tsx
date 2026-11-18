"use client";

import { logout } from "@/app/login/actions";
import { useDemo } from "@/components/providers";
import { useSearchParams } from "next/navigation";

const COPY = {
  en: {
    admin: "Admin access required.",
    user: "The case workspace requires User access. Log out and choose the User demo to open it.",
    logout: "Logout",
  },
  ar: {
    admin: "يلزم دخول المسؤول.",
    user: "مساحة الحالات تحتاج دخول المستخدم. سجّل الخروج واختر عرض المستخدم لفتحها.",
    logout: "خروج",
  },
} as const;

export function AccessNotice() {
  const params = useSearchParams();
  const { locale } = useDemo();
  const notice = params.get("notice");
  if (notice !== "admin-required" && notice !== "user-required") return null;
  const text = COPY[locale];
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p>{notice === "admin-required" ? text.admin : text.user}</p>
        {notice === "user-required" ? (
          <form action={logout}>
            <input type="hidden" name="next" value="/login?role=user&next=/cases" />
            <button type="submit" className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 ring-1 ring-amber-200 hover:bg-amber-100">{text.logout}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
