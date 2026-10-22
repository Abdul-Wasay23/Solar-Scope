"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Sun, ArrowRight, CheckCircle, Zap, TrendingUp, Shield,
  MapPin, LayoutGrid, Calculator, BatteryCharging, ShoppingBag,
  Star, ChevronDown, Menu, X, Phone, Mail, Globe,
  Cpu, Wrench, DollarSign, Users, Award, ChevronRight, Sparkles
} from "lucide-react";
import "@/components/landing/LandingPage.css";

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Animated stats counters state
  const [statCounts, setStatCounts] = useState({
    projects: 2400,
    accuracy: 98,
    vendors: 150,
    payback: 3.5,
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);

  // Handle nav sticky background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dynamically load GSAP and ScrollTrigger from CDN with robust cleanup
  useEffect(() => {
    let isMounted = true;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
    };

    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"),
    ])
      .then(() => {
        if (!isMounted) return;
        const gsap = (window as any).gsap;
        const ScrollTrigger = (window as any).ScrollTrigger;

        if (!gsap || !ScrollTrigger) return;

        gsap.registerPlugin(ScrollTrigger);

        const DEFAULT_EASE = "power3.out";

        // 1. HERO ANIMATION (Synchronized Entrance Timeline)
        const heroTl = gsap.timeline({ defaults: { ease: DEFAULT_EASE } });

        // Subtle Ken-Burns zoom on hero image
        heroTl.fromTo(
          ".lp-hero-bg img",
          { scale: 1.14 },
          { scale: 1.0, duration: 2.2, ease: "power2.out" },
          0
        );

        // Synchronized hero text entrance
        heroTl
          .fromTo(
            ".lp-hero-pill",
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7 },
            0.15
          )
          .fromTo(
            ".lp-hero-h1",
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9 },
            "-=0.4"
          )
          .fromTo(
            ".lp-hero-sub",
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8 },
            "-=0.5"
          )
          .fromTo(
            ".lp-hero-ctas > *",
            { y: 24, opacity: 0, scale: 0.94 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              stagger: 0.12,
              duration: 0.65,
              ease: "back.out(1.6)",
            },
            "-=0.4"
          )
          .fromTo(
            ".lp-hero-trust span",
            { y: 15, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.1, duration: 0.5 },
            "-=0.3"
          );

        // 2. STATS SECTION (Smooth dynamic counter animation)
        const counterObj = { projects: 0, accuracy: 0, vendors: 0, payback: 0 };
        gsap.to(counterObj, {
          projects: 2400,
          accuracy: 98,
          vendors: 150,
          payback: 3.5,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".lp-stats",
            start: "top 85%",
            toggleActions: "play none none none",
          },
          onUpdate: () => {
            if (!isMounted) return;
            setStatCounts({
              projects: Math.round(counterObj.projects),
              accuracy: Math.round(counterObj.accuracy),
              vendors: Math.round(counterObj.vendors),
              payback: Number(counterObj.payback.toFixed(1)),
            });
          },
        });

        gsap.fromTo(
          ".lp-stat-item",
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            duration: 0.75,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-stats",
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );

        // 3. SYNCHRONIZED PARALLAX SCRUB ON ALL IMAGE-BACKGROUND SECTIONS
        const imgSections = document.querySelectorAll<HTMLElement>(".lp-imgbg-section");
        imgSections.forEach((sec) => {
          const img = sec.querySelector<HTMLElement>(".lp-imgbg-bg img");
          if (img) {
            gsap.fromTo(
              img,
              { yPercent: -8 },
              {
                yPercent: 8,
                ease: "none",
                scrollTrigger: {
                  trigger: sec,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.2,
                },
              }
            );
          }
        });

        // 4. UNIFIED SECTION HEADERS (Pill -> Title -> Subtitle)
        const allSections = document.querySelectorAll<HTMLElement>(
          ".lp-white-section, .lp-imgbg-section"
        );
        allSections.forEach((sec) => {
          const pill = sec.querySelector(".lp-section-pill");
          const h2 = sec.querySelector(
            ".lp-section-h2, .lp-contact-h2, .lp-cta-h2"
          );
          const sub = sec.querySelector(
            ".lp-section-sub, .lp-contact-sub, .lp-cta-sub"
          );

          if (pill || h2 || sub) {
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: sec,
                start: "top 82%",
                toggleActions: "play none none none",
              },
              defaults: { ease: DEFAULT_EASE, duration: 0.7 },
            });

            if (pill) tl.fromTo(pill, { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, 0);
            if (h2)
              tl.fromTo(h2, { y: 28, opacity: 0 }, { y: 0, opacity: 1 }, 0.1);
            if (sub)
              tl.fromTo(sub, { y: 22, opacity: 0 }, { y: 0, opacity: 1 }, 0.2);
          }
        });

        // 5. PLATFORM FEATURE GLASS CARDS (Section 3)
        gsap.fromTo(
          ".lp-feat-card-glass",
          { y: 45, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.14,
            duration: 0.8,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-feature-cards-row",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 6. HOW IT WORKS STEP CARDS (Section 4)
        gsap.fromTo(
          ".lp-step-card",
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            duration: 0.8,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-steps-grid",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 7. ENERGY & FINANCIAL METRICS CARDS (Section 5)
        gsap.fromTo(
          ".lp-est-card",
          { y: 40, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.12,
            duration: 0.8,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-est-cards",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 8. FULL PLATFORM FEATURES GRID (Section 6)
        gsap.fromTo(
          ".lp-feature-card",
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.75,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-features-grid",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 9. SOLAR MARKETPLACE PRODUCT CARDS & IMAGES (Section 7)
        gsap.fromTo(
          ".lp-product-card",
          { y: 55, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.15,
            duration: 0.85,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-products-grid",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 10. WHY US CARDS (Section 8)
        gsap.fromTo(
          ".lp-why-card",
          { y: 35, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.75,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-why-grid",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 11. FAQ ACCORDION CASCADE (Section 9)
        gsap.fromTo(
          ".lp-faq-item",
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.65,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-faq-list",
              start: "top 82%",
              toggleActions: "play none none none",
            },
          }
        );

        // 12. CONTACT SECTION (Split Slide-In) (Section 10)
        gsap.fromTo(
          ".lp-contact-info",
          { x: -40, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-contact-grid",
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
        gsap.fromTo(
          ".lp-contact-form",
          { x: 40, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-contact-grid",
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );

        // 13. FINAL CTA INNER STAGGER (Section 11)
        gsap.fromTo(
          ".lp-cta-inner > *",
          { y: 28, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.12,
            duration: 0.8,
            ease: DEFAULT_EASE,
            scrollTrigger: {
              trigger: ".lp-cta-section",
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
      })
      .catch((err) => {
        console.warn("GSAP CDN load error, fallback CSS active:", err);
      });

    return () => {
      isMounted = false;
      const ScrollTrigger = (window as any).ScrollTrigger;
      if (ScrollTrigger) {
        ScrollTrigger.getAll().forEach((t: any) => t.kill());
      }
    };
  }, []);

  const faqs = [
    {
      q: "How accurate is SolarScope's energy estimation?",
      a: "Our estimates use high-resolution irradiance data, satellite shading models, and location-specific weather patterns, achieving ±5% accuracy compared to post-installation production telemetry.",
    },
    {
      q: "Can I design a rooftop layout on any property?",
      a: "Yes. Simply search any address to load satellite imagery, then trace your rooftop boundary using our polygon CAD tool to define usable installation zones with sub-meter precision.",
    },
    {
      q: "Are the marketplace equipment vendors verified?",
      a: "All equipment distributors and installation contractors on SolarScope are screened, license-verified, and vetted by customer reviews and certified warranty credentials.",
    },
    {
      q: "What does the financial payback calculation include?",
      a: "It accounts for system CAPEX, regional electricity tariffs, net metering credits, annual generation degradation, and projected utility price inflation.",
    },
    {
      q: "Can I export my project as a professional engineering report?",
      a: "Yes — every project generates a comprehensive PDF engineering report complete with solar irradiance heatmaps, electrical system specs, ROI timeline, and bill of quantities.",
    },
  ];

  return (
    <div className="lp-root">
      {/* ── TOP NAVIGATION ── */}
      <header className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <Link href="/" className="lp-brand">
            <span className="lp-brand-icon">
              <Sun size={20} />
            </span>
            <span className="lp-brand-name">SolarScope</span>
          </Link>

          <nav className="lp-nav-links">
            <a href="#platform" className="lp-nav-link">Platform</a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#financials" className="lp-nav-link">Financials</a>
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#marketplace" className="lp-nav-link">Marketplace</a>
            <a href="#contact" className="lp-nav-link">Contact</a>
          </nav>

          <div className="lp-nav-actions">
            <Link href="/login" className="lp-nav-btn-ghost">
              Sign In
            </Link>
            <Link href="/register" className="lp-nav-btn-gold">
              Get Started
            </Link>
          </div>

          <button
            className="lp-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lp-mobile-menu">
            <a
              href="#platform"
              className="lp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Platform
            </a>
            <a
              href="#how-it-works"
              className="lp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#financials"
              className="lp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Financials
            </a>
            <a
              href="#features"
              className="lp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#marketplace"
              className="lp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Marketplace
            </a>
            <a
              href="#contact"
              className="lp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Contact
            </a>
            <div className="lp-mobile-actions">
              <Link href="/login" className="lp-nav-btn-ghost">
                Sign In
              </Link>
              <Link href="/register" className="lp-nav-btn-gold">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════
          SECTION 1 — HERO BANNER (Image BG + Gradient)
      ══════════════════════════════════════════ */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-bg">
          <Image
            src="/images/hero-banner.jpg"
            alt="Solar cityscape aerial view"
            fill
            style={{ objectFit: "cover" }}
            priority
            unoptimized
          />
          <div className="lp-hero-overlay" />
        </div>

        <div className="lp-hero-content lp-hero-visible">
          <div className="lp-container">
            <div className="lp-hero-pill">
              <Sparkles size={14} />
              <span>Next-Generation Solar Intelligence Platform</span>
            </div>
            <h1 className="lp-hero-h1">
              Design. Estimate.<br />
              <span className="lp-gold">Power Your Future.</span>
            </h1>
            <p className="lp-hero-sub">
              Plan rooftop solar arrays with satellite precision, simulate real financial yields, and source verified Tier-1 hardware — all in one synchronized workspace.
            </p>
            <div className="lp-hero-ctas">
              <Link href="/register" className="lp-btn-gold-lg">
                Start Free Project <ArrowRight size={18} />
              </Link>
              <a href="#platform" className="lp-btn-ghost-lg">
                Explore Platform
              </a>
            </div>
            <div className="lp-hero-trust">
              <span>
                <CheckCircle size={15} /> Satellite Rooftop CAD
              </span>
              <span>
                <CheckCircle size={15} /> Dynamic ROI Engine
              </span>
              <span>
                <CheckCircle size={15} /> Screened Installers
              </span>
            </div>
          </div>
        </div>

        <div className="lp-hero-scroll">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2 — STATS (White / Clean Off-White)
      ══════════════════════════════════════════ */}
      <section className="lp-stats" ref={statsRef}>
        <div className="lp-container">
          <div className="lp-stats-grid">
            <div className="lp-stat-item">
              <div className="lp-stat-val">
                {statCounts.projects.toLocaleString()}+
              </div>
              <div className="lp-stat-lbl">Projects Designed</div>
            </div>
            <div className="lp-stat-item">
              <div className="lp-stat-val">{statCounts.accuracy}%</div>
              <div className="lp-stat-lbl">Estimation Accuracy</div>
            </div>
            <div className="lp-stat-item">
              <div className="lp-stat-val">{statCounts.vendors}+</div>
              <div className="lp-stat-lbl">Verified Vendors</div>
            </div>
            <div className="lp-stat-item">
              <div className="lp-stat-val">{statCounts.payback} Yr</div>
              <div className="lp-stat-lbl">Avg Capital Payback</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3 — PLATFORM OVERVIEW (Image BG + Gradient)
      ══════════════════════════════════════════ */}
      <section id="platform" className="lp-imgbg-section">
        <div className="lp-imgbg-bg">
          <Image
            src="/images/bg-installation.jpg"
            alt="Solar installation rooftop work"
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div className="lp-imgbg-overlay" />
        </div>
        <div className="lp-container lp-imgbg-inner">
          <div className="lp-section-pill lp-pill-light">Rooftop Intelligence</div>
          <h2 className="lp-section-h2 lp-white">
            Interactive Rooftop CAD & Solar Layout Engine
          </h2>
          <p className="lp-section-sub lp-sub-light">
            Trace real property boundaries on satellite maps, calculate tilt & azimuth, configure multi-string arrays, and preview energy output with sub-meter precision.
          </p>
          <div className="lp-feature-cards-row">
            {[
              {
                icon: <MapPin size={22} />,
                title: "Satellite Property Mapping",
                desc: "Search any location, outline roof surfaces with CAD precision, and detect shading obstacles automatically.",
              },
              {
                icon: <LayoutGrid size={22} />,
                title: "Panel Placement Optimizer",
                desc: "Configure portrait or landscape arrays, customize inter-row pitch, and maximize generation density per square meter.",
              },
              {
                icon: <Calculator size={22} />,
                title: "Real-Time Yield Simulation",
                desc: "Calculate instantaneous kWh output calibrated with local irradiance profiles, inverter efficiency, and system losses.",
              },
            ].map((f, i) => (
              <div key={i} className="lp-feat-card-glass">
                <div className="lp-feat-card-icon">{f.icon}</div>
                <h3 className="lp-feat-card-title">{f.title}</h3>
                <p className="lp-feat-card-desc">{f.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="lp-btn-gold-lg lp-mt-40">
            Launch Solar Workspace <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 4 — HOW IT WORKS (White / Clean Off-White)
      ══════════════════════════════════════════ */}
      <section id="how-it-works" className="lp-white-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-pill">Simplified Workflow</div>
            <h2 className="lp-section-h2">How SolarScope Works</h2>
            <p className="lp-section-sub">
              From initial rooftop survey to certified installation in four intuitive steps.
            </p>
          </div>
          <div className="lp-steps-grid">
            {[
              {
                num: "01",
                icon: <MapPin size={24} />,
                title: "Map Your Rooftop",
                desc: "Enter your property address, view high-res satellite imagery, and trace your usable rooftop boundary polygon.",
              },
              {
                num: "02",
                icon: <LayoutGrid size={24} />,
                title: "Configure Panel Array",
                desc: "Place monocrystalline solar panels, select tilt and azimuth orientation, and optimize spacing for peak sunlight capture.",
              },
              {
                num: "03",
                icon: <Calculator size={24} />,
                title: "Analyze Yield & ROI",
                desc: "Simulate annual kilowatt-hour output, storage backup hours, capital cost, and your personalized payback period.",
              },
              {
                num: "04",
                icon: <ShoppingBag size={24} />,
                title: "Source Hardware & Install",
                desc: "Order certified Tier-1 panels, hybrid inverters, and battery banks directly, or hire verified installation teams.",
              },
            ].map((s, i) => (
              <div key={i} className="lp-step-card">
                <span className="lp-step-num">{s.num}</span>
                <div className="lp-step-icon">{s.icon}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5 — ENERGY & FINANCIAL (Image BG + Gradient)
      ══════════════════════════════════════════ */}
      <section id="financials" className="lp-imgbg-section">
        <div className="lp-imgbg-bg">
          <Image
            src="/images/bg-solar-farm.jpg"
            alt="Utility solar farm panels at sunset"
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div className="lp-imgbg-overlay lp-overlay-dark" />
        </div>
        <div className="lp-container lp-imgbg-inner">
          <div className="lp-section-pill lp-pill-light">Financial Intelligence</div>
          <h2 className="lp-section-h2 lp-white">
            Comprehensive Energy & Financial Feasibility Modeling
          </h2>
          <p className="lp-section-sub lp-sub-light">
            Engineered metrics before you invest. Backed by ground meteorological data and live utility tariff schedules.
          </p>
          <div className="lp-est-cards">
            {[
              {
                val: "51.2 kWh",
                lbl: "Avg Daily Generation Yield",
                icon: <Zap size={22} />,
              },
              {
                val: "12.5 Hrs",
                lbl: "Battery Outage Backup",
                icon: <BatteryCharging size={22} />,
              },
              {
                val: "84%",
                lbl: "Grid Tariff Bill Reduction",
                icon: <DollarSign size={22} />,
              },
              {
                val: "3.4 Yrs",
                lbl: "System Capital Payback",
                icon: <TrendingUp size={22} />,
              },
            ].map((e, i) => (
              <div key={i} className="lp-est-card">
                <div className="lp-est-icon">{e.icon}</div>
                <div className="lp-est-val">{e.val}</div>
                <div className="lp-est-lbl">{e.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 6 — FEATURES GRID (White / Clean Off-White)
      ══════════════════════════════════════════ */}
      <section id="features" className="lp-white-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-pill">Unified Suite</div>
            <h2 className="lp-section-h2">Everything You Need In One Workspace</h2>
            <p className="lp-section-sub">
              SolarScope merges industrial-grade CAD software with a transparent hardware marketplace and vetted installer network.
            </p>
          </div>
          <div className="lp-features-grid">
            {[
              {
                icon: <Cpu size={22} />,
                tag: "CAD Engine",
                title: "Rooftop Polygon Editor",
                desc: "Trace high-resolution satellite imagery, designate keepout zones, and calculate roof tilt angles with sub-meter accuracy.",
              },
              {
                icon: <Calculator size={22} />,
                tag: "Simulation",
                title: "PV Performance Engine",
                desc: "Simulate seasonal yield patterns accounting for heat derating, soiling coefficients, and inverter clipping losses.",
              },
              {
                icon: <BatteryCharging size={22} />,
                tag: "Storage",
                title: "Battery Storage Sizing",
                desc: "Size lithium iron phosphate (LiFePO4) storage banks to support critical home and commercial loads seamlessly.",
              },
              {
                icon: <ShoppingBag size={22} />,
                tag: "Hardware",
                title: "Direct Marketplace",
                desc: "Purchase Tier-1 modules, hybrid inverters, and anodized aluminum mounting racks directly from verified suppliers.",
              },
              {
                icon: <DollarSign size={22} />,
                tag: "Financing",
                title: "ROI & Payback Tracker",
                desc: "Detailed cash-flow projections, net metering revenues, and customized down payment installment calculators.",
              },
              {
                icon: <Wrench size={22} />,
                tag: "Field Services",
                title: "Certified Installers",
                desc: "Book licensed solar engineers for on-site verification, net-metering licensing, and turnkey commissioning.",
              },
            ].map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <span className="lp-feature-tag">{f.tag}</span>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <span className="lp-feature-link">
                  Explore feature <ChevronRight size={14} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 7 — MARKETPLACE (Image BG + Gradient)
      ══════════════════════════════════════════ */}
      <section id="marketplace" className="lp-imgbg-section">
        <div className="lp-imgbg-bg">
          <Image
            src="/images/hero-banner.jpg"
            alt="Solar technology and commercial solutions"
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div className="lp-imgbg-overlay" />
        </div>
        <div className="lp-container lp-imgbg-inner">
          <div className="lp-section-pill lp-pill-light">Solar Marketplace</div>
          <h2 className="lp-section-h2 lp-white">
            Premium Solar Equipment, Verified
          </h2>
          <p className="lp-section-sub lp-sub-light">
            Source bankable Tier-1 solar hardware with genuine manufacturer warranties and direct distributor pricing.
          </p>

          <div className="lp-products-grid">
            {/* Product 1: Solar Panel */}
            <div className="lp-product-card">
              <div className="lp-product-badge">Top Seller</div>
              <div className="lp-product-img-wrap">
                <Image
                  src="/images/product-panel.jpg"
                  alt="JA Solar DeepBlue 3.0 545W Monocrystalline Panel"
                  fill
                  style={{ objectFit: "contain", padding: "16px" }}
                  unoptimized
                />
              </div>
              <div className="lp-product-body">
                <div className="lp-product-type">Tier-1 Monocrystalline</div>
                <h3 className="lp-product-name">JA Solar DeepBlue 3.0 — 545W</h3>
                <div className="lp-product-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill="#FFB800"
                      color="#FFB800"
                    />
                  ))}
                  <span>4.9 (134 reviews)</span>
                </div>
                <ul className="lp-product-specs">
                  <li>
                    <CheckCircle size={13} /> 21.5% Peak Module Efficiency
                  </li>
                  <li>
                    <CheckCircle size={13} /> 25-Year Linear Output Warranty
                  </li>
                  <li>
                    <CheckCircle size={13} /> Multi-busbar Half-Cut Cells
                  </li>
                </ul>
                <div className="lp-product-price">
                  PKR 28,500 <span>/ module</span>
                </div>
                <Link href="/projects" className="lp-product-btn">
                  Configure in System
                </Link>
              </div>
            </div>

            {/* Product 2: Hybrid Inverter */}
            <div className="lp-product-card">
              <div className="lp-product-badge lp-badge-blue">Industrial</div>
              <div className="lp-product-img-wrap">
                <Image
                  src="/images/product-inverter.jpg"
                  alt="Growatt SPH 10000TL3 Hybrid Inverter 10kW"
                  fill
                  style={{ objectFit: "contain", padding: "16px" }}
                  unoptimized
                />
              </div>
              <div className="lp-product-body">
                <div className="lp-product-type">Hybrid Inverter</div>
                <h3 className="lp-product-name">
                  Growatt SPH 10000TL3 — 10kW
                </h3>
                <div className="lp-product-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill={i < 5 ? "#FFB800" : "none"}
                      color="#FFB800"
                    />
                  ))}
                  <span>4.8 (98 reviews)</span>
                </div>
                <ul className="lp-product-specs">
                  <li>
                    <CheckCircle size={13} /> Dual MPPT & 98.4% Efficiency
                  </li>
                  <li>
                    <CheckCircle size={13} /> Seamless Off-Grid Switchover
                  </li>
                  <li>
                    <CheckCircle size={13} /> Real-Time Cloud Telemetry
                  </li>
                </ul>
                <div className="lp-product-price">
                  PKR 185,000 <span>/ unit</span>
                </div>
                <Link href="/projects" className="lp-product-btn">
                  Configure in System
                </Link>
              </div>
            </div>

            {/* Product 3: LiFePO4 Battery */}
            <div className="lp-product-card">
              <div className="lp-product-badge lp-badge-green">High Demand</div>
              <div className="lp-product-img-wrap">
                <Image
                  src="/images/product-battery.jpg"
                  alt="Pylontech US3000C LiFePO4 Battery 3.5kWh"
                  fill
                  style={{ objectFit: "contain", padding: "16px" }}
                  unoptimized
                />
              </div>
              <div className="lp-product-body">
                <div className="lp-product-type">LiFePO4 Storage</div>
                <h3 className="lp-product-name">
                  Pylontech US3000C — 3.5kWh
                </h3>
                <div className="lp-product-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill="#FFB800"
                      color="#FFB800"
                    />
                  ))}
                  <span>5.0 (62 reviews)</span>
                </div>
                <ul className="lp-product-specs">
                  <li>
                    <CheckCircle size={13} /> 6,000+ Deep Cycles @ 95% DoD
                  </li>
                  <li>
                    <CheckCircle size={13} /> Modular Rack-Mount Scalable
                  </li>
                  <li>
                    <CheckCircle size={13} /> Integrated Smart BMS Protection
                  </li>
                </ul>
                <div className="lp-product-price">
                  PKR 145,000 <span>/ unit</span>
                </div>
                <Link href="/projects" className="lp-product-btn">
                  Configure in System
                </Link>
              </div>
            </div>
          </div>

          <div className="lp-mp-cta-row">
            <p>
              Looking for custom capacities? Explore our catalog of 200+ verified solar panels, inverters, and mounting kits.
            </p>
            <Link href="/projects" className="lp-btn-gold-lg">
              Explore Hardware Catalog <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 8 — WHY SOLARSCOPE (White / Clean Off-White)
      ══════════════════════════════════════════ */}
      <section className="lp-white-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-section-pill">Why SolarScope</div>
            <h2 className="lp-section-h2">
              Engineered For Precision. Built For Transparency.
            </h2>
            <p className="lp-section-sub">
              Every algorithm, CAD tool, and vendor verification is designed to give homeowners and enterprises complete confidence.
            </p>
          </div>
          <div className="lp-why-grid">
            {[
              {
                icon: <Shield size={24} />,
                title: "Vetted Suppliers & Technicians",
                desc: "Every equipment manufacturer and installation partner undergoes corporate screening and credential reviews before being onboarded.",
              },
              {
                icon: <Zap size={24} />,
                title: "Sub-Second Simulation Engine",
                desc: "CAD edits update irradiance, tilt shadow factors, kilowatt-hour yield, and bill offsets simultaneously with zero lag.",
              },
              {
                icon: <Award size={24} />,
                title: "Bankable Tier-1 Hardware",
                desc: "We exclusively list certified Tier-1 equipment backed by international testing standards (IEC, CE, TÜV Rheinland).",
              },
              {
                icon: <Users size={24} />,
                title: "Certified Field Contractors",
                desc: "Connect with accredited local EPC contractors for physical structural audits, electrical wiring, and net metering permits.",
              },
              {
                icon: <TrendingUp size={24} />,
                title: "25-Year Life Cycle Analysis",
                desc: "Project cumulative electricity savings over 25 years incorporating utility inflation rates and component degradation curves.",
              },
              {
                icon: <Globe size={24} />,
                title: "High-Resolution Solar Telemetry",
                desc: "Satellite irradiance records calibrated specifically for local weather stations across major urban and industrial centers.",
              },
            ].map((w, i) => (
              <div key={i} className="lp-why-card">
                <div className="lp-why-icon">{w.icon}</div>
                <h3 className="lp-why-title">{w.title}</h3>
                <p className="lp-why-desc">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 9 — FAQ (Image BG + Gradient)
      ══════════════════════════════════════════ */}
      <section className="lp-imgbg-section">
        <div className="lp-imgbg-bg">
          <Image
            src="/images/bg-installation.jpg"
            alt="Technicians installing commercial solar modules"
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div className="lp-imgbg-overlay lp-overlay-blue" />
        </div>
        <div className="lp-container lp-imgbg-inner">
          <div className="lp-section-pill lp-pill-light">Knowledge Base</div>
          <h2 className="lp-section-h2 lp-white">
            Frequently Asked Questions
          </h2>
          <p className="lp-section-sub lp-sub-light">
            Clear answers about rooftop solar engineering, equipment warranties, and project modeling.
          </p>

          <div className="lp-faq-list">
            {faqs.map((f, i) => (
              <div
                key={i}
                className={`lp-faq-item${openFaq === i ? " lp-faq-open" : ""}`}
              >
                <button
                  className="lp-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.q}</span>
                  <ChevronDown
                    size={18}
                    className={`lp-faq-chevron${
                      openFaq === i ? " lp-faq-chevron-open" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="lp-faq-a">
                    <p>{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 10 — CONTACT (White / Clean Off-White)
      ══════════════════════════════════════════ */}
      <section id="contact" className="lp-white-section">
        <div className="lp-container">
          <div className="lp-contact-grid">
            <div className="lp-contact-info">
              <div className="lp-section-pill">Get In Touch</div>
              <h2 className="lp-contact-h2">Speak With A Solar Engineer</h2>
              <p className="lp-contact-sub">
                Whether you are evaluating a residential rooftop, commercial facility, or require an enterprise software demo, our engineering team is ready to assist.
              </p>

              <div className="lp-contact-details">
                <div className="lp-contact-row">
                  <div className="lp-contact-icon">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="lp-contact-label">Email Support</div>
                    <div className="lp-contact-val">support@solarscope.io</div>
                  </div>
                </div>

                <div className="lp-contact-row">
                  <div className="lp-contact-icon">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="lp-contact-label">Call Engineering Desk</div>
                    <div className="lp-contact-val">+92-51-8849200</div>
                  </div>
                </div>

                <div className="lp-contact-row">
                  <div className="lp-contact-icon">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="lp-contact-label">Technology Center</div>
                    <div className="lp-contact-val">
                      Blue Area, Islamabad, Pakistan
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form
              className="lp-contact-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you! Your solar inquiry has been received. Our engineering specialist will reach out shortly.");
              }}
            >
              <h3 className="lp-form-title">Request A Feasibility Consultation</h3>
              <div className="lp-form-row">
                <div className="lp-form-field">
                  <label className="lp-form-label">Full Name</label>
                  <input
                    className="lp-form-input"
                    type="text"
                    required
                    placeholder="Engr. Tariq Mehmood"
                  />
                </div>
                <div className="lp-form-field">
                  <label className="lp-form-label">Email Address</label>
                  <input
                    className="lp-form-input"
                    type="email"
                    required
                    placeholder="tariq@enterprise.com"
                  />
                </div>
              </div>
              <div className="lp-form-field">
                <label className="lp-form-label">System Type & City</label>
                <input
                  className="lp-form-input"
                  type="text"
                  required
                  placeholder="15kW On-Grid / Karachi"
                />
              </div>
              <div className="lp-form-field">
                <label className="lp-form-label">Project Details</label>
                <textarea
                  className="lp-form-textarea"
                  rows={4}
                  placeholder="Describe your rooftop area, monthly electricity bill, or equipment inquiries…"
                />
              </div>
              <button type="submit" className="lp-form-submit">
                Submit Consultation Request <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 11 — FINAL CTA (Image BG + Gradient)
      ══════════════════════════════════════════ */}
      <section className="lp-imgbg-section lp-cta-section">
        <div className="lp-imgbg-bg">
          <Image
            src="/images/bg-solar-farm.jpg"
            alt="Clean renewable solar power landscape"
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div className="lp-imgbg-overlay lp-overlay-dark" />
        </div>
        <div className="lp-container lp-imgbg-inner lp-cta-inner">
          <div className="lp-cta-icon-wrap">
            <Sun size={36} />
          </div>
          <h2 className="lp-cta-h2">Ready to Transition to Clean Solar Energy?</h2>
          <p className="lp-cta-sub">
            Join thousands of smart homeowners and commercial facilities planning higher efficiency, lower electric bills, and energy independence.
          </p>
          <div className="lp-hero-ctas">
            <Link href="/register" className="lp-btn-gold-lg">
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="lp-btn-ghost-lg">
              Sign In to Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER (Deep Solar Blue #0F2C59)
      ══════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand-col">
              <Link href="/" className="lp-brand lp-footer-brand">
                <span className="lp-brand-icon">
                  <Sun size={18} />
                </span>
                <span className="lp-brand-name">SolarScope</span>
              </Link>
              <p className="lp-footer-desc">
                Enterprise solar engineering CAD, dynamic yield modeling, and verified clean technology marketplace.
              </p>
            </div>
            <div className="lp-footer-col">
              <h4 className="lp-footer-col-title">Platform</h4>
              <nav className="lp-footer-links">
                <a href="#platform" className="lp-footer-link">Rooftop CAD</a>
                <a href="#financials" className="lp-footer-link">Energy Modeling</a>
                <a href="#marketplace" className="lp-footer-link">Marketplace</a>
                <a href="#how-it-works" className="lp-footer-link">How It Works</a>
              </nav>
            </div>
            <div className="lp-footer-col">
              <h4 className="lp-footer-col-title">Workspace</h4>
              <nav className="lp-footer-links">
                <Link href="/register" className="lp-footer-link">Create Account</Link>
                <Link href="/login" className="lp-footer-link">Sign In</Link>
                <Link href="/dashboard" className="lp-footer-link">Dashboard</Link>
                <Link href="/projects" className="lp-footer-link">Project Studio</Link>
              </nav>
            </div>
            <div className="lp-footer-col">
              <h4 className="lp-footer-col-title">Contact</h4>
              <nav className="lp-footer-links">
                <a href="mailto:support@solarscope.io" className="lp-footer-link">
                  support@solarscope.io
                </a>
                <a href="#contact" className="lp-footer-link">
                  Consultation Request
                </a>
                <span className="lp-footer-link">Islamabad, Pakistan</span>
              </nav>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} SolarScope. All rights reserved.</span>
            <span>Designed for precision. Powered by innovation.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
