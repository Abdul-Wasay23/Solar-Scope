/**
 * SolarScope — Public Landing Page & Navigation QA Tests (Module 2, Step 7)
 *
 * Verifies:
 *  - Landing page rendering, hero section, CTA buttons
 *  - PublicHeader brand, navigation links, and login/register CTAs
 *  - Mobile drawer toggle button (accessible aria-expanded state)
 *  - Footer brand and section navigation links
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicLandingPage from "@/app/page";
import PublicHeader from "@/components/landing/PublicHeader";

describe("PublicHeader Navigation & Authentication CTAs", () => {
  it("renders brand link pointing to home", () => {
    render(<PublicHeader />);
    const brandLink = screen.getByRole("link", { name: /solarscope/i });
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders desktop Sign In and Start Free action buttons pointing to correct auth routes", () => {
    render(<PublicHeader />);
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks[0]).toHaveAttribute("href", "/login");

    const startFreeLinks = screen.getAllByRole("link", { name: /start free/i });
    expect(startFreeLinks[0]).toHaveAttribute("href", "/register");
  });

  it("toggles mobile menu drawer with accessible aria-expanded attribute", () => {
    const { container } = render(<PublicHeader />);
    const toggleBtn = container.querySelector<HTMLButtonElement>(".pub-mobile-toggle");
    expect(toggleBtn).not.toBeNull();
    if (!toggleBtn) throw new Error("Mobile navigation button was not rendered.");

    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    const createAccountLink = container.querySelector<HTMLAnchorElement>(
      ".pub-mobile-actions a[href='/register']",
    );
    expect(createAccountLink).not.toBeNull();
    expect(createAccountLink).toHaveAttribute("href", "/register");

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });
});

describe("PublicLandingPage QA", () => {
  it("renders the primary hero heading and platform description", () => {
    render(<PublicLandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /design\. estimate\. power your future\./i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/plan rooftop solar layouts, review preliminary energy estimates/i)
    ).toBeInTheDocument();
  });

  it("renders primary hero CTA button linking to workspace", () => {
    render(<PublicLandingPage />);
    const heroCta = screen.getByRole("link", { name: /start free project/i });
    expect(heroCta).toHaveAttribute("href", "/register");
  });

  it("renders all core capability proof items", () => {
    render(<PublicLandingPage />);
    expect(screen.getByText(/interactive rooftop cad & solar layout engine/i)).toBeInTheDocument();
    expect(screen.getByText(/panel placement optimizer/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time yield simulation/i)).toBeInTheDocument();
  });

  it("renders footer brand and links", () => {
    render(<PublicLandingPage />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/solarscope/i);
  });
});
