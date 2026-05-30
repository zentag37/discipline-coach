import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { createCheckout, type PlanKey } from "@/lib/checkout.functions";
import { z } from "zod";
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

const planSchema = z.object({ plan: z.enum(["solo", "pro", "elite"]).optional() });

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Trader Coach Pro" }] }),
  validateSearch: (s) => planSchema.parse(s),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const checkout = useServerFn(createCheckout);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (search.plan) sessionStorage.setItem("pendingPlan", search.plan);
  }, [search.plan]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!s) return;
      const pending = sessionStorage.getItem("pendingPlan") as PlanKey | null;
      if (pending) {
        sessionStorage.removeItem("pendingPlan");
        try {
          const { url } = await checkout({ data: { plan: pending } });
          if (url) {
            window.location.href = url;
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      navigate({ to: "/onboarding" });
    });
    return () => subscription.unsubscribe();
  }, [navigate, checkout]);


  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameValid = fullName.trim().length >= 2;
  const pwValid = password.length >= 8;
  const matchValid = confirm.length > 0 && confirm === password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const next: Record<string, string> = {};
    if (!nameValid) next.fullName = "Enter your full name";
    if (!emailValid) next.email = "Enter a valid email";
    if (!pwValid) next.password = "Min 8 characters";
    if (!matchValid) next.confirm = "Passwords don't match";
    setErrs(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: fullName },
      },
    });
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
        title="Create your account"
        subtitle="7-day free trial. No credit card required."
      />
      <ErrorBanner message={err} />
      <form onSubmit={submit} noValidate>
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
          error={errs.fullName}
          valid={nameValid}
        />
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errs.email}
          valid={emailValid}
        />
        <PasswordField
          label="Password"
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
          <PrimaryButton loading={loading}>Create Account →</PrimaryButton>
        </div>
      </form>

      <OrDivider />
      <GoogleButton onClick={google} loading={oauthLoading} />

      <FootLink prompt="Already have an account?" to="/login" label="Sign in" />

      <p className="mt-5 text-center font-mono text-[11px] text-muted-foreground/80">
        By registering you agree to our Terms and Privacy Policy.
      </p>
    </AuthShell>
  );
}
