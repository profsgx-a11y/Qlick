"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, ShieldCheck, Store } from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { deleteUser } from "./actions";

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  account_type: string;
  phone: string | null;
  is_admin: boolean;
  owns_business: boolean;
  bookings_count: number;
  created_at: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function UsersTable({
  locale,
  rows,
}: {
  locale: string;
  rows: UserRow[];
}) {
  const t = useDict().admin.users;
  const errs = useDict().admin.errors;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const fullName = (r: UserRow) =>
    [r.first_name, r.last_name].map((s) => s?.trim()).filter(Boolean).join(" ");

  const q = norm(query.trim());
  const filtered = !q
    ? rows
    : rows.filter((r) =>
        [fullName(r), r.email, r.phone]
          .filter(Boolean)
          .some((v) => norm(String(v)).includes(q)),
      );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB");

  const onDelete = (r: UserRow) => {
    const label = fullName(r) || r.email || t.noName;
    if (!confirm(t.confirmDelete.replace("{name}", label))) return;
    startTransition(async () => {
      const res = await deleteUser(locale, r.id);
      if (!res.ok) alert(adminErr(errs, res.error, errs.generic));
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {q ? t.noResults.replace("{q}", query) : t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-4 py-3 font-medium">{t.colName}</th>
                <th className="px-4 py-3 font-medium">{t.colEmail}</th>
                <th className="px-4 py-3 font-medium">{t.colType}</th>
                <th className="px-4 py-3 font-medium">{t.colPhone}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colBookings}</th>
                <th className="px-4 py-3 font-medium">{t.colJoined}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const blocked = r.is_admin || r.owns_business;
                const blockedTitle = r.is_admin
                  ? errs.cannot_delete_admin
                  : errs.user_owns_business;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {fullName(r) || (
                        <span className="text-muted-2">{t.noName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                          {r.account_type === "business" ? t.typeBusiness : t.typeCustomer}
                        </span>
                        {r.is_admin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                            <ShieldCheck className="size-3" />
                            {t.badgeAdmin}
                          </span>
                        )}
                        {r.owns_business && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                            <Store className="size-3" />
                            {t.badgeOwner}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.phone || "—"}</td>
                    <td className="px-4 py-3 text-right text-muted">{r.bookings_count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onDelete(r)}
                          disabled={pending || blocked}
                          title={blocked ? blockedTitle : t.actionDelete}
                          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
