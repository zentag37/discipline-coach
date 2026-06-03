import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  AuthShell,
  AuthHeading,
  Field,
  PasswordField,
  PrimaryButton,
  OrDivider,
  GoogleButton,
  FootLink,
  ErrorBanner,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TradeWithAce" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const routeAfterAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();
    navigate({ to: data?.onboarded ? "/dashboard" : "/onboarding" });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) routeAfterAuth();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const next: Record<string, string> = {};
    if (!email) next.email = "Enter your email";
    if (!password) next.password = "Enter your password";
    setErrs(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
  };

  const google = async () => {
    setOauthLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) {
      setOauthLoading(false);
      setErr(r.error.message);
    }
  };

  return (
    <AuthShell>
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to your TradeWithAce account"
      />
      <ErrorBanner message={err} />
      <form onSubmit={submit} noValidate>
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errs.email}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={errs.password}
          rightLink={
            <Link
              to="/forgot-password"
              className="font-mono text-[11px] text-primary hover:underline"
            >
              Forgot password?
            </Link>
          }
        />
        <div className="mt-6">
          <PrimaryButton loading={loading}>Sign In →</PrimaryButton>
        </div>
      </form>

      <OrDivider />
      <GoogleButton onClick={google} loading={oauthLoading} />

      <FootLink
        prompt="Don't have an account?"
        to="/register"
        label="Start free trial"
      />
    </AuthShell>
  );
}
