import Link from "next/link";
import PublicHeader from "@/components/landing/PublicHeader";
import {
  Sun,
  Compass,
  Zap,
  Calculator,
  ShieldCheck,
  ShoppingBag,
  Wrench,
  ArrowRight,
  CheckCircle2,
  Layers,
  MapPin,
  TrendingUp,
  BatteryCharging,
  DollarSign,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import "@/components/landing/LandingPage.css";

export default function PublicLandingPage() {
  return (
    <div className="landing-wrap">
      {/* 1. Public Header / Navigation */}
      <PublicHeader />

      <main>
        {/* 2. Hero Section */}
        <section className="hero-section">
          <div className="landing-container">
            <div className="hero-grid">
              <div className="hero-content">
                <div className="hero-badge-wrap">
                  <Sun size={16} />
                  <span>Next-Gen Rooftop Solar Intelligence & Marketplace</span>
                </div>

                <h1 className="hero-title">
                  Plan Your Solar Future with{" "}
                  <span className="hero-title-highlight">Precision & Confidence</span>
                </h1>

                <p className="hero-description">
                  Design custom rooftop panel arrays, calculate real-time energy yields and
                  financial payback periods, and connect seamlessly with certified equipment
                  vendors and installation professionals.
                </p>

                <div className="hero-cta-group">
                  <Link href="/dashboard" className="hero-btn-primary">
                    <span>Start Free Estimation</span>
                    <ArrowRight size={18} />
                  </Link>
                  <a href="#planning" className="hero-btn-secondary">
                    <span>Explore Platform</span>
                  </a>
                </div>

                <div className="hero-proof-strip">
                  <div className="hero-proof-item">
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <span>PostGIS Spatial Accuracy</span>
                  </div>
                  <div className="hero-proof-item">
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <span>Real-Time ROI Modeling</span>
                  </div>
                  <div className="hero-proof-item">
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <span>Vetted Providers</span>
                  </div>
                </div>
              </div>

              {/* Hero Interactive Simulation Preview Card */}
              <div className="hero-preview-col">
                <div className="hero-preview-card">
                  <div className="hero-preview-header">
                    <div className="hero-preview-title">
                      <Sun size={18} color="var(--color-accent)" />
                      <span>Live System Simulation</span>
                    </div>
                    <span className="hero-preview-badge">Optimal Sizing</span>
                  </div>

                  <div className="hero-preview-simulation">
                    <div className="sim-grid-lines" />
                    <div className="sim-header">
                      <span className="sim-tag">Rooftop Area #1 (South Facing)</span>
                      <span style={{ fontSize: "12px", color: "#CBD5E1" }}>Tilt 28° | Azimuth 180°</span>
                    </div>

                    <div className="sim-metrics-row">
                      <div className="sim-metric">
                        <div className="sim-metric-val">12.8 kW</div>
                        <div className="sim-metric-lbl">System Capacity</div>
                      </div>
                      <div className="sim-metric">
                        <div className="sim-metric-val">18,450</div>
                        <div className="sim-metric-lbl">kWh / Year</div>
                      </div>
                      <div className="sim-metric">
                        <div className="sim-metric-val">84%</div>
                        <div className="sim-metric-lbl">Grid Offset</div>
                      </div>
                    </div>
                  </div>

                  <div className="hero-preview-footer">
                    <div className="preview-stat-box">
                      <div className="stat-box-val">3.6 Years</div>
                      <div className="stat-box-lbl">Estimated Payback Period</div>
                    </div>
                    <div className="preview-stat-box">
                      <div className="stat-box-val">$2,480 / yr</div>
                      <div className="stat-box-lbl">Projected Utility Savings</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Solar Planning & Visualization Introduction */}
        <section id="planning" className="landing-section">
          <div className="landing-container">
            <div className="section-head">
              <span className="section-badge">Rooftop Geometry</span>
              <h2 className="section-title">
                Interactive Rooftop CAD Canvas & Spatial Layout
              </h2>
              <p className="section-subtitle">
                Trace real rooftop boundaries using geospatial satellite maps and configure panel placements with sub-meter accuracy.
              </p>
            </div>

            <div className="planning-grid">
              <div className="planning-feature-list">
                <div className="planning-card-item">
                  <div className="planning-icon">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 className="planning-item-title">Geospatial Satellite Property Mapping</h3>
                    <p className="planning-item-desc">
                      Pinpoint your exact address, trace rooftop polygons, and automatically compute slope, azimuth, and usable square footage.
                    </p>
                  </div>
                </div>

                <div className="planning-card-item">
                  <div className="planning-icon">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h3 className="planning-item-title">Usable vs. Restricted Zones</h3>
                    <p className="planning-item-desc">
                      Exclude HVAC units, chimneys, vents, and shade obstructions with dedicated restricted zones to ensure zero installation surprises.
                    </p>
                  </div>
                </div>

                <div className="planning-card-item">
                  <div className="planning-icon">
                    <Compass size={22} />
                  </div>
                  <div>
                    <h3 className="planning-item-title">Automated & Manual Panel Placement</h3>
                    <p className="planning-item-desc">
                      Configure portrait or landscape orientations, customize inter-row spacing, and maximize solar power density on your roof.
                    </p>
                  </div>
                </div>
              </div>

              {/* Planning Visual Demonstration */}
              <div className="planning-visual-col">
                <div className="planning-visual-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-accent)" }}>
                      CAD CANVAS ENGINE
                    </span>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Scale: 1:100 Metric</span>
                  </div>

                  <div className="visual-roof-cad">
                    <div className="roof-poly-label">
                      Active Usable Roof Zone: 142 m²
                    </div>
                  </div>

                  <div className="cad-controls-row">
                    <div className="cad-control-box">
                      <div className="cad-control-val">32 Panels</div>
                      <div className="cad-control-lbl">Mono Perc 400W</div>
                    </div>
                    <div className="cad-control-box">
                      <div className="cad-control-val">Portrait</div>
                      <div className="cad-control-lbl">Orientation</div>
                    </div>
                    <div className="cad-control-box">
                      <div className="cad-control-val">0.5m</div>
                      <div className="cad-control-lbl">Row Spacing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Energy & Financial Estimation Overview */}
        <section id="estimation" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="section-head">
              <span className="section-badge">Algorithmic Engineering</span>
              <h2 className="section-title">
                Complete Energy & Financial Feasibility Modeling
              </h2>
              <p className="section-subtitle">
                Clear engineering numbers before you spend a single dollar. Backed by solar irradiance algorithms and real utility rate tariffs.
              </p>
            </div>

            <div className="estimation-grid">
              <div className="est-card">
                <div className="est-icon">
                  <Zap size={24} />
                </div>
                <div className="est-value">51.2 kWh</div>
                <h3 className="est-title">Daily Generation Yield</h3>
                <p className="est-desc">
                  Based on local peak sun hours, historical weather patterns, and system loss factors.
                </p>
              </div>

              <div className="est-card est-card--accent">
                <div className="est-icon">
                  <BatteryCharging size={24} />
                </div>
                <div className="est-value">12 Hours</div>
                <h3 className="est-title">Critical Battery Backup</h3>
                <p className="est-desc">
                  Intelligent battery storage sizing tailored to your daily household load during outages.
                </p>
              </div>

              <div className="est-card">
                <div className="est-icon">
                  <DollarSign size={24} />
                </div>
                <div className="est-value">82% Cut</div>
                <h3 className="est-title">Utility Bill Reduction</h3>
                <p className="est-desc">
                  Calculate net metering credits and self-consumption savings against local electric tariffs.
                </p>
              </div>

              <div className="est-card est-card--accent">
                <div className="est-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="est-value">3.6 Yrs</div>
                <h3 className="est-title">Capital Payback Period</h3>
                <p className="est-desc">
                  Forecast 25-year cumulative return on investment and internal rate of return (IRR).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Key Features Section */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="section-head">
              <span className="section-badge">Comprehensive Platform</span>
              <h2 className="section-title">
                Everything Needed from Design to Turnkey Power
              </h2>
              <p className="section-subtitle">
                SolarScope unites advanced engineering software with a transparent hardware and services marketplace.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrap">
                  <Compass size={24} />
                </div>
                <h3 className="feature-title">Rooftop CAD Editor</h3>
                <p className="feature-description">
                  Draw high-precision polygons, adjust panel angles, and detect shading obstacles directly over satellite imagery.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrap">
                  <Calculator size={24} />
                </div>
                <h3 className="feature-title">Photovoltaic Performance Engine</h3>
                <p className="feature-description">
                  Simulate daily, monthly, and seasonal solar energy yields accounting for temperature and inverter conversion efficiency.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrap">
                  <BatteryCharging size={24} />
                </div>
                <h3 className="feature-title">Storage & Backup Sizing</h3>
                <p className="feature-description">
                  Configure lithium-ion or lead-acid battery banks to sustain essential refrigeration, lighting, and computing during load shedding.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrap">
                  <ShoppingBag size={24} />
                </div>
                <h3 className="feature-title">Equipment Marketplace</h3>
                <p className="feature-description">
                  Source verified Tier-1 solar panels, hybrid inverters, mounting structures, and AC/DC protection gear from verified distributors.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrap">
                  <CalendarCheck size={24} />
                </div>
                <h3 className="feature-title">Installment Financing Plans</h3>
                <p className="feature-description">
                  Flexible financing structures with customizable down payments, monthly tenures, and transparent installment terms.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrap">
                  <Wrench size={24} />
                </div>
                <h3 className="feature-title">Certified Installation Services</h3>
                <p className="feature-description">
                  Compare ratings, request site surveys, and book professional solar engineering contractors in your city.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. How It Works Section */}
        <section id="how-it-works" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="section-head">
              <span className="section-badge">Simple 4-Step Process</span>
              <h2 className="section-title">How SolarScope Works</h2>
              <p className="section-subtitle">
                From satellite rooftop identification to physical hardware delivery and activation in four streamlined steps.
              </p>
            </div>

            <div className="hiw-steps-grid">
              <div className="hiw-step-card">
                <span className="hiw-number">01</span>
                <div className="hiw-icon">
                  <MapPin size={22} />
                </div>
                <h3 className="hiw-title">Map Your Rooftop</h3>
                <p className="hiw-desc">
                  Input your address, inspect your satellite overhead view, and trace the usable rooftop perimeter.
                </p>
              </div>

              <div className="hiw-step-card">
                <span className="hiw-number">02</span>
                <div className="hiw-icon">
                  <Layers size={22} />
                </div>
                <h3 className="hiw-title">Configure Panel Array</h3>
                <p className="hiw-desc">
                  Place solar panels, select orientation and tilt, and optimize spacing to maximize power capacity.
                </p>
              </div>

              <div className="hiw-step-card">
                <span className="hiw-number">03</span>
                <div className="hiw-icon">
                  <Calculator size={22} />
                </div>
                <h3 className="hiw-title">Analyze Yield & Payback</h3>
                <p className="hiw-desc">
                  Review calculated kWh generation, battery backup hours, system cost, and financial payback timeline.
                </p>
              </div>

              <div className="hiw-step-card">
                <span className="hiw-number">04</span>
                <div className="hiw-icon">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="hiw-title">Order Hardware & Services</h3>
                <p className="hiw-desc">
                  Order approved solar hardware directly or book vetted local technicians for turn-key installation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Final Call-to-Action Section */}
        <section className="final-cta-section">
          <div className="landing-container">
            <div className="final-cta-box">
              <h2 className="final-cta-title">
                Ready to Transition to Clean, Cost-Effective Solar Power?
              </h2>
              <p className="final-cta-desc">
                Join homeowners, businesses, and engineering professionals using SolarScope to design high-efficiency solar installations.
              </p>
              <Link href="/dashboard" className="final-cta-btn">
                <span>Launch SolarScope Workspace</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Public Footer */}
      <footer className="pub-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <Link href="/" className="footer-brand">
                <span className="pub-brand-icon">
                  <Sun size={20} />
                </span>
                <span className="footer-brand-text">SolarScope</span>
              </Link>
              <p className="footer-brand-desc">
                An advanced digital engineering and commerce platform dedicated to accelerating decentralized solar power adoption.
              </p>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Software Features</h4>
              <nav className="footer-links-list">
                <a href="#planning" className="footer-link">Rooftop Canvas</a>
                <a href="#estimation" className="footer-link">Energy Calculations</a>
                <a href="#estimation" className="footer-link">Battery Sizing</a>
                <a href="#estimation" className="footer-link">Payback Estimator</a>
              </nav>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Marketplace</h4>
              <nav className="footer-links-list">
                <Link href="/dashboard" className="footer-link">Solar Panels</Link>
                <Link href="/dashboard" className="footer-link">Inverters & Storage</Link>
                <Link href="/dashboard" className="footer-link">Installment Plans</Link>
                <Link href="/dashboard" className="footer-link">Certified Providers</Link>
              </nav>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Workspace</h4>
              <nav className="footer-links-list">
                <Link href="/dashboard" className="footer-link">Dashboard</Link>
                <Link href="/projects" className="footer-link">My Projects</Link>
                <Link href="/settings/profile" className="footer-link">Account Settings</Link>
              </nav>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} SolarScope. All rights reserved.</p>
            <p>Designed with Deep Solar Blue & Vivid Sun Gold</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
