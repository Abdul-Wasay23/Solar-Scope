import { query } from "../src/lib/db";

const DEFAULT_SITE_CONTENT: Record<string, any> = {
  hero: {
    pillText: "Next-Generation Solar Intelligence Platform",
    headline: "Design. Estimate.",
    highlight: "Power Your Future.",
    subtitle: "Plan rooftop solar layouts, review preliminary energy estimates, and explore solar products and services in one workspace.",
    primaryCtaText: "Start Free Project",
    primaryCtaLink: "/register",
    secondaryCtaText: "Explore Platform",
    secondaryCtaLink: "#platform",
    trustBadge1: "Satellite Rooftop CAD",
    trustBadge2: "Preliminary Yield Estimates",
    trustBadge3: "Solar Provider Listings",
  },
  stats: {
    step1: "Locate a rooftop",
    step2: "Plan a panel layout",
    step3: "Review energy estimates",
    step4: "Prepare a feasibility report",
  },
  platform: {
    pillText: "Rooftop Intelligence",
    headline: "Interactive Rooftop CAD & Solar Layout Engine",
    subtitle: "Trace roof boundaries on satellite maps, plan panel layouts, and review preliminary energy estimates.",
    ctaText: "Launch Solar Workspace",
    ctaLink: "/login",
  },
  howItWorks: {
    pillText: "Simplified Workflow",
    headline: "How SolarScope Works",
    subtitle: "From a location pin to a preliminary feasibility report in four steps.",
    step1Title: "Map Your Rooftop",
    step1Desc: "Enter your property address, view high-res satellite imagery, and trace your usable rooftop boundary polygon.",
    step2Title: "Configure Panel Array",
    step2Desc: "Place monocrystalline solar panels, select tilt and azimuth orientation, and optimize spacing for peak sunlight capture.",
    step3Title: "Analyze Yield & ROI",
    step3Desc: "Simulate annual kilowatt-hour output, storage backup hours, capital cost, and your personalized payback period.",
    step4Title: "Source Hardware & Install",
    step4Desc: "Order certified Tier-1 panels, hybrid inverters, and battery banks directly, or hire verified installation teams.",
  },
  financials: {
    pillText: "Financial Intelligence",
    headline: "Comprehensive Energy & Financial Feasibility Modeling",
    subtitle: "Engineered metrics before you invest. Backed by ground meteorological data and live utility tariff schedules.",
    stat1Val: "51.2 kWh",
    stat1Lbl: "Avg Daily Generation Yield",
    stat2Val: "12.5 Hrs",
    stat2Lbl: "Battery Outage Backup",
    stat3Val: "84%",
    stat3Lbl: "Grid Tariff Bill Reduction",
    stat4Val: "3.4 Yrs",
    stat4Lbl: "System Capital Payback",
  },
  features: {
    pillText: "Unified Suite",
    headline: "Everything You Need In One Workspace",
    subtitle: "SolarScope merges industrial-grade CAD software with a transparent hardware marketplace and vetted installer network.",
  },
  contact: {
    pillText: "Get In Touch",
    headline: "Speak With A Solar Engineer",
    subtitle: "Whether you are evaluating a residential rooftop, commercial facility, or require an enterprise software demo, our engineering team is ready to assist.",
    email: "info.solarscope@gmail.com",
    phone: "+92-51-8849200",
    location: "Blue Area, Islamabad, Pakistan",
  },
  cta: {
    headline: "Ready to Transition to Clean Solar Energy?",
    subtitle: "Explore a solar layout and review the assumptions behind its energy and savings estimates.",
    btn1Text: "Create Free Account",
    btn1Link: "/register",
    btn2Text: "Sign In to Workspace",
    btn2Link: "/login",
  },
};

async function seed() {
  for (const [key, content] of Object.entries(DEFAULT_SITE_CONTENT)) {
    await query(
      `INSERT INTO site_content (section_key, content, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (section_key)
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(content)]
    );
  }
  console.log("SUCCESS: All 8 landing page sections seeded into site_content!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});
