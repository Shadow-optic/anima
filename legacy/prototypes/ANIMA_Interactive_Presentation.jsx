import {useState} from "react";

const sections = [
  {
    id: "hero",
    title: "ANIMA",
    subtitle: "The Pet Longevity Intelligence Platform",
    tagline: "You're not building a nutrition app. You're building the operating system for pet longevity.",
  },
  {
    id: "problem",
    title: "THE PROBLEM WITH YOUR CURRENT CONCEPT",
    content: [
      {
        heading: "It's a Feature, Not a Platform",
        text: "Right now, you've designed an excellent meal-planning app with smart cart-building and hybrid recipes. That's a strong feature set — but features get copied in 6 months. Chewy, Purina, or Mars could replicate your entire MVP with their existing infrastructure and 100x your marketing budget.",
      },
      {
        heading: "The Market Has Already Moved",
        text: "Nestlé/Purina already launched Petivity microbiome kits. Ollie is building a \"Foodback\" loop with LiDAR body scans. Loyal is developing FDA-tracked longevity drugs. Embark maps 350+ breeds for 200+ genetic health risks. Your current concept competes in a crowded middle — too advanced for casual owners, too shallow for the longevity-obsessed pet parents who actually spend money.",
      },
      {
        heading: "The $140B Insight",
        text: "Americans spend $140 billion annually on pets. 97% consider pets family. 51% say pets are equal to human family members. The emotional and financial willingness is there for something far bigger than a meal planner. The question is: what's the platform that captures that energy?",
      },
    ],
  },
  {
    id: "rebirth",
    title: "THE REBIRTH: ANIMA",
    content: [
      {
        heading: "Latin: \"Soul\" · \"Life Force\" · \"Breath of Life\"",
        text: "ANIMA is not a pet nutrition app. It is the world's first Pet Longevity Intelligence Platform — a biological operating system that ingests every data point about your pet's unique biology, builds a living computational model of their health, and uses that model to extend their life through precision nutrition, predictive health, and preventive care. Think of it as Whoop × Levels × 23andMe — but for the beings you love most.",
      },
    ],
  },
  {
    id: "architecture",
    title: "THE 5-LAYER INTELLIGENCE ARCHITECTURE",
    layers: [
      {
        num: "01",
        name: "THE BIOLOGICAL DIGITAL TWIN",
        desc: "The Foundation That Changes Everything",
        details: [
          "Every pet on ANIMA gets a Biological Digital Twin — a living, learning computational model of their unique biology. Not 15 factors. Not even 50. A continuous, multi-dimensional biological model that evolves with your pet every single day.",
          "Data inputs: DNA/genetic panel, gut microbiome sequencing, blood biomarkers, body composition (LiDAR/photo-based), activity data from wearables, diet history, environmental factors (climate, altitude, household toxins), behavioral patterns, veterinary records, and breed-specific epidemiological data from the Dog Aging Project's 50,000+ pet dataset.",
          "The Digital Twin doesn't just describe your pet. It simulates their biology. It can predict how a dietary change will affect their gut microbiome in 2 weeks, their weight in 2 months, their joint health in 2 years. This is the moat that cannot be copied — because it gets smarter with every user, every data point, every outcome.",
        ],
        color: "#FF6B35",
      },
      {
        num: "02",
        name: "PRECISION NUTRITION ENGINE",
        desc: "Food as Biological Code",
        details: [
          "Your original meal planning concept gets absorbed here — but supercharged. ANIMA doesn't recommend food. It prescribes biological interventions that happen to be delivered through food.",
          "The engine takes inputs from the Digital Twin and generates precision nutrition protocols: targeted anti-inflammatory compounds for a Golden Retriever with 34% elevated hip dysplasia risk. Omega-3 ratios calibrated to a specific dog's metabolomic profile. Prebiotic blends designed to cultivate the exact gut bacterial strains your cat is deficient in.",
          "Your hybrid brand + recipe model becomes the delivery mechanism. Your auto-cart builder becomes the fulfillment layer. But the intelligence behind what goes in that cart is now biological, not algorithmic.",
        ],
        color: "#4ECDC4",
      },
      {
        num: "03",
        name: "THE LONGEVITY SCORE™",
        desc: "The Viral Loop That Sells Itself",
        details: [
          "Every pet on ANIMA gets a single number: their Longevity Score. Think credit score, but for your pet's projected healthspan. Ranges from 0–999. Updated in real-time as new data flows in.",
          "This is the growth engine. Pet parents share their Longevity Score on social media. They compare scores with friends. They obsess over improving it. It creates the same addictive engagement loop as step counts, sleep scores, and credit score trackers — but fueled by something far more emotional: love for your pet.",
          "The score becomes the universal language of pet health. Vets reference it. Insurance companies price against it. Breeders use it to validate their programs. Pet food companies chase it. You own the standard.",
        ],
        color: "#FFE66D",
      },
      {
        num: "04",
        name: "PREDICTIVE DISEASE INTELLIGENCE",
        desc: "The Shift from Reactive to Preventive",
        details: [
          "This is where you disrupt veterinary medicine itself. Using population-level data from hundreds of thousands of Digital Twins, combined with individual biomarkers, ANIMA predicts disease risk 2–5 years before symptoms appear.",
          "\"Your Labrador's microbiome diversity dropped 18% over 3 months — this pattern preceded inflammatory bowel disease in 73% of similar dogs. Here's a nutrition protocol that reversed the trend in 81% of cases.\"",
          "You're not replacing vets. You're giving them superpowers. The vet portal becomes a clinical decision support system. They see the Digital Twin, the Longevity Score, the risk predictions, and the nutrition protocols — and they make better decisions. This makes vets your biggest evangelists, not your competitors.",
        ],
        color: "#95E1D3",
      },
      {
        num: "05",
        name: "THE LONGEVITY MARKETPLACE",
        desc: "The Platform Play That Captures the Ecosystem",
        details: [
          "Once you own the biological intelligence layer, you become the platform through which everything in pet health flows. Custom-formulated functional food blends manufactured on-demand and shipped (your own D2C line, informed by millions of Digital Twins). At-home testing kits (microbiome, blood panels, DNA) sold through the app with results fed back into the Twin.",
          "Longevity-backed pet insurance — ANIMA users with scores above 700 get 30% premium discounts because their pets are demonstrably healthier. Telehealth consultations with veterinary nutritionists, contextualized by the Digital Twin. A clinical trial network where your user base becomes the world's largest distributed pet health study.",
          "This is how you go from $4.66M Year 3 revenue (your current projection) to a $500M+ platform. You're not competing with Chewy. You're competing with the entire $140B pet care industry for share of wallet.",
        ],
        color: "#A8E6CF",
      },
    ],
  },
  {
    id: "names",
    title: "THE NAME: WHY \"ANIMA\"",
    content: [
      {
        heading: "The Case for ANIMA",
        text: "ANIMA (Latin: soul, life force, breath of life) positions the brand as something spiritual and scientific simultaneously. It says: we're nurturing your pet's life force itself. It's one word, globally pronounceable, emotionally resonant, domain-available adjacent, and it works across species — dogs, cats, horses, and beyond. It's the kind of name that can anchor a movement, not just a product.",
      },
      {
        heading: "Positioning Line",
        text: "\"More life. More time. More of them.\"",
      },
      {
        heading: "Alternative Names Considered",
        text: "OUTLIVE — Direct, powerful, echoes the human longevity movement (Peter Attia's book). Positions against death itself. More aggressive, more Silicon Valley. | EVERMORE — Beautiful, emotional, poetic. \"More time with them, evermore.\" Softer, more consumer-friendly. Might skew too feminine for broad market. | EPOCH — A new era in pet health. Scientific, weighty, memorable. Less emotional than ANIMA.",
      },
    ],
  },
  {
    id: "disruption",
    title: "INDUSTRIES YOU NOW DISRUPT",
    items: [
      { industry: "Pet Food ($140B)", how: "Precision-formulated D2C functional foods replace generic kibble. You own the intelligence layer that tells 100M pet parents exactly what to feed.", shift: "$140B" },
      { industry: "Veterinary Care ($35B)", how: "Preventive nutrition protocols reduce vet visits by 30-40%. Vets adopt ANIMA as clinical decision support. You become infrastructure.", shift: "$35B" },
      { industry: "Pet Insurance ($4B → $30B)", how: "Longevity Score-backed insurance creates a new category. Healthier pets = fewer claims = lower premiums = more adoption.", shift: "$30B" },
      { industry: "Pet Diagnostics ($2B)", how: "At-home testing kits (microbiome, blood, DNA) sold through ANIMA replace expensive vet lab work for routine monitoring.", shift: "$2B" },
      { industry: "Pet Supplements ($2.5B)", how: "Custom-formulated supplement blends prescribed by the Digital Twin replace generic supplements. 51% of dog owners already buy supplements.", shift: "$2.5B" },
      { industry: "Longevity Pharma (Emerging)", how: "Partner with companies like Loyal (LOY-002) as the nutrition companion to longevity drugs. Your platform + their pills = the complete longevity stack.", shift: "∞" },
    ],
  },
  {
    id: "moat",
    title: "THE UNASSAILABLE MOAT",
    content: [
      {
        heading: "Biological Data Network Effect",
        text: "Every new pet that joins ANIMA makes every other pet's predictions more accurate. 10,000 Labrador Digital Twins produce better predictions than 100. At 1 million pets, your dataset becomes the most valuable asset in animal health science. At 10 million, you're essentially running the world's largest continuous pet health study. No competitor can buy this. They have to build it pet by pet, day by day.",
      },
      {
        heading: "The Longevity Score Standard",
        text: "If you move fast enough, the Longevity Score becomes the industry standard — the way FICO became synonymous with creditworthiness. Once vets reference it, insurers price on it, and consumers demand it, you own the lingua franca of pet health. Switching costs become infinite.",
      },
      {
        heading: "Multi-Sided Platform Lock-In",
        text: "Pet parents depend on the Digital Twin (years of biological data). Vets depend on the clinical decision support. Insurers depend on the Longevity Score. Food brands depend on the marketplace. Testing companies depend on the distribution. Everyone is locked in because everyone else is locked in.",
      },
    ],
  },
  {
    id: "roadmap",
    title: "REVISED GO-TO-MARKET",
    phases: [
      {
        phase: "PHASE 1: TROJAN HORSE",
        time: "Months 0–6",
        desc: "Launch the nutrition app (your current MVP) but frame it as \"ANIMA — Pet Longevity starts with what they eat.\" The meal planner, auto-cart, and hybrid recipes are your acquisition wedge. Free Longevity Score (basic version) based on breed, age, weight, diet — drives virality. Collect behavioral and dietary data on every user from day one.",
        revenue: "$0–$300K ARR",
      },
      {
        phase: "PHASE 2: BIOLOGICAL UNLOCK",
        time: "Months 6–18",
        desc: "Launch ANIMA Testing Kits (microbiome first, then blood panels). Partner with AnimalBiome or similar for lab processing. Every test result feeds the Digital Twin and dramatically improves the Longevity Score accuracy. Premium tier ($19.99/mo) unlocks the full Digital Twin with predictive health intelligence.",
        revenue: "$300K–$3M ARR",
      },
      {
        phase: "PHASE 3: PLATFORM IGNITION",
        time: "Months 18–36",
        desc: "Launch vet portal as clinical decision support tool. Launch custom-formulated functional food blends (D2C). Pilot Longevity Score-backed insurance with 1–2 insurers. Open the marketplace to third-party testing and supplement providers. Begin publishing peer-reviewed research from your dataset.",
        revenue: "$3M–$25M ARR",
      },
      {
        phase: "PHASE 4: CATEGORY OWNERSHIP",
        time: "Months 36–60",
        desc: "Become the standard of record for pet biological intelligence. License the Longevity Score to insurers, breeders, and shelters. Expand to horses, exotic pets, and eventually livestock. Partner with longevity pharma companies (Loyal, etc.) as the nutrition companion platform. IPO or strategic acquisition at $500M–$2B valuation.",
        revenue: "$25M–$100M+ ARR",
      },
    ],
  },
  {
    id: "financials",
    title: "REVISED FINANCIAL MODEL",
    comparison: {
      old: { label: "Original Plan (Year 3)", revenue: "$4.66M", users: "500K", paying: "35K", arpu: "$11/mo" },
      new: { label: "ANIMA Vision (Year 3)", revenue: "$25M–$50M", users: "2M+", paying: "150K+", arpu: "$28/mo" },
    },
    streams: [
      { name: "Subscriptions (Digital Twin + Premium)", pct: "35%", note: "$9.99–$29.99/mo tiers" },
      { name: "Testing Kits & Diagnostics", pct: "25%", note: "$79–$199 per kit, recurring 2x/year" },
      { name: "Custom Functional Foods (D2C)", pct: "20%", note: "60%+ gross margin on formulated blends" },
      { name: "Marketplace & Affiliates", pct: "10%", note: "Platform take rate 15–25%" },
      { name: "Data Licensing & Insurance", pct: "5%", note: "B2B — high margin, recurring" },
      { name: "Vet SaaS & Clinical Tools", pct: "5%", note: "$99–$299/mo per practice" },
    ],
  },
  {
    id: "closing",
    title: "THE BOTTOM LINE",
    content: [
      {
        heading: "",
        text: "Your original concept is a solid $5M business. ANIMA is a $1B+ platform. The difference isn't in the features — it's in the framing. You're not selling meal plans. You're selling more years with the being your customer loves most on this planet. That's not a subscription. That's a covenant. Build accordingly.",
      },
    ],
  },
];

const ChevronDown = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 7.5L10 12.5L15 7.5" />
  </svg>
);

const ChevronUp = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 12.5L10 7.5L5 12.5" />
  </svg>
);

const DNAIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 15C2 15 4 13 6 13C8 13 10 15 12 15C14 15 16 13 18 13C20 13 22 15 22 15" />
    <path d="M2 9C2 9 4 7 6 7C8 7 10 9 12 9C14 9 16 7 18 7C20 7 22 9 22 9" />
    <line x1="7" y1="7" x2="7" y2="13" opacity="0.4" />
    <line x1="12" y1="9" x2="12" y2="15" opacity="0.4" />
    <line x1="17" y1="7" x2="17" y2="13" opacity="0.4" />
  </svg>
);

export default function AnimaVision() {
  const [expandedLayers, setExpandedLayers] = useState({});
  const [activeNav, setActiveNav] = useState("hero");

  const toggleLayer = (num) => {
    setExpandedLayers((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const scrollTo = (id) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      background: "#0A0A0B",
      color: "#E8E4DE",
      minHeight: "100vh",
      overflowX: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Floating Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(10,10,11,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 24px", display: "flex", gap: "8px",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => scrollTo(s.id)} style={{
            background: activeNav === s.id ? "rgba(255,107,53,0.15)" : "transparent",
            border: activeNav === s.id ? "1px solid rgba(255,107,53,0.3)" : "1px solid transparent",
            color: activeNav === s.id ? "#FF6B35" : "#666",
            padding: "6px 14px", borderRadius: "20px", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 500,
            letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
            transition: "all 0.3s ease",
          }}>
            {s.id === "hero" ? "ANIMA" : s.title?.split(":")[0]?.slice(0, 18)}
          </button>
        ))}
      </nav>

      {/* HERO */}
      <section id="hero" style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center",
        padding: "120px 24px 80px", position: "relative",
        background: "radial-gradient(ellipse at 50% 30%, rgba(255,107,53,0.08) 0%, transparent 60%)",
      }}>
        <div style={{ marginBottom: "32px", opacity: 0.4 }}><DNAIcon /></div>
        <h1 style={{
          fontSize: "clamp(64px, 12vw, 140px)", fontWeight: 300,
          letterSpacing: "-0.03em", lineHeight: 0.9, margin: 0,
          background: "linear-gradient(135deg, #FF6B35, #FFE66D, #FF6B35)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          ANIMA
        </h1>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(11px, 1.5vw, 14px)",
          letterSpacing: "0.3em", textTransform: "uppercase", color: "#666",
          marginTop: "24px", fontWeight: 300,
        }}>
          The Pet Longevity Intelligence Platform
        </p>
        <div style={{
          width: "1px", height: "80px",
          background: "linear-gradient(to bottom, rgba(255,107,53,0.4), transparent)",
          margin: "48px auto 32px",
        }} />
        <p style={{
          fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 300,
          maxWidth: "700px", lineHeight: 1.6, color: "#999",
          fontStyle: "italic",
        }}>
          You're not building a nutrition app.<br />
          You're building the operating system for pet longevity.
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
          color: "#555", marginTop: "48px", letterSpacing: "0.1em",
        }}>
          STRATEGIC VISION DOCUMENT — CONFIDENTIAL
        </p>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problem" style={{ padding: "100px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <SectionHeader title={sections[1].title} />
        {sections[1].content.map((item, i) => (
          <div key={i} style={{ marginBottom: "48px" }}>
            <h3 style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
              fontWeight: 600, color: "#FF6B35", letterSpacing: "0.05em",
              textTransform: "uppercase", marginBottom: "16px",
            }}>{item.heading}</h3>
            <p style={{ fontSize: "18px", lineHeight: 1.8, color: "#AAA", fontWeight: 300 }}>
              {item.text}
            </p>
          </div>
        ))}
      </section>

      {/* REBIRTH */}
      <section id="rebirth" style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, rgba(255,107,53,0.04) 0%, transparent 100%)",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <SectionHeader title={sections[2].title} center />
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
            color: "#FF6B35", letterSpacing: "0.2em", marginBottom: "40px",
          }}>
            LATIN: "SOUL" · "LIFE FORCE" · "BREATH OF LIFE"
          </p>
          <p style={{
            fontSize: "clamp(18px, 2.5vw, 22px)", lineHeight: 1.9,
            color: "#BBB", fontWeight: 300,
          }}>
            {sections[2].content[0].text}
          </p>
        </div>
      </section>

      {/* 5-LAYER ARCHITECTURE */}
      <section id="architecture" style={{ padding: "100px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <SectionHeader title={sections[3].title} />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "48px" }}>
          {sections[3].layers.map((layer) => (
            <div key={layer.num} style={{
              border: `1px solid ${expandedLayers[layer.num] ? layer.color + "44" : "rgba(255,255,255,0.06)"}`,
              borderRadius: "12px",
              background: expandedLayers[layer.num] ? `${layer.color}08` : "rgba(255,255,255,0.02)",
              transition: "all 0.4s ease",
              overflow: "hidden",
            }}>
              <button onClick={() => toggleLayer(layer.num)} style={{
                width: "100%", padding: "24px 28px",
                display: "flex", alignItems: "center", gap: "20px",
                background: "none", border: "none", cursor: "pointer",
                color: "#E8E4DE", textAlign: "left",
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "13px",
                  color: layer.color, fontWeight: 500, opacity: 0.7,
                  minWidth: "28px",
                }}>{layer.num}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "16px",
                    fontWeight: 600, letterSpacing: "0.02em",
                  }}>{layer.name}</div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                    color: "#777", marginTop: "4px",
                  }}>{layer.desc}</div>
                </div>
                <span style={{ color: "#555" }}>
                  {expandedLayers[layer.num] ? <ChevronUp /> : <ChevronDown />}
                </span>
              </button>
              {expandedLayers[layer.num] && (
                <div style={{
                  padding: "0 28px 28px 76px",
                  display: "flex", flexDirection: "column", gap: "16px",
                }}>
                  {layer.details.map((d, i) => (
                    <p key={i} style={{
                      fontSize: "15px", lineHeight: 1.8, color: "#999",
                      fontWeight: 300, margin: 0,
                    }}>{d}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* NAME SECTION */}
      <section id="names" style={{
        padding: "100px 24px",
        background: "linear-gradient(180deg, transparent 0%, rgba(255,107,53,0.03) 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <SectionHeader title={sections[4].title} />
          {sections[4].content.map((item, i) => (
            <div key={i} style={{ marginBottom: "40px" }}>
              {item.heading && <h3 style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
                fontWeight: 600, color: "#FFE66D", letterSpacing: "0.03em",
                marginBottom: "14px",
              }}>{item.heading}</h3>}
              <p style={{ fontSize: "17px", lineHeight: 1.8, color: "#AAA", fontWeight: 300 }}>
                {item.text}
              </p>
            </div>
          ))}
          <div style={{
            marginTop: "48px", padding: "40px",
            background: "rgba(255,107,53,0.06)",
            border: "1px solid rgba(255,107,53,0.15)",
            borderRadius: "16px", textAlign: "center",
          }}>
            <p style={{
              fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300,
              fontStyle: "italic", margin: 0,
              background: "linear-gradient(135deg, #FFE66D, #FF6B35)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              "More life. More time. More of them."
            </p>
          </div>
        </div>
      </section>

      {/* DISRUPTION MAP */}
      <section id="disruption" style={{ padding: "100px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <SectionHeader title={sections[5].title} />
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px", marginTop: "48px",
        }}>
          {sections[5].items.map((item, i) => (
            <div key={i} style={{
              padding: "28px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
                color: "#FF6B35", fontWeight: 500, marginBottom: "8px",
              }}>{item.shift}</div>
              <h4 style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
                fontWeight: 600, margin: "0 0 12px",
              }}>{item.industry}</h4>
              <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#888", fontWeight: 300, margin: 0 }}>
                {item.how}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MOAT */}
      <section id="moat" style={{
        padding: "100px 24px",
        background: "linear-gradient(180deg, transparent 0%, rgba(78,205,196,0.04) 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <SectionHeader title={sections[6].title} />
          {sections[6].content.map((item, i) => (
            <div key={i} style={{
              marginBottom: "40px", paddingLeft: "24px",
              borderLeft: "2px solid rgba(78,205,196,0.3)",
            }}>
              <h3 style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "16px",
                fontWeight: 600, color: "#4ECDC4", marginBottom: "12px",
              }}>{item.heading}</h3>
              <p style={{ fontSize: "16px", lineHeight: 1.8, color: "#999", fontWeight: 300 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" style={{ padding: "100px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <SectionHeader title={sections[7].title} />
        <div style={{ marginTop: "48px", position: "relative" }}>
          <div style={{
            position: "absolute", left: "19px", top: "0", bottom: "0",
            width: "2px", background: "linear-gradient(to bottom, #FF6B35, #4ECDC4, #FFE66D, #95E1D3)",
            opacity: 0.3,
          }} />
          {sections[7].phases.map((p, i) => (
            <div key={i} style={{
              display: "flex", gap: "32px", marginBottom: "48px",
              position: "relative", paddingLeft: "48px",
            }}>
              <div style={{
                position: "absolute", left: "12px", top: "6px",
                width: "16px", height: "16px", borderRadius: "50%",
                background: ["#FF6B35", "#4ECDC4", "#FFE66D", "#95E1D3"][i],
                boxShadow: `0 0 20px ${["#FF6B35", "#4ECDC4", "#FFE66D", "#95E1D3"][i]}44`,
              }} />
              <div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                  color: ["#FF6B35", "#4ECDC4", "#FFE66D", "#95E1D3"][i],
                  letterSpacing: "0.15em", marginBottom: "4px",
                }}>{p.time}</div>
                <h3 style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: "18px",
                  fontWeight: 600, margin: "0 0 12px",
                }}>{p.phase}</h3>
                <p style={{ fontSize: "15px", lineHeight: 1.8, color: "#999", fontWeight: 300, margin: "0 0 12px" }}>
                  {p.desc}
                </p>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
                  color: "#666", padding: "4px 10px",
                  background: "rgba(255,255,255,0.04)", borderRadius: "4px",
                }}>{p.revenue}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINANCIALS */}
      <section id="financials" style={{ padding: "100px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <SectionHeader title={sections[8].title} />

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "16px", marginTop: "48px", marginBottom: "48px",
        }}>
          {[sections[8].comparison.old, sections[8].comparison.new].map((c, i) => (
            <div key={i} style={{
              padding: "32px", borderRadius: "12px",
              background: i === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,107,53,0.06)",
              border: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,107,53,0.2)",
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                color: i === 0 ? "#666" : "#FF6B35",
                letterSpacing: "0.15em", marginBottom: "20px",
              }}>{c.label}</div>
              <div style={{
                fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 300,
                marginBottom: "16px",
                color: i === 0 ? "#666" : "#E8E4DE",
              }}>{c.revenue}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[["Users", c.users], ["Paying", c.paying], ["ARPU", c.arpu]].map(([k, v]) => (
                  <div key={k} style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                    color: i === 0 ? "#555" : "#999",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <span>{k}</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h3 style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
          fontWeight: 600, color: "#777", letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: "20px",
        }}>Revenue Streams</h3>
        {sections[8].streams.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "16px",
            padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "14px",
              color: "#FF6B35", minWidth: "40px", fontWeight: 500,
            }}>{s.pct}</span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
              fontWeight: 500, flex: 1,
            }}>{s.name}</span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
              color: "#666",
            }}>{s.note}</span>
          </div>
        ))}
      </section>

      {/* CLOSING */}
      <section id="closing" style={{
        padding: "120px 24px 160px", textAlign: "center",
        background: "radial-gradient(ellipse at 50% 80%, rgba(255,107,53,0.06) 0%, transparent 60%)",
      }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{
            width: "1px", height: "60px",
            background: "linear-gradient(to bottom, transparent, rgba(255,107,53,0.4))",
            margin: "0 auto 48px",
          }} />
          <p style={{
            fontSize: "clamp(18px, 2.5vw, 24px)", lineHeight: 1.9,
            fontWeight: 300, color: "#BBB",
          }}>
            Your original concept is a solid <span style={{ color: "#666" }}>$5M business</span>. ANIMA is a{" "}
            <span style={{
              background: "linear-gradient(135deg, #FF6B35, #FFE66D)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontWeight: 500,
            }}>$1B+ platform</span>.
          </p>
          <p style={{
            fontSize: "clamp(18px, 2.5vw, 24px)", lineHeight: 1.9,
            fontWeight: 300, color: "#999", marginTop: "24px",
          }}>
            The difference isn't in the features — it's in the framing. You're not selling meal plans. You're selling <em>more years</em> with the being your customer loves most on this planet.
          </p>
          <p style={{
            fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 400,
            color: "#E8E4DE", marginTop: "48px", fontStyle: "italic",
          }}>
            That's not a subscription. That's a covenant.
          </p>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "13px",
            color: "#FF6B35", letterSpacing: "0.2em", marginTop: "48px",
          }}>
            BUILD ACCORDINGLY.
          </p>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, center }) {
  return (
    <div style={{ marginBottom: "40px", textAlign: center ? "center" : "left" }}>
      <h2 style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
        fontWeight: 600, letterSpacing: "0.2em", color: "#555",
        textTransform: "uppercase", margin: "0 0 16px",
      }}>{title}</h2>
      <div style={{
        width: center ? "40px" : "40px", height: "2px",
        background: "linear-gradient(to right, #FF6B35, transparent)",
        margin: center ? "0 auto" : "0",
      }} />
    </div>
  );
}
