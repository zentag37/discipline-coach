import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronDown, Github, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout, type PlanKey } from "@/lib/checkout.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Trader Coach Pro" },
      {
        name: "description",
        content:
          "One flat price for your AI trading mentor. Solo, Pro and Elite plans. 7-day free trial. Cancel anytime.",
      },
      { property: "og:title", content: "Pricing — Trader Coach Pro" },
      {
        property: "og:description",
        content: "The discipline system 95% of traders never had. From $19/mo.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Nav />
      <Hero />
      <Divider />
      <Trust />
      <Divider />
      <FAQ />
      <Divider />
      <FinalCTA />
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

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="grid h-6 w-6 place-items-center rounded-sm border border-primary/40 bg-primary/10">
        <div className="h-2 w-2 rounded-[1px] bg-primary" />
      </div>
      <span className="font-mono text-sm tracking-tight">floatline</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="border-b border-border">
      <Container className="flex h-14 items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-mono">
          <Link to="/" className="hover:text-foreground transition-colors">/home</Link>
          <Link to="/pricing" className="text-foreground transition-colors">/pricing</Link>
          <a href="#faq" className="hover:text-foreground transition-colors">/faq</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden sm:inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-mono text-foreground hover:bg-surface transition"
          >
            Login
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-mono font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Get Started
          </Link>
        </div>
      </Container>
    </header>
  );
}

function Hero() {
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const navigate = useNavigate();
  const checkout = useServerFn(createCheckout);

  const startCheckout = async (plan: PlanKey) => {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sessionStorage.setItem("pendingPlan", plan);
        navigate({ to: "/register", search: { plan } as never });
        return;
      }
      const { url } = await checkout({ data: { plan } });
      if (url) window.location.href = url;
    } catch (e) {
      console.error(e);
      setLoadingPlan(null);
    }
  };

  return (
    <section>
      <Container className="py-20 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            / pricing
          </div>
          <h1 className="mt-4 font-mono text-4xl md:text-5xl font-medium leading-[1.05] tracking-tight">
            Your AI trading mentor.
            <br />
            <span className="text-primary">One flat price.</span>
          </h1>
          <p className="mt-6 text-base text-muted-foreground leading-relaxed">
            The discipline system that 95% of traders never had — and the edge they always needed.
          </p>

          <div className="mt-10 inline-flex items-center gap-3">
            <Toggle annual={annual} setAnnual={setAnnual} />
            {annual && (
              <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                Save 20%
              </span>
            )}
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3 items-stretch">
          <PlanCard
            plan="solo"
            name="SOLO"
            price={annual ? 15 : 19}
            tagline="Build the habit. Learn the rules."
            features={[
              "Floating window (Windows & Mac)",
              "Personalised greeting by name",
              "Daily risk calculator",
              "Pre-trade checklist",
              "Trade counter + stop alert",
              "Basic manual journal",
              "1 instrument on market intel",
              "Email support",
            ]}
            ctaLabel="Start Free Trial"
            ctaVariant="outline-teal"
            annual={annual}
            onStart={startCheckout}
            loading={loadingPlan === "solo"}
            disabled={loadingPlan !== null}
          />
          <PlanCard
            plan="pro"
            name="PRO"
            price={annual ? 39 : 49}
            tagline="Your AI mentor. In your ear. Every session."
            features={[
              "Everything in Solo, plus:",
              "ACE AI mentor — full emotional coaching",
              "Voice assistant (speaks during sessions)",
              "AI-written journal after every trade",
              "Emotion tracker per trade",
              "Market intel — up to 5 instruments",
              "Pivot points, trend direction, news",
              "Weekly AI performance review",
              "Prop firm mode (FTMO, The5%ers etc.)",
              "Discord community access",
            ]}
            ctaLabel="Start Free Trial"
            ctaVariant="filled-teal"
            featured
            annual={annual}
            onStart={startCheckout}
            loading={loadingPlan === "pro"}
            disabled={loadingPlan !== null}
          />
          <PlanCard
            plan="elite"
            name="ELITE"
            price={annual ? 79 : 99}
            tagline="For funded traders and professionals."
            features={[
              "Everything in Pro, plus:",
              "Unlimited instruments",
              "Custom mentor voice and name",
              "Real-time macro news alerts in floating window",
              "Multi-account support",
              "Prop firm team dashboard",
              "Monthly AI performance report (PDF)",
              "API access",
              "Priority onboarding call",
            ]}
            ctaLabel="Start Free Trial"
            ctaVariant="outline-amber"
            amber
            annual={annual}
            onStart={startCheckout}
            loading={loadingPlan === "elite"}
            disabled={loadingPlan !== null}
          />
        </div>
      </Container>
    </section>
  );
}

function Toggle({ annual, setAnnual }: { annual: boolean; setAnnual: (v: boolean) => void }) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-surface p-1 font-mono text-xs">
      <button
        onClick={() => setAnnual(false)}
        className={`px-4 py-1.5 rounded-sm transition ${
          !annual ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => setAnnual(true)}
        className={`px-4 py-1.5 rounded-sm transition ${
          annual ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Annual
      </button>
    </div>
  );
}

function PlanCard({
  plan,
  name,
  price,
  tagline,
  features,
  ctaLabel,
  ctaVariant,
  featured = false,
  amber = false,
  annual,
  onStart,
  loading,
  disabled,
}: {
  plan: PlanKey;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: "outline-teal" | "filled-teal" | "outline-amber";
  featured?: boolean;
  amber?: boolean;
  annual: boolean;
  onStart: (plan: PlanKey) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const borderClass = featured
    ? "border-2 border-primary shadow-[0_0_30px_-10px_rgba(0,212,160,0.4)]"
    : amber
    ? "border border-warning/60"
    : "border border-border";

  const accent = amber ? "text-warning" : "text-primary";

  const ctaClass =
    ctaVariant === "filled-teal"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : ctaVariant === "outline-amber"
      ? "border border-warning text-warning hover:bg-warning/10"
      : "border border-primary text-primary hover:bg-primary/10";

  return (
    <div className={`relative rounded-lg bg-surface p-7 flex flex-col ${borderClass}`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
            Most Popular
          </span>
        </div>
      )}

      <div className={`font-mono text-[11px] uppercase tracking-[0.2em] ${accent}`}>{name}</div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-mono text-5xl font-medium">${price}</span>
        <span className="font-mono text-sm text-muted-foreground">/mo</span>
      </div>
      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
        {annual ? "billed annually" : "billed monthly"}
      </div>

      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{tagline}</p>

      <ul className="mt-6 space-y-2.5 text-sm flex-1">
        {features.map((f, i) => {
          const isHeader = f.startsWith("Everything in");
          if (isHeader) {
            return (
              <li
                key={i}
                className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground pt-1"
              >
                {f}
              </li>
            );
          }
          return (
            <li key={i} className="flex items-start gap-2.5">
              <Check className={`h-4 w-4 mt-0.5 shrink-0 ${accent}`} />
              <span className="text-foreground/90 leading-relaxed">{f}</span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onStart(plan)}
        disabled={disabled}
        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-mono font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${ctaClass}`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Loading…" : ctaLabel}
      </button>
    </div>
  );
}

function Trust() {
  const items = [
    "7-day free trial on all plans",
    "Cancel anytime — no contracts",
    "Used by traders on FTMO, Pepperstone, Binance and 40+ brokers",
  ];
  return (
    <section>
      <Container className="py-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {items.map((t, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-primary">✦</span>
              {t}
              {i < items.length - 1 && (
                <span className="ml-6 hidden md:inline text-border">•</span>
              )}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}

const FAQS = [
  {
    q: "Do I need to install anything?",
    a: "Yes — after signup you download the lightweight Trader Coach desktop app for Windows or Mac. The web dashboard works in any browser.",
  },
  {
    q: "Will it work with my trading platform?",
    a: "Yes. Trader Coach floats on top of any platform — TradingView, MT4, MT5, Thinkorswim, cTrader, or anything else you use.",
  },
  {
    q: "What is ACE?",
    a: "ACE is your AI trading mentor built into the app. He knows your name, your account size, your instruments and your rules — and coaches you through every session in real time.",
  },
  {
    q: "Is my trading data private?",
    a: "Yes. Your trade data and journal are stored securely and never shared or sold. You own your data.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes, anytime from your dashboard settings. Changes take effect at the next billing cycle.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq">
      <Container className="py-20 md:py-24 max-w-3xl">
        <div className="text-center mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">/ faq</div>
          <h2 className="mt-3 font-mono text-3xl md:text-4xl font-medium tracking-tight">
            Common questions
          </h2>
        </div>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-surface-2 transition"
                >
                  <span className="font-mono text-sm text-foreground">{f.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function FinalCTA() {
  return (
    <section>
      <Container className="py-16">
        <div className="rounded-lg border border-border bg-surface p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-mono text-xl md:text-2xl text-foreground">
              Start your free 7-day trial.
            </h3>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              No credit card required.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Get Started Free
            </Link>
            <a
              href="#"
              className="inline-flex items-center rounded-md px-5 py-2.5 text-sm font-mono text-muted-foreground hover:text-foreground transition"
            >
              See full feature list
            </a>
          </div>
        </div>
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
          <Link to="/" className="hover:text-foreground transition">home</Link>
          <Link to="/pricing" className="hover:text-foreground transition">pricing</Link>
          <Link to="/auth" className="hover:text-foreground transition">login</Link>
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
