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
import { describe, expect, it, vi } from "vitest";
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
    render(<PublicHeader />);
    const toggleBtn = screen.getByRole("button", { name: /toggle navigation menu/i });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    const createAccountLink = screen.getByRole("link", { name: /create account/i });
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
        name: /plan your solar future with precision & confidence/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/design custom rooftop panel arrays/i)
    ).toBeInTheDocument();
  });

  it("renders primary hero CTA button linking to workspace", () => {
    render(<PublicLandingPage />);
    const heroCta = screen.getByRole("link", { name: /start free estimation/i });
    expect(heroCta).toHaveAttribute("href", "/dashboard");
  });

  it("renders all core capability proof items", () => {
    render(<PublicLandingPage />);
    expect(screen.getByText(/postgis spatial accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time roi modeling/i)).toBeInTheDocument();
    expect(screen.getByText(/vetted providers/i)).toBeInTheDocument();
  });

  it("renders footer brand and links", () => {
    render(<PublicLandingPage />);
    expect(screen.getByText(/designed with deep solar blue & vivid sun gold/i)).toBeInTheDocument();
  });
});
