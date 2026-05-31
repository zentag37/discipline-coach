import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";

export function AuthShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div
      className="min-h-screen w-full bg-background text-foreground font-sans flex items-center justify-center px-4 py-10"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div
        className={`w-full max-w-[440px] transition-opacity duration-500 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="rounded-[14px] bg-surface p-7 sm:p-10"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="mb-7 flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-sm border border-primary/40 bg-primary/10">
              <div className="h-2 w-2 rounded-[1px] bg-primary" />
            </div>
            <span className="font-mono text-sm text-primary tracking-tight">
              Trader Coach
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7">
      <h1 className="font-mono text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function Field({
  label,
  type = "text",
  value,
  onChange,
  error,
  valid,
  autoComplete,
  placeholder,
  rightSlot,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  valid?: boolean;
  autoComplete?: string;
  placeholder?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:ring-2 focus:ring-primary/40 ${
            error ? "border border-danger" : "border border-white/10"
          } ${rightSlot ? "pr-10" : ""}`}
          style={error ? { borderColor: "#ff5c5c" } : undefined}
        />
        {valid && !rightSlot && (
          <Check className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        )}
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 font-mono text-[11px] text-danger">{error}</p>
      )}
    </div>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete = "current-password",
  rightLink,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  autoComplete?: string;
  rightLink?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {rightLink}
      </div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full rounded-md bg-surface-2 px-3 py-2.5 pr-10 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/40 border ${
            error ? "border-danger" : "border-white/10"
          }`}
          style={error ? { borderColor: "#ff5c5c" } : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 font-mono text-[11px] text-danger">{error}</p>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  loading,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        or
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GoogleButton({
  onClick,
  loading,
  label = "Continue with Google",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2.5 rounded-md border border-white/10 bg-surface-2 px-4 py-2.5 text-sm font-mono text-foreground hover:bg-surface transition disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#fff"
          d="M21.6 12.227c0-.687-.062-1.347-.177-1.98H12v3.745h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.886-1.738 2.986-4.298 2.986-7.293z"
        />
        <path
          fill="#fff"
          d="M12 22c2.7 0 4.964-.895 6.618-2.42l-3.227-2.51c-.895.6-2.04.955-3.391.955-2.605 0-4.81-1.76-5.6-4.122H3.07v2.59A9.998 9.998 0 0 0 12 22z"
        />
        <path
          fill="#fff"
          d="M6.4 13.903a6.012 6.012 0 0 1 0-3.806V7.507H3.07a10.003 10.003 0 0 0 0 8.986l3.33-2.59z"
        />
        <path
          fill="#fff"
          d="M12 5.974c1.47 0 2.788.505 3.825 1.498l2.868-2.868C16.96 2.987 14.696 2 12 2A9.998 9.998 0 0 0 3.07 7.507l3.33 2.59C7.19 7.736 9.395 5.974 12 5.974z"
        />
      </svg>
      {loading ? "Please wait…" : label}
    </button>
  );
}

export function FootLink({ prompt, to, label }: { prompt: string; to: string; label: string }) {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link to={to} className="text-primary hover:underline font-mono">
        {label}
      </Link>
    </p>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="mb-4 rounded-md px-3 py-2 text-sm"
      style={{
        background: "rgba(255,92,92,0.08)",
        border: "1px solid rgba(255,92,92,0.3)",
        color: "#ff8a8a",
      }}
    >
      {message}
    </div>
  );
}
