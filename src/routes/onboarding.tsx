import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Trader Coach Pro" }] }),
  component: OnboardingPage,
});

type Profile = {
  full_name: string;
  country: string;
  timezone: string;
  experience: string;
  broker: string;
  platform: string;
  session: string[]; // multi-select; stored joined
  assets: string[];
  instruments: string[]; // chips; stored joined
  style: string;
  account_size: string;
  risk_per_trade: string;
  daily_loss_limit: string;
  max_trades: string;
  prop_firm: boolean;
  prop_firm_name: string;
  voice_enabled: boolean;
  voice_style: string;
  language: string;
};

const empty: Profile = {
  full_name: "",
  country: "",
  timezone: "",
  experience: "",
  broker: "",
  platform: "",
  session: [],
  assets: [],
  instruments: [],
  style: "",
  account_size: "",
  risk_per_trade: "1%",
  daily_loss_limit: "3%",
  max_trades: "3",
  prop_firm: false,
  prop_firm_name: "",
  voice_enabled: false,
  voice_style: "",
  language: "English",
};

const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France","Spain",
  "Italy","Netherlands","Switzerland","Sweden","Norway","Denmark","Ireland","Portugal",
  "Poland","Czech Republic","Austria","Belgium","Finland","Greece","Turkey","UAE",
  "Saudi Arabia","Israel","South Africa","Nigeria","Kenya","Egypt","India","Pakistan",
  "Singapore","Hong Kong","Japan","South Korea","China","Indonesia","Malaysia",
  "Philippines","Thailand","Vietnam","New Zealand","Mexico","Brazil","Argentina",
  "Chile","Colombia","Peru","Other",
];

const TIMEZONES = [
  "UTC","Europe/London","Europe/Paris","Europe/Berlin","Europe/Madrid","Europe/Athens",
  "Europe/Moscow","America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "America/Toronto","America/Mexico_City","America/Sao_Paulo","America/Buenos_Aires",
  "Africa/Johannesburg","Africa/Cairo","Asia/Dubai","Asia/Karachi","Asia/Kolkata",
  "Asia/Singapore","Asia/Hong_Kong","Asia/Tokyo","Asia/Seoul","Asia/Shanghai",
  "Australia/Sydney","Pacific/Auckland",
];

const BROKERS = [
  "IC Markets","FTMO","Pepperstone","Interactive Brokers","Binance","Coinbase",
  "TD Ameritrade","Plus500","eToro","Other",
];

const PROP_FIRMS = ["FTMO","MyForexFunds","The5%ers","E8 Funding","True Forex Funds","Other"];

const LANGUAGES = [
  "English","Spanish","Portuguese","French","German","Italian","Dutch","Polish",
  "Turkish","Arabic","Hebrew","Russian","Hindi","Mandarin","Japanese","Korean",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [p, setP] = useState<Profile>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  // Hydrate from profile + auto-detect timezone
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data?.onboarded) {
        navigate({ to: "/dashboard" });
        return;
      }
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      if (data) {
        setP({
          full_name: data.full_name ?? "",
          country: data.country ?? "",
          timezone: data.timezone ?? tz,
          experience: data.experience ?? "",
          broker: data.broker ?? "",
          platform: data.platform ?? "",
          session: data.session ? data.session.split(",").filter(Boolean) : [],
          assets: data.assets ?? [],
          instruments: data.instruments
            ? data.instruments.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
          style: data.style ?? "",
          account_size: data.account_size ?? "",
          risk_per_trade: data.risk_per_trade ?? "1%",
          daily_loss_limit: data.daily_loss_limit ?? "3%",
          max_trades: data.max_trades ?? "3",
          prop_firm: !!data.prop_firm && data.prop_firm !== "false",
          prop_firm_name: data.prop_firm_name ?? "",
          voice_enabled: data.voice_enabled ?? false,
          voice_style: data.voice_style ?? "",
          language: data.language ?? "English",
        });
      } else {
        setP((s) => ({ ...s, timezone: tz }));
      }
    })();
  }, [navigate]);

  useEffect(() => setAnimKey((k) => k + 1), [step, done]);

  const go = (delta: number) => setStep((s) => Math.max(0, Math.min(4, s + delta)));

  const finish = async () => {
    setSaving(true);
    setErr(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErr("Not signed in");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: p.full_name,
      country: p.country,
      timezone: p.timezone,
      experience: p.experience,
      broker: p.broker,
      platform: p.platform,
      session: p.session.join(","),
      assets: p.assets,
      instruments: p.instruments.join(", "),
      style: p.style,
      account_size: p.account_size,
      risk_per_trade: p.risk_per_trade,
      daily_loss_limit: p.daily_loss_limit,
      max_trades: p.max_trades,
      prop_firm: p.prop_firm ? "true" : "false",
      prop_firm_name: p.prop_firm ? p.prop_firm_name : "",
      voice_enabled: p.voice_enabled,
      voice_style: p.voice_enabled ? p.voice_style : "",
      language: p.language,
      onboarded: true,
    });
    setSaving(false);
    if (error) setErr(error.message);
    else setDone(true);
  };

  const canNext = useMemo(() => {
    if (step === 0) return p.full_name.trim().length >= 2 && p.country && p.timezone && p.experience;
    if (step === 1) return p.broker && p.platform && p.session.length > 0;
    if (step === 2) return p.assets.length > 0 && p.style;
    if (step === 3) return p.account_size && p.risk_per_trade && p.daily_loss_limit && p.max_trades && (!p.prop_firm || p.prop_firm_name);
    if (step === 4) return p.voice_enabled ? !!p.voice_style : true;
    return true;
  }, [step, p]);

  return (
    <div
      className="min-h-screen w-full bg-background text-foreground font-sans flex items-center justify-center px-4 py-10"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="w-full max-w-[520px]">
        <div
          className="rounded-[14px] bg-surface p-7 sm:p-10"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {!done && (
            <>
              <ProgressBar step={step} total={5} />
              <div key={animKey} className="animate-fade-in">
                {step === 0 && <Step1 p={p} set={set} />}
                {step === 1 && <Step2 p={p} set={set} />}
                {step === 2 && <Step3 p={p} set={set} />}
                {step === 3 && <Step4 p={p} set={set} />}
                {step === 4 && <Step5 p={p} set={set} />}
              </div>

              {err && <p className="mt-4 font-mono text-[11px] text-danger">{err}</p>}

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  onClick={() => go(-1)}
                  disabled={step === 0 || saving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-4 py-2.5 text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-surface-2 transition disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {step < 4 ? (
                  <button
                    onClick={() => go(1)}
                    disabled={!canNext}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-40"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    disabled={!canNext || saving}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Launch My Coach"}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}

          {done && <Completion p={p} onGo={() => navigate({ to: "/dashboard" })} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- shared ---------- */

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="mb-7">
      <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Step {step + 1} of {total}
      </div>
    </div>
  );
}

function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-mono text-2xl font-medium tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border border-white/10 focus:ring-2 focus:ring-primary/40 transition"
    />
  );
}

function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; placeholder?: string }
) {
  const { options, placeholder, ...rest } = props;
  return (
    <select
      {...rest}
      className="w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none border border-white/10 focus:ring-2 focus:ring-primary/40 transition"
    >
      <option value="">{placeholder ?? "Select…"}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
  accent = "teal",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  accent?: "teal";
}) {
  void accent;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-md p-3.5 transition border ${
        selected
          ? "border-primary bg-primary/10"
          : "border-white/10 bg-surface-2 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-mono transition border ${
        selected
          ? "border-primary bg-primary/15 text-primary"
          : "border-white/10 bg-surface-2 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Step 1 ---------- */

function Step1({ p, set }: { p: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void }) {
  const exp = [
    { v: "Beginner", icon: "🌱" },
    { v: "Intermediate", icon: "📈" },
    { v: "Advanced", icon: "💼" },
    { v: "Professional", icon: "🏦" },
  ];
  return (
    <div>
      <StepHeader title="Let's set up your coach" sub="ACE will use this to personalise every session for you" />

      <div className="mb-4">
        <FieldLabel>Full name</FieldLabel>
        <TextInput
          placeholder="How should ACE call you?"
          value={p.full_name}
          onChange={(e) => set("full_name", e.target.value)}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Country</FieldLabel>
          <SelectInput
            options={COUNTRIES}
            value={p.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="Select country"
          />
        </div>
        <div>
          <FieldLabel>Timezone</FieldLabel>
          <SelectInput
            options={TIMEZONES}
            value={p.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            placeholder="Select timezone"
          />
        </div>
      </div>

      <FieldLabel>Trading experience</FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        {exp.map((e) => (
          <OptionCard key={e.v} selected={p.experience === e.v} onClick={() => set("experience", e.v)}>
            <div className="text-xl leading-none">{e.icon}</div>
            <div className="mt-2 font-mono text-sm">{e.v}</div>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

/* ---------- Step 2 ---------- */

function Step2({ p, set }: { p: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void }) {
  const platforms = ["MT4","MT5","TradingView","Thinkorswim","cTrader","NinjaTrader","Other"];
  const sessions = [
    { v: "London", icon: "🌍" },
    { v: "New York", icon: "🗽" },
    { v: "Asian", icon: "🌏" },
    { v: "All Sessions", icon: "🌐" },
  ];
  const toggleSession = (s: string) => {
    if (p.session.includes(s)) set("session", p.session.filter((x) => x !== s));
    else set("session", [...p.session, s]);
  };

  return (
    <div>
      <StepHeader title="Where do you trade?" sub="ACE will adapt to your platform and broker" />

      <div className="mb-4">
        <FieldLabel>Broker name</FieldLabel>
        <input
          list="brokers-list"
          value={p.broker}
          onChange={(e) => set("broker", e.target.value)}
          placeholder="Start typing…"
          className="w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border border-white/10 focus:ring-2 focus:ring-primary/40 transition"
        />
        <datalist id="brokers-list">
          {BROKERS.map((b) => <option key={b} value={b} />)}
        </datalist>
      </div>

      <FieldLabel>Trading platform</FieldLabel>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {platforms.map((pl) => (
          <OptionCard key={pl} selected={p.platform === pl} onClick={() => set("platform", pl)}>
            <div className="font-mono text-xs text-muted-foreground">⊞</div>
            <div className="mt-1 font-mono text-xs">{pl}</div>
          </OptionCard>
        ))}
      </div>

      <FieldLabel>Trading session</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {sessions.map((s) => (
          <Pill key={s.v} selected={p.session.includes(s.v)} onClick={() => toggleSession(s.v)}>
            <span className="mr-1">{s.icon}</span>
            {s.v}
          </Pill>
        ))}
      </div>
    </div>
  );
}

/* ---------- Step 3 ---------- */

function Step3({ p, set }: { p: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void }) {
  const assets = [
    { v: "Forex", icon: "💱" },
    { v: "Indices", icon: "📊" },
    { v: "Commodities", icon: "📦" },
    { v: "Crypto", icon: "₿" },
    { v: "Stocks", icon: "🏢" },
    { v: "Futures", icon: "📜" },
  ];
  const styles = [
    { v: "Scalping", icon: "⚡" },
    { v: "Day Trading", icon: "☀️" },
    { v: "Swing Trading", icon: "🌙" },
    { v: "Position Trading", icon: "📅" },
  ];
  const [tag, setTag] = useState("");
  const toggleAsset = (a: string) => {
    if (p.assets.includes(a)) set("assets", p.assets.filter((x) => x !== a));
    else set("assets", [...p.assets, a]);
  };
  const addTag = () => {
    const t = tag.trim().toUpperCase();
    if (t && !p.instruments.includes(t)) set("instruments", [...p.instruments, t]);
    setTag("");
  };

  return (
    <div>
      <StepHeader title="What's in your watchlist?" sub="ACE will give you live intel on your instruments every session" />

      <FieldLabel>Asset classes</FieldLabel>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {assets.map((a) => (
          <OptionCard key={a.v} selected={p.assets.includes(a.v)} onClick={() => toggleAsset(a.v)}>
            <div className="text-lg leading-none">{a.icon}</div>
            <div className="mt-1.5 font-mono text-xs">{a.v}</div>
          </OptionCard>
        ))}
      </div>

      <div className="mb-5">
        <FieldLabel>Specific instruments</FieldLabel>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
          }}
          placeholder="e.g. EURUSD, NAS100, Gold, BTC"
          className="w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border border-white/10 focus:ring-2 focus:ring-primary/40 transition"
        />
        {p.instruments.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {p.instruments.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/40 px-2.5 py-1 font-mono text-[11px] text-primary"
              >
                {t}
                <button
                  type="button"
                  onClick={() => set("instruments", p.instruments.filter((x) => x !== t))}
                  className="hover:text-foreground"
                  aria-label={`Remove ${t}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <FieldLabel>Trading style</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <Pill key={s.v} selected={p.style === s.v} onClick={() => set("style", s.v)}>
            <span className="mr-1">{s.icon}</span>
            {s.v}
          </Pill>
        ))}
      </div>
    </div>
  );
}

/* ---------- Step 4 ---------- */

const ACCOUNT_SIZES = [
  { label: "Under $1k", mid: 500 },
  { label: "$1k–$5k", mid: 3000 },
  { label: "$5k–$25k", mid: 15000 },
  { label: "$25k–$100k", mid: 62500 },
  { label: "$100k–$500k", mid: 300000 },
  { label: "$500k+", mid: 500000 },
];

function pctOrCustom(v: string) {
  if (v.endsWith("%")) return parseFloat(v) / 100;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n / 100;
}

function Step4({ p, set }: { p: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void }) {
  const riskOpts = ["0.5%", "1%", "1.5%", "2%", "Custom"];
  const lossOpts = ["1%", "2%", "3%", "5%", "Custom"];
  const tradeOpts = ["1", "2", "3", "5", "Custom"];

  const isCustom = (val: string, opts: string[]) =>
    !opts.slice(0, -1).includes(val);

  const accountMid =
    ACCOUNT_SIZES.find((a) => a.label === p.account_size)?.mid ?? 0;
  const riskPct = pctOrCustom(p.risk_per_trade);
  const lossPct = pctOrCustom(p.daily_loss_limit);
  const maxTrades = parseInt(p.max_trades) || 0;

  return (
    <div>
      <StepHeader title="Set your risk rules" sub="ACE will enforce these every session — no exceptions" />

      <FieldLabel>Account size</FieldLabel>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {ACCOUNT_SIZES.map((a) => (
          <OptionCard
            key={a.label}
            selected={p.account_size === a.label}
            onClick={() => set("account_size", a.label)}
          >
            <div className="font-mono text-xs">{a.label}</div>
          </OptionCard>
        ))}
      </div>

      <PillRow
        label="Risk per trade"
        opts={riskOpts}
        value={p.risk_per_trade}
        onSelect={(v) => set("risk_per_trade", v === "Custom" ? "" : v)}
        showCustom={isCustom(p.risk_per_trade, riskOpts) || p.risk_per_trade === ""}
        customUnit="%"
        onCustom={(v) => set("risk_per_trade", v ? `${v}%` : "")}
        customValue={p.risk_per_trade.replace("%", "")}
      />

      <PillRow
        label="Daily loss limit"
        opts={lossOpts}
        value={p.daily_loss_limit}
        onSelect={(v) => set("daily_loss_limit", v === "Custom" ? "" : v)}
        showCustom={isCustom(p.daily_loss_limit, lossOpts) || p.daily_loss_limit === ""}
        customUnit="%"
        onCustom={(v) => set("daily_loss_limit", v ? `${v}%` : "")}
        customValue={p.daily_loss_limit.replace("%", "")}
      />

      <PillRow
        label="Max trades per day"
        opts={tradeOpts}
        value={p.max_trades}
        onSelect={(v) => set("max_trades", v === "Custom" ? "" : v)}
        showCustom={isCustom(p.max_trades, tradeOpts) || p.max_trades === ""}
        onCustom={(v) => set("max_trades", v)}
        customValue={p.max_trades}
      />

      <div className="mb-5 flex items-center justify-between rounded-md bg-surface-2 border border-white/10 px-3.5 py-3">
        <div>
          <div className="font-mono text-sm">Prop firm account?</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            For FTMO, The5%ers, and similar
          </div>
        </div>
        <Switch on={p.prop_firm} onChange={(v) => set("prop_firm", v)} />
      </div>

      {p.prop_firm && (
        <div className="mb-5 animate-fade-in">
          <FieldLabel>Prop firm</FieldLabel>
          <SelectInput
            options={PROP_FIRMS}
            value={p.prop_firm_name}
            onChange={(e) => set("prop_firm_name", e.target.value)}
            placeholder="Select prop firm"
          />
        </div>
      )}

      {accountMid > 0 && riskPct > 0 && (
        <div
          className="rounded-md bg-surface-2 px-4 py-3.5 animate-fade-in"
          style={{ borderLeft: "3px solid #00d4a0", border: "1px solid rgba(255,255,255,0.08)", borderLeftWidth: 3, borderLeftColor: "#00d4a0" }}
        >
          <div className="font-mono text-[11px] uppercase tracking-wider text-primary mb-2">
            ACE will enforce these rules for you:
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            <PreviewRow
              label="Max risk per trade"
              value={`$${Math.round(accountMid * riskPct).toLocaleString()}`}
              note={`(${p.risk_per_trade} of $${accountMid.toLocaleString()})`}
            />
            <PreviewRow
              label="Daily stop loss"
              value={`$${Math.round(accountMid * lossPct).toLocaleString()}`}
              note={`(${p.daily_loss_limit} of $${accountMid.toLocaleString()})`}
            />
            <PreviewRow
              label="Max trades today"
              value={`${maxTrades}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PillRow({
  label,
  opts,
  value,
  onSelect,
  showCustom,
  customValue,
  customUnit,
  onCustom,
}: {
  label: string;
  opts: string[];
  value: string;
  onSelect: (v: string) => void;
  showCustom: boolean;
  customValue: string;
  customUnit?: string;
  onCustom: (v: string) => void;
}) {
  return (
    <div className="mb-5">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => {
          const isSelected = o === "Custom" ? showCustom : value === o;
          return (
            <Pill key={o} selected={isSelected} onClick={() => onSelect(o)}>
              {o}
            </Pill>
          );
        })}
      </div>
      {showCustom && (
        <div className="mt-2.5 flex items-center gap-2 animate-fade-in">
          <input
            type="number"
            value={customValue}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="Enter value"
            className="w-32 rounded-md bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border border-white/10 focus:ring-2 focus:ring-primary/40 transition"
          />
          {customUnit && (
            <span className="font-mono text-xs text-muted-foreground">{customUnit}</span>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-primary">→</span>
      <span className="text-muted-foreground w-36">{label}:</span>
      <span className="text-foreground">{value}</span>
      {note && <span className="text-muted-foreground">{note}</span>}
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${
        on ? "bg-primary" : "bg-surface border border-white/10"
      }`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ---------- Step 5 ---------- */

function Step5({ p, set }: { p: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void }) {
  const voices = [
    { v: "Marcus", icon: "🎯", desc: "Calm & authoritative" },
    { v: "Sophia", icon: "💫", desc: "Warm & encouraging" },
    { v: "Rex", icon: "⚡", desc: "Direct & strict" },
    { v: "Aria", icon: "🧘", desc: "Mindful & precise" },
  ];
  return (
    <div>
      <StepHeader
        title="One last thing — should ACE speak to you?"
        sub="With your permission, ACE can talk to you during your session — even when the window is minimised"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <OptionCard selected={p.voice_enabled} onClick={() => set("voice_enabled", true)}>
          <div className="text-2xl">🎙️</div>
          <div className="mt-2 font-mono text-sm">Yes — talk to me</div>
          <div className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            ACE will speak at session open, warn you about risk, celebrate clean trades, and keep you company.
          </div>
        </OptionCard>
        <OptionCard selected={!p.voice_enabled} onClick={() => set("voice_enabled", false)}>
          <div className="text-2xl">💬</div>
          <div className="mt-2 font-mono text-sm">Text only</div>
          <div className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            ACE will coach you through the floating window in text. Enable voice later in settings.
          </div>
        </OptionCard>
      </div>

      {p.voice_enabled && (
        <div className="animate-fade-in">
          <FieldLabel>Voice style</FieldLabel>
          <div className="mb-5 grid grid-cols-2 gap-2.5">
            {voices.map((v) => (
              <OptionCard key={v.v} selected={p.voice_style === v.v} onClick={() => set("voice_style", v.v)}>
                <div className="text-lg">{v.icon}</div>
                <div className="mt-1.5 font-mono text-sm">{v.v}</div>
                <div className="text-[11px] text-muted-foreground">{v.desc}</div>
              </OptionCard>
            ))}
          </div>
        </div>
      )}

      <FieldLabel>Language preference</FieldLabel>
      <SelectInput
        options={LANGUAGES}
        value={p.language}
        onChange={(e) => set("language", e.target.value)}
        placeholder="Select language"
      />

      <p className="mt-4 font-mono text-[11px] text-muted-foreground/80">
        Your voice preference can be changed anytime in Settings. Trader Coach never records your microphone.
      </p>
    </div>
  );
}

/* ---------- Completion ---------- */

function Completion({ p, onGo }: { p: Profile; onGo: () => void }) {
  const first = p.full_name.split(" ")[0] || "trader";
  const pills = [
    `${p.risk_per_trade} risk`,
    `${p.max_trades} trades max`,
    p.session[0] ? `${p.session[0]} session` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="animate-fade-in text-center py-4">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 border border-primary/40 animate-scale-in">
        <Check className="h-8 w-8 text-primary" strokeWidth={3} />
      </div>
      <h2 className="mt-5 font-mono text-2xl font-medium tracking-tight">
        You're all set, {first}.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        ACE is ready. Your session rules are locked in. Let's build a consistent trading career.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {pills.map((t) => (
          <span
            key={t}
            className="rounded-full bg-surface-2 border border-white/10 px-3 py-1 font-mono text-[11px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-7 space-y-2.5">
        <button
          onClick={onGo}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition"
        >
          Go to my dashboard
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 px-5 py-2.5 text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-surface-2 transition"
        >
          <Download className="h-4 w-4" />
          Download the desktop app
        </button>
      </div>
    </div>
  );
}
