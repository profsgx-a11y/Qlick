"use client";

import { useState, useTransition } from "react";
import { Mail, Lock, Check, Loader2 } from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { changeAdminPassword, changeAdminEmail } from "./actions";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30";

export function AdminAccountForm({ currentEmail }: { currentEmail: string }) {
  const t = useDict().admin.account;
  const errs = useDict().admin.errors;

  // Email
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailPending, startEmail] = useTransition();

  // Password
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passPending, startPass] = useTransition();

  const saveEmail = () => {
    setEmailMsg(null);
    startEmail(async () => {
      const res = await changeAdminEmail(email);
      if (!res.ok) setEmailMsg({ ok: false, text: adminErr(errs, res.error, errs.generic) });
      else {
        setEmailMsg({ ok: true, text: t.emailChanged });
        setEmail("");
      }
    });
  };

  const savePass = () => {
    setPassMsg(null);
    if (pass !== pass2) {
      setPassMsg({ ok: false, text: t.passwordMismatch });
      return;
    }
    if (pass.length < 8) {
      setPassMsg({ ok: false, text: errs.password_short });
      return;
    }
    startPass(async () => {
      const res = await changeAdminPassword(pass);
      if (!res.ok) setPassMsg({ ok: false, text: adminErr(errs, res.error, errs.generic) });
      else {
        setPassMsg({ ok: true, text: t.passwordChanged });
        setPass("");
        setPass2("");
      }
    });
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Email */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mail className="size-4 text-gold" />
          {t.emailSection}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              {t.currentEmail}
            </label>
            <input value={currentEmail} disabled className={`${inputCls} opacity-60`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              {t.newEmail}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@qlick.gr"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-muted-2">{t.emailHint}</p>
          </div>
          {emailMsg && <Msg ok={emailMsg.ok} text={emailMsg.text} />}
          <button
            type="button"
            onClick={saveEmail}
            disabled={emailPending || !email.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-gold-soft hover:text-gold disabled:opacity-50"
          >
            {emailPending && <Loader2 className="size-4 animate-spin" />}
            {emailPending ? t.changingEmail : t.changeEmail}
          </button>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="size-4 text-gold" />
          {t.passwordSection}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              {t.newPassword}
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-muted-2">{t.passwordHint}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              {t.confirmPassword}
            </label>
            <input
              type="password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              className={inputCls}
            />
          </div>
          {passMsg && <Msg ok={passMsg.ok} text={passMsg.text} />}
          <button
            type="button"
            onClick={savePass}
            disabled={passPending || !pass || !pass2}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-black transition-colors hover:bg-gold-bright disabled:opacity-50"
          >
            {passPending && <Loader2 className="size-4 animate-spin" />}
            {passPending ? t.changingPassword : t.changePassword}
          </button>
        </div>
      </section>
    </div>
  );
}

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      className={`flex items-center gap-1.5 text-sm ${ok ? "text-success" : "text-danger"}`}
    >
      {ok && <Check className="size-4" />}
      {text}
    </p>
  );
}
