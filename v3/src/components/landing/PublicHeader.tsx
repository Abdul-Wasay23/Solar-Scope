"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Menu, X, ArrowRight } from "lucide-react";
import "./PublicHeader.css";

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="pub-header">
      <div className="pub-header-container">
        {/* Brand Logo */}
        <Link href="/" className="pub-brand">
          <span className="pub-brand-icon">
            <Sun size={22} />
          </span>
          <span className="pub-brand-text">SolarScope</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="pub-nav" aria-label="Main Navigation">
          <a href="#planning" className="pub-nav-link">
            Solar Planning
          </a>
          <a href="#estimation" className="pub-nav-link">
            Estimation & ROI
          </a>
          <a href="#features" className="pub-nav-link">
            Features
          </a>
          <a href="#how-it-works" className="pub-nav-link">
            How It Works
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="pub-actions">
          <Link href="/login" className="pub-btn-ghost">
            Sign In
          </Link>
          <Link href="/register" className="pub-btn-primary">
            <span>Start Free</span>
            <ArrowRight size={16} />
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="pub-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="pub-mobile-drawer">
          <nav className="pub-mobile-nav">
            <a
              href="#planning"
              className="pub-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Solar Planning
            </a>
            <a
              href="#estimation"
              className="pub-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Estimation & ROI
            </a>
            <a
              href="#features"
              className="pub-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="pub-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <div className="pub-mobile-actions" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/login"
                className="pub-btn-ghost"
                style={{ textAlign: "center", justifyContent: "center" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="pub-btn-primary pub-btn-mobile"
                onClick={() => setMobileMenuOpen(false)}
              >
                Create Account
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
