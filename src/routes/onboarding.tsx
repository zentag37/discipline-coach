import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Trader Coach Pro" },
      { name: "description", content: "Set up your AI trading coach in 5 quick steps." },
    ],
  }),
  component: OnboardingPage,
});

type Profile = {
  fullName: string;
  country: string;
  timezone: string;
  experience: string;
  broker: string;
  platform: string;
  session: string;
  assets: string[];
  instruments: string;
  style: string;
  accountSize: string;
  riskPerTrade: string;
  dailyLossLimit: string;
  maxTrades: string;
  propFirm: string;
  propFirmName: string;
  voiceEnabled: boolean;
  voiceStyle: string;
  language: string;
};

const initial: Profile = {
  fullName: "",
  country: "",
  timezone: "",
  experience: "Intermediate",
  broker: "",
  platform: "MT5",
  session: "London",
  assets: [],
  instruments: "",
  style: "Day trading",
  accountSize: "$5k–$25k",
  riskPerTrade: "1%",
  dailyLossLimit: "2%",
  maxTrades: "3",
  propFirm: "No",
  propFirmName: "",
  voiceEnabled: true,
  voiceStyle: "Professional",
  language: "English",
};

const STEPS = ["Personal", "Setup", "Assets", "Risk", "Voice"];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(initial);
  const [done, setDone] = useState(false);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  const next = () => (step < 4 ? setStep(step + 1) : finish());
  const back = () => step > 0 && setStep(step - 1);
  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem("tcp_profile", JSON.stringify(p));
    setDone(true);
  };

  if (done) {
    const first = p.fullName.trim().split(" ")[0] || "trader";
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center border border-border rounded-lg p-10 bg-[var(--surface)]">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center mb-6">
            <Check className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h1 className="font-mono text-2xl mb-2">You're all set, {first}.</h1>
          <p className="text-[var(--muted-foreground)] mb-8">Your AI trading coach is ready.</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full font-mono uppercase tracking-wider text-sm bg-[var(--accent)] text-[var(--primary-foreground)] py-3 rounded hover:opacity-90 transition"
          >
            Launch Trader Coach
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress */}
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-3 font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
            <span>Step {step + 1} of 5</span>
            <span className="text-[var(--accent)]">{STEPS[step]}</span>
          </div>
          <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${((step + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start md:items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full border border-border rounded-lg bg-[var(--surface)] p-6 md:p-10">
          {step === 0 && <Step1 p={p} set={set} />}
          {step === 1 && <Step2 p={p} set={set} />}
          {step === 2 && <Step3 p={p} set={set} />}
          {step === 3 && <Step4 p={p} set={set} />}
          {step === 4 && <Step5 p={p} set={set} />}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            <button
              onClick={back}
              disabled={step === 0}
              className="font-mono text-sm uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={next}
              className="font-mono text-sm uppercase tracking-wider bg-[var(--accent)] text-[var(--primary-foreground)] px-6 py-2.5 rounded hover:opacity-90 transition flex items-center gap-1"
            >
              {step === 4 ? "Finish" : "Continue"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared field UI ---------- */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[var(--background)] border border-border rounded px-3 py-2.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[var(--background)] border border-border rounded px-3 py-2.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Chips({
  value,
  onChange,
  options,
  multi = false,
}: {
  value: string | string[];
  onChange: (v: any) => void;
  options: string[];
  multi?: boolean;
}) {
  const isActive = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  const toggle = (o: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    } else onChange(o);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`font-mono text-xs uppercase tracking-wider px-3 py-2 rounded border transition ${
            isActive(o)
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              : "border-border text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ---------- Steps ---------- */

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-mono text-2xl mb-2">{title}</h2>
      <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
    </div>
  );
}

function Step1({ p, set }: { p: Profile; set: any }) {
  return (
    <>
      <StepHeader title="Personal info" subtitle="We use your name to greet you in the floating window." />
      <div className="space-y-5">
        <div>
          <Label>Full name</Label>
          <Input value={p.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="James Carter" />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <Label>Country</Label>
            <Input value={p.country} onChange={(e) => set("country", e.target.value)} placeholder="United Kingdom" />
          </div>
          <div>
            <Label>Timezone</Label>
            <Input value={p.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="GMT / UTC+0" />
          </div>
        </div>
        <div>
          <Label>Trading experience</Label>
          <Chips
            value={p.experience}
            onChange={(v) => set("experience", v)}
            options={["Beginner", "Intermediate", "Advanced", "Professional"]}
          />
        </div>
      </div>
    </>
  );
}

function Step2({ p, set }: { p: Profile; set: any }) {
  return (
    <>
      <StepHeader title="Trading setup" subtitle="Your broker, platform, and primary session." />
      <div className="space-y-5">
        <div>
          <Label>Broker</Label>
          <Select
            value={p.broker || "IC Markets"}
            onChange={(v) => set("broker", v)}
            options={[
              "IC Markets",
              "FTMO",
              "Pepperstone",
              "Interactive Brokers",
              "Binance",
              "Coinbase",
              "TD Ameritrade",
              "Other",
            ]}
          />
        </div>
        <div>
          <Label>Platform</Label>
          <Chips
            value={p.platform}
            onChange={(v) => set("platform", v)}
            options={["MT4", "MT5", "TradingView", "Thinkorswim", "cTrader", "NinjaTrader", "Other"]}
          />
        </div>
        <div>
          <Label>Trading session</Label>
          <Chips
            value={p.session}
            onChange={(v) => set("session", v)}
            options={["London", "New York", "Asian", "All sessions"]}
          />
        </div>
      </div>
    </>
  );
}

function Step3({ p, set }: { p: Profile; set: any }) {
  return (
    <>
      <StepHeader title="Assets & style" subtitle="What you trade and how you trade it." />
      <div className="space-y-5">
        <div>
          <Label>Markets (select all)</Label>
          <Chips
            multi
            value={p.assets}
            onChange={(v) => set("assets", v)}
            options={["Forex", "Indices", "Stocks", "Crypto", "Commodities", "Futures"]}
          />
        </div>
        <div>
          <Label>Specific instruments</Label>
          <Input
            value={p.instruments}
            onChange={(e) => set("instruments", e.target.value)}
            placeholder="EURUSD, NAS100, Gold"
          />
        </div>
        <div>
          <Label>Trading style</Label>
          <Chips
            value={p.style}
            onChange={(v) => set("style", v)}
            options={["Scalping", "Day trading", "Swing trading", "Position trading"]}
          />
        </div>
      </div>
    </>
  );
}

function Step4({ p, set }: { p: Profile; set: any }) {
  return (
    <>
      <StepHeader title="Risk profile" subtitle="We'll calculate your dollar limits from this." />
      <div className="space-y-5">
        <div>
          <Label>Account size</Label>
          <Chips
            value={p.accountSize}
            onChange={(v) => set("accountSize", v)}
            options={["Under $1k", "$1k–$5k", "$5k–$25k", "$25k–$100k", "$100k+"]}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <Label>Max risk / trade</Label>
            <Chips
              value={p.riskPerTrade}
              onChange={(v) => set("riskPerTrade", v)}
              options={["0.5%", "1%", "1.5%", "2%"]}
            />
          </div>
          <div>
            <Label>Daily loss limit</Label>
            <Chips
              value={p.dailyLossLimit}
              onChange={(v) => set("dailyLossLimit", v)}
              options={["1%", "2%", "3%"]}
            />
          </div>
        </div>
        <div>
          <Label>Max trades / day</Label>
          <Chips value={p.maxTrades} onChange={(v) => set("maxTrades", v)} options={["1", "2", "3", "5"]} />
        </div>
        <div>
          <Label>Prop firm account?</Label>
          <Chips value={p.propFirm} onChange={(v) => set("propFirm", v)} options={["No", "Yes"]} />
        </div>
        {p.propFirm === "Yes" && (
          <div>
            <Label>Which firm?</Label>
            <Input
              value={p.propFirmName}
              onChange={(e) => set("propFirmName", e.target.value)}
              placeholder="FTMO, MyForexFunds, The5%ers…"
            />
          </div>
        )}
      </div>
    </>
  );
}

function Step5({ p, set }: { p: Profile; set: any }) {
  return (
    <>
      <StepHeader
        title="Voice assistant"
        subtitle="Trader Coach can speak to you when the floating window is closed — reminding you about risk, warning you about overtrading, and keeping you disciplined hands-free."
      />
      <div className="space-y-5">
        <div>
          <Label>Enable voice assistant</Label>
          <Chips
            value={p.voiceEnabled ? "Yes" : "No"}
            onChange={(v) => set("voiceEnabled", v === "Yes")}
            options={["Yes", "No"]}
          />
        </div>
        {p.voiceEnabled && (
          <>
            <div>
              <Label>Voice style</Label>
              <Chips
                value={p.voiceStyle}
                onChange={(v) => set("voiceStyle", v)}
                options={["Professional", "Calm & Encouraging", "Strict & Direct"]}
              />
            </div>
            <div>
              <Label>Language</Label>
              <Select
                value={p.language}
                onChange={(v) => set("language", v)}
                options={["English", "Spanish", "French", "German", "Portuguese", "Italian", "Japanese"]}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
