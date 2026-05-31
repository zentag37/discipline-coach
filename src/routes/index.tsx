import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function useDownloadClick() {
  const navigate = useNavigate();
  return async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      navigate({ to: "/dashboard" });
    } else {
      navigate({ to: "/register" });
    }
  };
}
import {
  Activity,
  AlertTriangle,
  ShieldOff,
  Download,
  PlayCircle,
  Pin,
  ListChecks,
  Bell,
  Calculator,
  Quote,
  Minimize2,
  Github,
  Apple,
  Monitor,
  Circle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Floatline — Trade with discipline. Every session." },
      {
        name: "description",
        content:
          "A floating discipline coach that sits over your trading platform. Pre-trade checklist, trade counter, risk reminders. Free, open source, Windows & Mac.",
      },
      { property: "og:title", content: "Floatline — Trade with discipline" },
      {
        property: "og:description",
        content:
          "An always-on-top window that keeps day traders, prop firm traders and forex traders disciplined.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const QUOTES = [
  {
    text: "The market does not beat them. They beat themselves.",
    author: "Jesse Livermore",
  },
  {
    text: "In trading, you have to be defensive and aggressive at the same time. Discipline is the bridge.",
    author: "Mark Douglas",
  },
  {
    text: "The goal of a successful trader is to make the best trades. Money is secondary.",
    author: "Alexander Elder",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Nav />
      <Hero />
      <Divider />
      <Problem />
      <Divider />
      <HowItWorks />
      <Divider />
      <Features />
      <Divider />
      <Quotes />
      <Divider />
      <DownloadSection />
      <Divider />
      <Footer />
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-6 ${className}`}>{children}</div>;
}

function Nav() {
  const navigate = useNavigate();
  return (
    <header className="border-b border-border">
      <Container className="flex h-14 items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-mono">
          <a href="#problem" className="hover:text-foreground transition-colors">/problem</a>
          <a href="#how" className="hover:text-foreground transition-colors">/how</a>
          <a href="#features" className="hover:text-foreground transition-colors">/features</a>
          <a href="/pricing" className="hover:text-foreground transition-colors">/pricing</a>
        </nav>
        <button
          onClick={() => navigate({ to: "/register" })}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-mono font-medium text-primary-foreground hover:opacity-90 transition cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </Container>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-6 w-6 place-items-center rounded-sm border border-primary/40 bg-primary/10">
        <div className="h-2 w-2 rounded-[1px] bg-primary" />
      </div>
      <span className="font-mono text-sm tracking-tight">Trader Coach</span>
    </div>
  );
}

function Hero() {
  const onDownload = useDownloadClick();
  return (
    <section className="relative">
      <Container className="grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-10">

        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            v1.0 · free · open source
          </div>
          <h1 className="mt-6 font-mono text-4xl md:text-6xl font-medium leading-[1.05] tracking-tight">
            Trade with discipline.
            <br />
            <span className="text-primary">Every session.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground leading-relaxed">
            A small window that floats over your trading platform. It tracks your trades,
            enforces your rules, and shuts you down before you blow the day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Free
            </button>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-mono text-foreground hover:bg-surface transition"
            >
              <PlayCircle className="h-4 w-4" />
              See how it works
            </a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            <Stat label="traders" value="12k+" />
            <Stat label="trades coached" value="2.1M" />
            <Stat label="open source" value="MIT" />
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end">
          <FloatingMockup />
        </div>
      </Container>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xl text-foreground">{value}</div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function FloatingMockup() {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-2xl bg-primary/5 blur-2xl" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-danger/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> always on top
          </div>
          <Minimize2 className="h-3 w-3 text-muted-foreground" />
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">session</div>
            <div className="font-mono text-[10px] text-primary flex items-center gap-1.5">
              <Circle className="h-2 w-2 fill-primary text-primary" /> live
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricCell label="trades" value="3 / 5" tone="ok" />
            <MetricCell label="pnl" value="+0.8R" tone="ok" />
            <MetricCell label="risk" value="1% max" tone="warn" />
          </div>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              pre-trade check
            </div>
            <ul className="space-y-1.5 font-mono text-xs">
              <Check ok label="A+ setup confirmed" />
              <Check ok label="Stop loss defined" />
              <Check ok label="Risk ≤ 1% of account" />
              <Check label="Not chasing a loss" />
            </ul>
          </div>

          <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              <div className="font-mono text-[11px] text-foreground leading-relaxed">
                2 trades left before daily stop. Take only A+ setups.
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              coach
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              "The market does not beat them. They beat themselves."
              <span className="block mt-1 text-primary">— Jesse Livermore</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({ ok = false, label }: { ok?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <div
        className={`grid h-3.5 w-3.5 place-items-center rounded-[3px] border ${
          ok ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface-2 text-muted-foreground"
        }`}
      >
        {ok && <div className="h-1.5 w-1.5 bg-primary" />}
      </div>
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function MetricCell({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const color = tone === "warn" ? "text-warning" : tone === "bad" ? "text-danger" : "text-primary";
  return (
    <div className="rounded-md border border-border bg-surface-2 px-2.5 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm ${color}`}>{value}</div>
    </div>
  );
}

function SectionHead({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-12 max-w-2xl">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{tag}</div>
      <h2 className="mt-3 font-mono text-3xl md:text-4xl font-medium tracking-tight">{title}</h2>
      {desc && <p className="mt-3 text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Problem() {
  const items = [
    {
      icon: Activity,
      title: "Overtrading",
      copy: "You said 3 trades max. You took 11. Floatline counts every fill and locks you out when you hit your limit.",
    },
    {
      icon: AlertTriangle,
      title: "Revenge trading",
      copy: "Down a trade and reaching for the next? An alert pops up. Step away or check the box. Conscious, not reactive.",
    },
    {
      icon: ShieldOff,
      title: "Ignoring risk rules",
      copy: "Position too large. Stop too wide. R:R below 2. The checklist won't let you forget what already costs you money.",
    },
  ];
  return (
    <section id="problem">
      <Container className="py-20 md:py-24">
        <SectionHead
          tag="01 / the problem"
          title="You already know the rules. You break them anyway."
          desc="Three habits drain trading accounts faster than any bad strategy."
        />
        <div className="grid gap-px bg-border md:grid-cols-3 border border-border rounded-lg overflow-hidden">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-background p-6 hover:bg-surface transition-colors group"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-primary group-hover:border-primary/40 transition">
                <it.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-5 font-mono text-lg text-foreground">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.copy}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Install",
      copy: "Download the .exe or .dmg. 6 MB. No account. No telemetry.",
    },
    {
      n: "02",
      title: "Float it over your platform",
      copy: "Pin Floatline above TradingView, MT5, NinjaTrader, ThinkorSwim. Compact mode for tight layouts.",
    },
    {
      n: "03",
      title: "Trade with a coach watching",
      copy: "Run your checklist. Log fills. Get nudged when you drift. Close the session honest.",
    },
  ];
  return (
    <section id="how">
      <Container className="py-20 md:py-24">
        <SectionHead tag="02 / how it works" title="Three steps. No setup ceremony." />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-lg border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="font-mono text-xs text-primary">{s.n}</div>
              <h3 className="mt-4 font-mono text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.copy}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Pin,
      title: "Always-on-top window",
      copy: "Stays above every chart, every broker. Windows & Mac native.",
    },
    {
      icon: ListChecks,
      title: "Pre-trade checklist",
      copy: "Your rules. Your wording. Every entry passes the same gate.",
    },
    {
      icon: Bell,
      title: "Daily trade counter + stop alert",
      copy: "Set a max. Hit it and the window locks. Walk away.",
    },
    {
      icon: Calculator,
      title: "Position size reminders",
      copy: "Quick R-based sizing. No more eyeballed lots at 3am.",
    },
    {
      icon: Quote,
      title: "Discipline quotes",
      copy: "Livermore, Douglas, Elder. Rotated when the heat rises.",
    },
    {
      icon: Minimize2,
      title: "Compact mode",
      copy: "Shrinks to a 220px strip. Fits the corner of any layout.",
    },
  ];
  return (
    <section id="features">
      <Container className="py-20 md:py-24">
        <SectionHead
          tag="03 / features"
          title="Built for the screen, not for a dashboard."
          desc="Everything happens in a window the size of a Post-it. No tabs to open. No reports to read later."
        />
        <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3 border border-border rounded-lg overflow-hidden">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-background p-6 hover:bg-surface transition-colors group"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-primary group-hover:border-primary/40 transition">
                <it.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-5 font-mono text-base text-foreground">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.copy}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Quotes() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % QUOTES.length), 5000);
    return () => clearInterval(id);
  }, []);
  const q = QUOTES[i];
  return (
    <section>
      <Container className="py-20 md:py-24">
        <div className="rounded-lg border border-border bg-surface p-8 md:p-12">
          <div className="font-mono text-5xl md:text-6xl leading-none text-primary">"</div>
          <p className="mt-2 font-mono text-xl md:text-2xl leading-relaxed text-foreground max-w-3xl">
            {q.text}
          </p>
          <div className="mt-6 flex items-center justify-between">
            <div className="font-mono text-sm text-muted-foreground">— {q.author}</div>
            <div className="flex items-center gap-1.5">
              {QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Quote ${idx + 1}`}
                  className={`h-1 transition-all ${
                    idx === i ? "w-6 bg-primary" : "w-3 bg-border hover:bg-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function DownloadSection() {
  const onDownload = useDownloadClick();
  return (
    <section id="download">
      <Container className="py-20 md:py-28">
        <div className="text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">04 / download</div>
          <h2 className="mt-3 font-mono text-3xl md:text-4xl font-medium tracking-tight">
            Get the window. Trade better tonight.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
          <button
            onClick={onDownload}
            className="group flex items-center justify-between rounded-lg border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-primary/50 cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Monitor className="h-7 w-7 text-primary" />
              <div className="text-left">
                <div className="font-mono text-base">Download for Windows</div>
                <div className="font-mono text-xs text-muted-foreground">floatline-1.0.exe · 6.2 MB</div>
              </div>
            </div>
            <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
          </button>
          <button
            onClick={onDownload}
            className="group flex items-center justify-between rounded-lg border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-primary/50 cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Apple className="h-7 w-7 text-primary" />
              <div className="text-left">
                <div className="font-mono text-base">Download for Mac</div>
                <div className="font-mono text-xs text-muted-foreground">floatline-1.0.dmg · 7.1 MB</div>
              </div>
            </div>
            <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
          </button>
        </div>
        <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
          Free · No account needed · Open source
        </p>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <Container className="py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <Logo />
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Stay disciplined. Stay consistent.
          </p>
        </div>
        <nav className="flex items-center gap-6 font-mono text-xs text-muted-foreground">
          <a href="#problem" className="hover:text-foreground transition">problem</a>
          <a href="#features" className="hover:text-foreground transition">features</a>
          <a href="/pricing" className="hover:text-foreground transition">pricing</a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition"
          >
            <Github className="h-3.5 w-3.5" />
            github
          </a>
        </nav>
      </Container>
      <div className="border-t border-border">
        <Container className="py-4 font-mono text-[11px] text-muted-foreground flex justify-between">
          <span>© 2026 floatline</span>
          <span>v1.0.0</span>
        </Container>
      </div>
    </footer>
  );
}
