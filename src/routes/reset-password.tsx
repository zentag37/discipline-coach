import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  AuthHeading,
  PasswordField,
  PrimaryButton,
  ErrorBanner,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — TradeWithAce" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = "Min 8 characters";
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrs(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setErr(error.message);
    else navigate({ to: "/login" });
  };

  return (
    <AuthShell>
      <AuthHeading
        title="Set a new password"
        subtitle="Choose a strong password for your account"
      />
      <ErrorBanner message={err} />
      <form onSubmit={submit} noValidate>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={errs.password}
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errs.confirm}
        />
        <div className="mt-6">
          <PrimaryButton loading={loading}>Update Password</PrimaryButton>
        </div>
      </form>
    </AuthShell>
  );
}
