import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  AuthHeading,
  Field,
  PrimaryButton,
  ErrorBanner,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — TradeWithAce" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <AuthShell>
      <AuthHeading
        title="Reset your password"
        subtitle="Enter your email and we'll send you a reset link"
      />
      <ErrorBanner message={err} />

      {sent ? (
        <div
          className="rounded-md px-3 py-3 text-sm"
          style={{
            background: "rgba(0,212,160,0.08)",
            border: "1px solid rgba(0,212,160,0.3)",
            color: "#5bead0",
          }}
        >
          Check your inbox — we sent a reset link to {email}.
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <div className="mt-6">
            <PrimaryButton loading={loading}>Send Reset Link</PrimaryButton>
          </div>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to login
      </Link>
    </AuthShell>
  );
}
