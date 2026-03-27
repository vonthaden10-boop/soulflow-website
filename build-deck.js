const PptxGenJS = require("pptxgenjs");
const fs = require("fs");

// Logo as base64 data URI for embedding in slides
const _logoSvg = fs.readFileSync("./logo.svg", "utf8");
const LOGO_DATA = "data:image/svg+xml;base64," + Buffer.from(_logoSvg).toString("base64");

const pptx = new PptxGenJS();

// ── Global theme ────────────────────────────────────────────────────────────
const BG        = "0D0D1A";   // near-black navy
const PURPLE    = "6B2FD9";   // primary purple
const PURPLE_LT = "9B6BFF";   // light purple accent
const GOLD      = "FFB800";   // gold accent
const GOLD_LT   = "FFD966";   // light gold
const WHITE     = "FFFFFF";
const GRAY      = "AAAACC";

pptx.layout  = "LAYOUT_WIDE";  // 13.33 × 7.5 in
pptx.author  = "Soulflow";
pptx.company = "Soulflow";
pptx.subject = "Pitch Deck";
pptx.title   = "Soulflow Pitch Deck";

// ── Helpers ─────────────────────────────────────────────────────────────────
function darkSlide(slide) {
  slide.background = { color: BG };
}

function accentBar(slide, color = PURPLE) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color },
    line: { type: "none" },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.42, w: "100%", h: 0.08,
    fill: { color: GOLD },
    line: { type: "none" },
  });
}

function sectionLabel(slide, text) {
  slide.addText(text.toUpperCase(), {
    x: 0.5, y: 0.2, w: 12, h: 0.35,
    fontSize: 9, bold: true, color: GOLD,
    charSpacing: 4, align: "left",
  });
}

function heading(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.5, y: opts.y ?? 0.65, w: opts.w ?? 12.33, h: opts.h ?? 0.9,
    fontSize: opts.size ?? 36, bold: true,
    color: opts.color ?? WHITE, align: opts.align ?? "left",
    fontFace: "Calibri",
    ...opts.extra,
  });
}

function body(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.5, y: opts.y ?? 1.7, w: opts.w ?? 12.33, h: opts.h ?? 4.5,
    fontSize: opts.size ?? 18, color: opts.color ?? GRAY,
    align: opts.align ?? "left", valign: "top",
    fontFace: "Calibri", lineSpacingMultiple: 1.4,
    ...opts.extra,
  });
}

function card(slide, x, y, w, h, fillColor = "16163A") {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fillColor },
    line: { color: PURPLE, width: 1.5 },
    rectRadius: 0.12,
  });
}

function goldDivider(slide, y = 1.55) {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y, w: 3.5, h: 0,
    line: { color: GOLD, width: 2 },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ════════════════════════════════════════════════════════════════════════════
(function slide1() {
  const s = pptx.addSlide();
  darkSlide(s);

  // Purple gradient band left
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 5.2, h: 7.5,
    fill: { color: "100B2E" },
    line: { type: "none" },
  });

  // Gold vertical accent
  s.addShape(pptx.ShapeType.rect, {
    x: 5.2, y: 0, w: 0.06, h: 7.5,
    fill: { color: GOLD },
    line: { type: "none" },
  });

  // Logo icon — Soulflow SVG
  s.addImage({ data: LOGO_DATA, x: 1.35, y: 0.9, w: 2.5, h: 2.5 });

  // Brand name under logo
  s.addText("SOULFLOW", {
    x: 0.5, y: 3.55, w: 4.2, h: 0.5,
    fontSize: 22, bold: true, color: WHITE,
    align: "center", charSpacing: 6, fontFace: "Calibri",
  });
  s.addText("AI-Powered Growth Agency", {
    x: 0.5, y: 4.1, w: 4.2, h: 0.35,
    fontSize: 11, color: GOLD_LT,
    align: "center", charSpacing: 2, fontFace: "Calibri",
  });

  // Right side — tagline
  s.addText("We Run\nYour Growth.", {
    x: 5.6, y: 1.3, w: 7.3, h: 2.1,
    fontSize: 52, bold: true, color: WHITE,
    align: "left", fontFace: "Calibri", lineSpacingMultiple: 1.1,
  });
  s.addText("You Run Your Business.", {
    x: 5.6, y: 3.45, w: 7.3, h: 0.8,
    fontSize: 34, bold: false, color: GOLD,
    align: "left", fontFace: "Calibri",
  });

  // Divider line
  s.addShape(pptx.ShapeType.line, {
    x: 5.6, y: 4.45, w: 5.5, h: 0,
    line: { color: PURPLE_LT, width: 1 },
  });

  // Sub tagline
  s.addText("Missed calls → Answered.  Leads → Nurtured.  Ads → Managed.  Business → Scaled.", {
    x: 5.6, y: 4.65, w: 7.3, h: 0.6,
    fontSize: 13, color: GRAY,
    align: "left", fontFace: "Calibri", lineSpacingMultiple: 1.4,
  });

  // Bottom strip
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.9, w: "100%", h: 0.6,
    fill: { color: PURPLE },
    line: { type: "none" },
  });
  s.addText("Confidential  |  2026  |  soulflow.com", {
    x: 0, y: 6.9, w: "100%", h: 0.6,
    fontSize: 10, color: "CCCCEE",
    align: "center", valign: "middle", fontFace: "Calibri",
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The Problem
// ════════════════════════════════════════════════════════════════════════════
(function slide2() {
  const s = pptx.addSlide();
  darkSlide(s);
  accentBar(s);
  sectionLabel(s, "The Problem");

  heading(s, "Home Service Businesses Are Losing\nThousands Every Month — Silently.", { y: 0.55, size: 30, h: 1.1 });
  goldDivider(s, 1.75);

  const stats = [
    { icon: "📞", stat: "62%", label: "of customers won't call back\nif their first call goes unanswered" },
    { icon: "💸", stat: "$30K+", label: "average revenue lost per year\nfrom missed calls alone" },
    { icon: "⏰", stat: "5 min", label: "is the window to respond to a\nnew lead before conversion drops 80%" },
    { icon: "📉", stat: "78%", label: "of jobs go to the first business\nthat responds — not the best one" },
  ];

  stats.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 6.5;
    const y = 2.0 + row * 2.4;
    card(s, x, y, 6.1, 2.1);
    s.addText(item.stat, {
      x: x + 0.2, y: y + 0.15, w: 2.2, h: 0.9,
      fontSize: 40, bold: true, color: GOLD,
      align: "left", fontFace: "Calibri",
    });
    s.addText(item.label, {
      x: x + 2.5, y: y + 0.2, w: 3.4, h: 0.85,
      fontSize: 14, color: GRAY,
      align: "left", valign: "top", fontFace: "Calibri", lineSpacingMultiple: 1.4,
    });
    s.addShape(pptx.ShapeType.line, {
      x: x + 0.2, y: y + 1.15, w: 5.6, h: 0,
      line: { color: PURPLE, width: 0.75 },
    });
    s.addText("The longer you wait, the more revenue walks out the door.", {
      x: x + 0.2, y: y + 1.3, w: 5.6, h: 0.55,
      fontSize: 11, color: PURPLE_LT, italic: true,
      align: "left", fontFace: "Calibri",
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — The Solution
// ════════════════════════════════════════════════════════════════════════════
(function slide3() {
  const s = pptx.addSlide();
  darkSlide(s);
  accentBar(s);
  sectionLabel(s, "The Solution");

  heading(s, "A Done-For-You AI Growth System", { y: 0.55, size: 32 });
  goldDivider(s, 1.55);

  s.addText("Soulflow deploys a seamless 4-step AI workflow so no lead slips through the cracks.", {
    x: 0.5, y: 1.65, w: 12.33, h: 0.5,
    fontSize: 15, color: GRAY, align: "left", fontFace: "Calibri",
  });

  const steps = [
    { num: "01", title: "Capture", desc: "AI receptionist answers every call, texts, and web inquiry 24/7 — never misses a lead." },
    { num: "02", title: "Qualify", desc: "Instantly qualifies prospects, gathers job details, and books appointments automatically." },
    { num: "03", title: "Nurture", desc: "Automated follow-up sequences keep warm leads engaged until they convert." },
    { num: "04", title: "Scale", desc: "Meta ad campaigns + social content drive a continuous stream of high-quality inbound leads." },
  ];

  // Connector line
  s.addShape(pptx.ShapeType.line, {
    x: 1.15, y: 3.45, w: 10.5, h: 0,
    line: { color: PURPLE, width: 1.5, dashType: "dash" },
  });

  steps.forEach((step, i) => {
    const x = 0.3 + i * 3.22;
    const y = 2.3;
    card(s, x, y, 2.95, 4.5, "13123A");

    // Step circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.9, y: y + 0.3, w: 1.15, h: 1.15,
      fill: { color: PURPLE },
      line: { color: GOLD, width: 2 },
    });
    s.addText(step.num, {
      x: x + 0.9, y: y + 0.3, w: 1.15, h: 1.15,
      fontSize: 22, bold: true, color: WHITE,
      align: "center", valign: "middle", fontFace: "Calibri",
    });

    s.addText(step.title, {
      x: x + 0.15, y: y + 1.65, w: 2.65, h: 0.5,
      fontSize: 18, bold: true, color: GOLD,
      align: "center", fontFace: "Calibri",
    });

    s.addShape(pptx.ShapeType.line, {
      x: x + 0.3, y: y + 2.25, w: 2.35, h: 0,
      line: { color: PURPLE_LT, width: 0.75 },
    });

    s.addText(step.desc, {
      x: x + 0.15, y: y + 2.4, w: 2.65, h: 1.9,
      fontSize: 12, color: GRAY,
      align: "center", valign: "top", fontFace: "Calibri", lineSpacingMultiple: 1.4,
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Our Services
// ════════════════════════════════════════════════════════════════════════════
(function slide4() {
  const s = pptx.addSlide();
  darkSlide(s);
  accentBar(s);
  sectionLabel(s, "Our Services");

  heading(s, "Everything Your Business Needs.\nNothing You Have to Manage.", { y: 0.55, size: 30, h: 1.1 });
  goldDivider(s, 1.75);

  const services = [
    {
      title: "AI Receptionist",
      icon: "🤖",
      color: PURPLE,
      bullets: [
        "Answers calls & texts 24/7/365",
        "Human-like voice & chat AI",
        "Instant lead qualification",
        "Auto-appointment booking",
        "CRM integration & follow-up",
      ],
    },
    {
      title: "Workflow Automation",
      icon: "⚙️",
      color: "1A4DA6",
      bullets: [
        "End-to-end pipeline automation",
        "Estimate & invoice triggers",
        "Review request sequences",
        "Job status notifications",
        "No-show re-engagement flows",
      ],
    },
    {
      title: "Meta Ads Management",
      icon: "📣",
      color: "8B1A8B",
      bullets: [
        "Facebook & Instagram campaigns",
        "Hyper-local targeting",
        "Creative design & copywriting",
        "Weekly performance reporting",
        "Continuous A/B optimization",
      ],
    },
    {
      title: "Social Media Management",
      icon: "📱",
      color: "0D6B5E",
      bullets: [
        "4–5 posts per week",
        "On-brand content & Reels",
        "Community engagement",
        "Reputation management",
        "Monthly analytics report",
      ],
    },
  ];

  services.forEach((svc, i) => {
    const x = 0.28 + i * 3.22;
    const y = 1.9;
    card(s, x, y, 3.0, 5.2, "0F0F28");

    // Color header band
    s.addShape(pptx.ShapeType.roundRect, {
      x: x, y: y, w: 3.0, h: 1.0,
      fill: { color: svc.color },
      line: { type: "none" },
      rectRadius: 0.12,
    });
    // Hide bottom rounding of header
    s.addShape(pptx.ShapeType.rect, {
      x: x, y: y + 0.65, w: 3.0, h: 0.35,
      fill: { color: svc.color },
      line: { type: "none" },
    });

    s.addText(svc.title, {
      x: x + 0.15, y: y + 0.2, w: 2.7, h: 0.6,
      fontSize: 15, bold: true, color: WHITE,
      align: "center", fontFace: "Calibri",
    });

    svc.bullets.forEach((b, bi) => {
      s.addText("▸  " + b, {
        x: x + 0.2, y: y + 1.15 + bi * 0.75, w: 2.65, h: 0.65,
        fontSize: 12, color: GRAY,
        align: "left", fontFace: "Calibri",
      });
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Live Demo
// ════════════════════════════════════════════════════════════════════════════
(function slide5() {
  const s = pptx.addSlide();
  darkSlide(s);
  accentBar(s, GOLD);
  sectionLabel(s, "Live Demo");

  heading(s, "See It In Action — Right Now.", { y: 0.55, size: 34 });
  goldDivider(s, 1.55);

  // Center phone card
  card(s, 1.5, 1.7, 10.33, 4.8, "100B2E");

  s.addText("📞", {
    x: 1.5, y: 2.0, w: 10.33, h: 1.0,
    fontSize: 48, align: "center", valign: "middle",
  });

  s.addText("Call Our AI Receptionist Live", {
    x: 1.5, y: 3.1, w: 10.33, h: 0.7,
    fontSize: 26, bold: true, color: WHITE,
    align: "center", fontFace: "Calibri",
  });

  s.addText("(813) 536-6222", {
    x: 1.5, y: 3.85, w: 10.33, h: 0.9,
    fontSize: 48, bold: true, color: GOLD,
    align: "center", fontFace: "Calibri",
  });

  s.addShape(pptx.ShapeType.line, {
    x: 3.5, y: 4.85, w: 6.33, h: 0,
    line: { color: PURPLE_LT, width: 0.75 },
  });

  s.addText("Experience a real AI-powered call — scheduling, qualifying, and follow-up in seconds.\nNo scripts. No menus. Just intelligent conversation.", {
    x: 1.5, y: 4.95, w: 10.33, h: 0.9,
    fontSize: 13, color: GRAY,
    align: "center", fontFace: "Calibri", lineSpacingMultiple: 1.5,
  });

  s.addText("Try it now →  Pull out your phone and dial.", {
    x: 1.5, y: 5.9, w: 10.33, h: 0.45,
    fontSize: 13, bold: true, color: PURPLE_LT, italic: true,
    align: "center", fontFace: "Calibri",
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Pricing
// ════════════════════════════════════════════════════════════════════════════
(function slide6() {
  const s = pptx.addSlide();
  darkSlide(s);
  accentBar(s);
  sectionLabel(s, "Pricing");

  heading(s, "Simple, Transparent Pricing", { y: 0.55, size: 34 });
  goldDivider(s, 1.55);

  s.addText("All plans include full onboarding, setup, and dedicated account management.", {
    x: 0.5, y: 1.65, w: 12.33, h: 0.4,
    fontSize: 14, color: GRAY, align: "left", fontFace: "Calibri",
  });

  const tiers = [
    {
      name: "Starter",
      price: "$1,500",
      period: "/mo",
      highlight: false,
      features: [
        "AI Receptionist (calls + texts)",
        "Basic workflow automation",
        "CRM setup & integration",
        "Monthly performance report",
        "Email support",
      ],
      cta: "Get Started",
    },
    {
      name: "Growth",
      price: "$3,000",
      period: "/mo",
      highlight: true,
      features: [
        "Everything in Starter",
        "Meta Ads management (up to $3K ad spend)",
        "Advanced automation sequences",
        "Social media management (4 posts/wk)",
        "Bi-weekly strategy calls",
      ],
      cta: "Most Popular",
    },
    {
      name: "Elite",
      price: "$5,000",
      period: "/mo",
      highlight: false,
      features: [
        "Everything in Growth",
        "Unlimited ad spend management",
        "Custom AI workflows & integrations",
        "Daily social content + Reels",
        "Priority support + weekly calls",
      ],
      cta: "Full Scale",
    },
  ];

  tiers.forEach((tier, i) => {
    const x = 0.35 + i * 4.32;
    const y = 2.1;
    const w = 4.0;
    const h = 5.1;

    if (tier.highlight) {
      // Glowing border effect
      s.addShape(pptx.ShapeType.roundRect, {
        x: x - 0.08, y: y - 0.08, w: w + 0.16, h: h + 0.16,
        fill: { color: GOLD },
        line: { type: "none" },
        rectRadius: 0.14,
      });
    }

    card(s, x, y, w, h, tier.highlight ? "1A0E40" : "0F0F28");

    // Header
    const headerColor = tier.highlight ? GOLD : PURPLE;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w, h: 0.9,
      fill: { color: headerColor },
      line: { type: "none" },
      rectRadius: 0.12,
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: y + 0.6, w, h: 0.3,
      fill: { color: headerColor },
      line: { type: "none" },
    });

    s.addText(tier.name.toUpperCase(), {
      x, y: y + 0.15, w,
      h: 0.6,
      fontSize: 15, bold: true,
      color: tier.highlight ? BG : WHITE,
      align: "center", fontFace: "Calibri", charSpacing: 3,
    });

    // Price
    s.addText(tier.price, {
      x, y: y + 1.0, w, h: 0.75,
      fontSize: 36, bold: true,
      color: tier.highlight ? GOLD : WHITE,
      align: "center", fontFace: "Calibri",
    });
    s.addText(tier.period, {
      x: x + w * 0.5 + 0.05, y: y + 1.45, w: 1.2, h: 0.4,
      fontSize: 13, color: GRAY,
      align: "left", fontFace: "Calibri",
    });

    s.addShape(pptx.ShapeType.line, {
      x: x + 0.3, y: y + 1.9, w: w - 0.6, h: 0,
      line: { color: PURPLE_LT, width: 0.5 },
    });

    tier.features.forEach((f, fi) => {
      s.addText("✓  " + f, {
        x: x + 0.2, y: y + 2.05 + fi * 0.55, w: w - 0.4, h: 0.5,
        fontSize: 11, color: GRAY,
        align: "left", fontFace: "Calibri",
      });
    });

    // CTA button
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.3, y: y + h - 0.65, w: w - 0.6, h: 0.48,
      fill: { color: tier.highlight ? GOLD : PURPLE },
      line: { type: "none" },
      rectRadius: 0.08,
    });
    s.addText(tier.cta, {
      x: x + 0.3, y: y + h - 0.65, w: w - 0.6, h: 0.48,
      fontSize: 13, bold: true,
      color: tier.highlight ? BG : WHITE,
      align: "center", valign: "middle", fontFace: "Calibri",
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Why Soulflow
// ════════════════════════════════════════════════════════════════════════════
(function slide7() {
  const s = pptx.addSlide();
  darkSlide(s);
  accentBar(s);
  sectionLabel(s, "Why Soulflow");

  heading(s, "Built Different. Built For You.", { y: 0.55, size: 34 });
  goldDivider(s, 1.55);

  const reasons = [
    {
      title: "Industry-Specific AI",
      desc: "Our AI is trained specifically on home service industries — HVAC, plumbing, roofing, landscaping, and more. It speaks your customer's language.",
    },
    {
      title: "Done-For-You, Not DIY",
      desc: "You don't touch a single tool. We handle setup, management, optimization, and reporting — so you stay focused on your craft.",
    },
    {
      title: "Real ROI, Real Fast",
      desc: "Most clients see measurable lead increases within the first 30 days. We track every dollar of ad spend and every call answered.",
    },
    {
      title: "One Team, All Channels",
      desc: "AI calls, automation, paid ads, and social — all under one roof with one point of contact. No agency juggling.",
    },
    {
      title: "Always-On Coverage",
      desc: "Your AI receptionist never sleeps, never calls in sick, never puts a customer on hold. 24/7/365 lead capture, guaranteed.",
    },
    {
      title: "Transparent Reporting",
      desc: "Weekly dashboards and bi-weekly calls keep you fully informed. No black boxes, no guessing — just clear data and results.",
    },
  ];

  reasons.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 4.32;
    const y = 1.85 + row * 2.55;
    card(s, x, y, 4.0, 2.3, "0F0F28");

    // Gold accent dot
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.22, y: y + 0.2, w: 0.3, h: 0.3,
      fill: { color: GOLD },
      line: { type: "none" },
    });

    s.addText(r.title, {
      x: x + 0.65, y: y + 0.12, w: 3.2, h: 0.5,
      fontSize: 15, bold: true, color: WHITE,
      align: "left", fontFace: "Calibri",
    });
    s.addShape(pptx.ShapeType.line, {
      x: x + 0.2, y: y + 0.7, w: 3.65, h: 0,
      line: { color: PURPLE, width: 0.75 },
    });
    s.addText(r.desc, {
      x: x + 0.2, y: y + 0.82, w: 3.65, h: 1.3,
      fontSize: 11.5, color: GRAY,
      align: "left", valign: "top", fontFace: "Calibri", lineSpacingMultiple: 1.4,
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Call to Action
// ════════════════════════════════════════════════════════════════════════════
(function slide8() {
  const s = pptx.addSlide();
  darkSlide(s);

  // Full-bleed purple glow background
  s.addShape(pptx.ShapeType.ellipse, {
    x: 2.5, y: 1.0, w: 8.5, h: 6.0,
    fill: { color: "1A0540" },
    line: { type: "none" },
  });

  accentBar(s, GOLD);

  s.addText("READY TO GROW?", {
    x: 0.5, y: 0.55, w: 12.33, h: 0.5,
    fontSize: 12, bold: true, color: GOLD,
    align: "center", charSpacing: 6, fontFace: "Calibri",
  });

  s.addText("Let's Build Your\nGrowth Machine.", {
    x: 0.5, y: 1.1, w: 12.33, h: 2.0,
    fontSize: 48, bold: true, color: WHITE,
    align: "center", fontFace: "Calibri", lineSpacingMultiple: 1.1,
  });

  s.addText("Stop losing leads. Start scaling revenue.\nSoulflow handles everything — so you never miss a job again.", {
    x: 1.0, y: 3.2, w: 11.33, h: 0.85,
    fontSize: 16, color: GRAY,
    align: "center", fontFace: "Calibri", lineSpacingMultiple: 1.5,
  });

  s.addShape(pptx.ShapeType.line, {
    x: 4.5, y: 4.15, w: 4.33, h: 0,
    line: { color: GOLD, width: 1.5 },
  });

  // CTA buttons row
  const btnY = 4.35;

  // Primary button
  s.addShape(pptx.ShapeType.roundRect, {
    x: 1.8, y: btnY, w: 4.0, h: 0.7,
    fill: { color: GOLD },
    line: { type: "none" },
    rectRadius: 0.1,
  });
  s.addText("Book a Free Strategy Call", {
    x: 1.8, y: btnY, w: 4.0, h: 0.7,
    fontSize: 15, bold: true, color: BG,
    align: "center", valign: "middle", fontFace: "Calibri",
  });

  // Secondary button
  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.53, y: btnY, w: 4.0, h: 0.7,
    fill: { type: "none" },
    line: { color: PURPLE_LT, width: 1.5 },
    rectRadius: 0.1,
  });
  s.addText("Call  (813) 536-6222", {
    x: 7.53, y: btnY, w: 4.0, h: 0.7,
    fontSize: 15, bold: true, color: PURPLE_LT,
    align: "center", valign: "middle", fontFace: "Calibri",
  });

  // Contact details
  s.addText("🌐  soulflowconsulting.netlify.app", {
    x: 0.5, y: 5.35, w: 12.33, h: 0.45,
    fontSize: 16, bold: true, color: GOLD,
    align: "center", fontFace: "Calibri",
    hyperlink: { url: "https://soulflowconsulting.netlify.app" },
  });

  s.addText("📧  hello@soulflow.ai   |   📞  (813) 536-6222", {
    x: 0.5, y: 5.85, w: 12.33, h: 0.4,
    fontSize: 12, color: GRAY,
    align: "center", fontFace: "Calibri",
  });

  s.addShape(pptx.ShapeType.line, {
    x: 3.0, y: 6.4, w: 7.33, h: 0,
    line: { color: PURPLE, width: 0.75 },
  });

  s.addText("© 2026 Soulflow  |  AI-Powered Growth for Home Service Businesses", {
    x: 0.5, y: 6.5, w: 12.33, h: 0.4,
    fontSize: 10, color: "666688",
    align: "center", fontFace: "Calibri",
  });
})();

// ── Write file ───────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: "Soulflow-Pitch-Deck.pptx" })
  .then(() => console.log("✅  Soulflow-Pitch-Deck.pptx generated successfully!"))
  .catch((err) => { console.error("❌  Error:", err); process.exit(1); });
