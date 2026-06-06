import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import * as React from "react";

// --- Mocks ---
const navigateMock = vi.fn();
const checkoutMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>(
      "@tanstack/react-router",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    createFileRoute: () => (config: unknown) => config,
  };
});

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => checkoutMock,
  createServerFn: () => ({
    middleware: () => ({
      inputValidator: () => ({ handler: () => vi.fn() }),
    }),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
    },
  },
}));

vi.mock("@/lib/checkout.functions", () => ({
  createCheckout: vi.fn(),
  PLAN_PRICE_IDS: { solo: "p_solo", pro: "p_pro", elite: "p_elite" },
}));

// Stable window.location stub for redirect assertions
const originalLocation = window.location;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // @ts-expect-error overriding for test
  delete window.location;
  // @ts-expect-error overriding for test
  window.location = { ...originalLocation, href: "" };
});

// Import after mocks
const { Route } = await import("./pricing");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PricingPage = (Route as any).component as () => React.ReactElement;

const PLAN_BUTTONS = ["solo", "pro", "elite"] as const;

function renderPage() {
  return render(<PricingPage />);
}

describe("Pricing CTAs", () => {

  it.each(PLAN_BUTTONS.map((p, i) => [p, i] as const))(
    "redirects %s CTA to /register when logged out",
    async (plan, idx) => {
      getSessionMock.mockResolvedValue({ data: { session: null } });
      renderPage();
      const btn = screen.getAllByRole("button", {
        name: /start free trial/i,
      })[idx];
      await userEvent.setup().click(btn);

      expect(checkoutMock).not.toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/register" }),
      );
      expect(sessionStorage.getItem("pendingPlan")).toBe(plan);
    },
  );

  it.each(PLAN_BUTTONS.map((p, i) => [p, i] as const))(
    "routes %s CTA to Stripe checkout when logged in",
    async (plan, idx) => {
      getSessionMock.mockResolvedValue({
        data: { session: { user: { id: "u1" } } },
      });
      checkoutMock.mockResolvedValue({ url: `https://stripe.test/${plan}` });

      renderPage();
      const btn = screen.getAllByRole("button", {
        name: /start free trial/i,
      })[idx];

      await userEvent.setup().click(btn);

      expect(checkoutMock).toHaveBeenCalledWith({ data: { plan } });
      expect(navigateMock).not.toHaveBeenCalled();
      // Wait a tick for promise resolution
      await new Promise((r) => setTimeout(r, 0));
      expect(window.location.href).toBe(`https://stripe.test/${plan}`);
    },
  );
});
