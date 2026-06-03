import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — TradeWithAce" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) routeAfterAuth();
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) routeAfterAuth(); });
    return () => subscription.unsubscribe();
  }, []);

  const routeAfterAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
    navigate({ to: data?.onboarded ? "/" : "/onboarding" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fn = mode === "signup"
      ? supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) setErr(error.message);
  };

  const google = async () => {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) setErr(result.error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full border border-border rounded-lg bg-[var(--surface)] p-8">
        <h1 className="font-mono text-2xl mb-1">{mode === "signup" ? "Create account" : "Sign in"}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">TradeWithAce</p>

        <button
          onClick={google}
          className="w-full font-mono text-sm uppercase tracking-wider border border-border rounded py-2.5 mb-4 hover:border-[var(--accent)] transition"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
          <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              required value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-[var(--background)] border border-border rounded px-3 py-2.5 focus:border-[var(--accent)] focus:outline-none"
            />
          )}
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-[var(--background)] border border-border rounded px-3 py-2.5 focus:border-[var(--accent)] focus:outline-none"
          />
          <input
            required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-[var(--background)] border border-border rounded px-3 py-2.5 focus:border-[var(--accent)] focus:outline-none"
          />
          {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
          <button
            disabled={loading} type="submit"
            className="w-full font-mono text-sm uppercase tracking-wider bg-[var(--accent)] text-[var(--primary-foreground)] py-2.5 rounded hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="w-full text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mt-4"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
